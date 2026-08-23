'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Check, HelpCircle, Loader2, MapPin, Users, X } from 'lucide-react';
import { track } from '@ui/analytics';
import { useAuth } from '@web/lib/auth';
import { getEvent, setRsvp } from '@web/lib/api';
import { numberToRsvp, RSVP_TO_NUMBER, type EventDetail, type RsvpStatus } from '@web/lib/types';
import { isPast } from '@web/lib/format';
import DownloadAppButton from './DownloadAppButton';

type Choice = Exclude<RsvpStatus, 'pending'>;

// The exact colours the app's RSVP picker uses, so a guest sees the same three
// states on the web and in the app.
const CHOICES: { key: Choice; label: string; color: string; icon: React.ReactNode }[] = [
  { key: 'going', label: "I'm in", color: '#34D399', icon: <Check className="h-5 w-5" /> },
  { key: 'maybe', label: 'Maybe', color: '#F59E0B', icon: <HelpCircle className="h-5 w-5" /> },
  { key: 'not_going', label: "Can't make it", color: '#EF4444', icon: <X className="h-5 w-5" /> },
];

const CONFIRMATION: Record<Choice, string> = {
  going: "You're going. See you there!",
  maybe: 'Marked as maybe — you can change this any time.',
  not_going: "You've let the host know you can't make it.",
};

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-6 sm:p-7">{children}</section>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <Panel>
      <p className="flex items-center justify-center gap-2 py-4 text-sm text-ink-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        {label}
      </p>
    </Panel>
  );
}

export default function EventClient({ id }: { id: string }) {
  const { ready, user, userId, getToken, configured, signOut } = useAuth();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusNum, setStatusNum] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState<Choice | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!ready) return;
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const detail = await getEvent(id, getToken);
        if (!active) return;
        setEvent(detail);
        setStatusNum(detail.members_list?.find((m) => m.userId === userId)?.status);
      } catch (e) {
        if (active) setError((e as Error)?.message || 'We could not load this invite.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [ready, user, userId, id, getToken]);

  const members = useMemo(() => event?.members_list ?? [], [event]);
  const isGuest = !!userId && members.some((m) => m.userId === userId);
  const goingCount = members.filter((m) => m.status === 1).length;
  const maybeCount = members.filter((m) => m.status === 0).length;
  const myStatus = numberToRsvp(statusNum);
  const ended = isPast(event?.endDate, event?.startDate);

  const handleRsvp = useCallback(
    async (next: Choice) => {
      if (!userId || saving) return;
      const previous = statusNum;
      setSaving(next);
      setError(null);
      setStatusNum(RSVP_TO_NUMBER[next]); // optimistic, mirroring the app
      try {
        await setRsvp(id, userId, RSVP_TO_NUMBER[next], getToken);
        track('web_rsvp_submitted', { eventId: id, response: next });
      } catch (e) {
        setStatusNum(previous);
        setError((e as Error)?.message || 'Could not save your RSVP. Please try again.');
      } finally {
        setSaving(null);
      }
    },
    [getToken, id, saving, statusNum, userId],
  );

  if (!configured) {
    return (
      <Panel>
        <h2 className="font-display text-xl font-bold text-ink">RSVP is unavailable</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Phone sign-in isn&apos;t set up on this site yet. Ask the host to share the invite again,
          or get the app.
        </p>
        <div className="mt-5">
          <DownloadAppButton />
        </div>
      </Panel>
    );
  }

  if (!ready) return <Loading label="Loading…" />;

  // Signed out: the only job of this panel is to get a phone number verified.
  if (!user) {
    return (
      <Panel>
        <h2 className="font-display text-xl font-bold text-ink">Are you coming?</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Verify your phone number to reply to this invite. It takes a few seconds, and there is no
          app to install.
        </p>
        <Link
          href={`/onboarding?next=${encodeURIComponent(`/e/${id}`)}`}
          onClick={() => track('web_rsvp_signin_started', { eventId: id })}
          className="gradient-brand mt-5 inline-flex min-h-[52px] w-full items-center justify-center rounded-full px-7 text-base font-semibold text-white shadow-[0_10px_30px_-12px_rgba(142,84,233,0.85)] transition-transform duration-200 ease-spring hover:-translate-y-px active:scale-[0.97]"
        >
          Continue with phone
        </Link>
        <p className="mt-3 text-xs text-ink-faint">
          Only invited guests can reply. Your number is used to match you to this invite — nothing
          else.
        </p>
      </Panel>
    );
  }

  if (loading) return <Loading label="Loading your invite…" />;

  if (error && !event) {
    return (
      <Panel>
        <h2 className="font-display text-xl font-bold text-ink">
          We couldn&apos;t open this invite
        </h2>
        <p className="mt-2 text-sm text-ink-muted">{error}</p>
      </Panel>
    );
  }

  if (!isGuest) {
    return (
      <Panel>
        <h2 className="font-display text-xl font-bold text-ink">
          You&apos;re not on the guest list
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Only guests the host invited can reply. If your invite went to a different number, sign in
          with that one.
        </p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-full border border-line bg-surface-2 px-5 text-[0.95rem] font-semibold text-ink transition-transform duration-200 ease-spring hover:-translate-y-px active:scale-[0.97]"
        >
          Use a different number
        </button>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">
              {ended ? 'This event has ended' : 'Are you coming?'}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {ended
                ? 'You can still see how you replied.'
                : 'Your answer reaches the host straight away.'}
            </p>
          </div>
          {saving ? (
            <Loader2
              className="mt-1 h-4 w-4 shrink-0 animate-spin text-ink-faint"
              aria-hidden="true"
            />
          ) : null}
        </div>

        <div
          role="radiogroup"
          aria-label="Your RSVP"
          className="mt-5 grid grid-cols-3 gap-2 sm:gap-3"
        >
          {CHOICES.map((choice) => {
            const active = myStatus === choice.key;
            return (
              <button
                key={choice.key}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={!!saving || ended}
                onClick={() => void handleRsvp(choice.key)}
                className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-lg border-2 px-2 py-4 text-center text-sm font-semibold transition-transform duration-200 ease-spring hover:-translate-y-px active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60"
                style={{
                  borderColor: active ? choice.color : 'var(--line)',
                  background: active ? `${choice.color}1F` : 'transparent',
                  color: active ? choice.color : 'var(--ink-muted)',
                }}
              >
                <span aria-hidden="true">{choice.icon}</span>
                {choice.label}
              </button>
            );
          })}
        </div>

        <p aria-live="polite" className="mt-4 text-sm text-ink-muted">
          {myStatus === 'pending'
            ? 'Pick an option to let the host know.'
            : CONFIRMATION[myStatus as Choice]}
        </p>

        {error ? (
          <p role="alert" className="mt-3 text-sm text-vibes">
            {error}
          </p>
        ) : null}
      </Panel>

      <Panel>
        <h2 className="font-display text-lg font-bold text-ink">The plan</h2>
        <dl className="mt-4 space-y-3 text-sm">
          {event?.locationName ? (
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
              <dd className="text-ink-muted">{event.locationName}</dd>
            </div>
          ) : null}
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
            <dd className="text-ink-muted">
              {goingCount} going
              {maybeCount ? ` · ${maybeCount} maybe` : ''} · {members.length} invited
            </dd>
          </div>
          {event?.description ? (
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
              <dd className="whitespace-pre-wrap text-ink-muted">{event.description}</dd>
            </div>
          ) : null}
        </dl>
      </Panel>
    </div>
  );
}
