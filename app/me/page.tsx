'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, ChevronRight, MapPin } from 'lucide-react';
import { useAuth } from '@web/lib/auth';
import { useMe } from '@web/lib/useMe';
import { eventTypeLabel, formatEventWhen } from '@web/lib/format';
import AppHeader from '@web/components/AppHeader';
import DownloadAppButton from '@web/components/DownloadAppButton';

const RSVP_LABEL: Record<number, { text: string; color: string }> = {
  1: { text: "You're in", color: '#34D399' },
  0: { text: 'Maybe', color: '#F59E0B' },
  [-1]: { text: "Can't make it", color: '#EF4444' },
};

/**
 * The guest's list of invites. It is an index over the RSVP flow — everything
 * else about an event (posts, photos, expenses) lives in the app.
 */
export default function MePage() {
  const router = useRouter();
  const { ready, user, configured } = useAuth();
  const { muo, name, loading } = useMe();

  useEffect(() => {
    if (ready && configured && !user) router.replace('/onboarding?next=/me');
  }, [ready, configured, user, router]);

  const events = muo?.events ?? [];

  return (
    <div className="min-h-screen bg-[color:var(--bg)]">
      <AppHeader />
      <main id="content" className="container-page max-w-2xl space-y-5 py-10">
        {!configured ? (
          <section className="rounded-xl border border-line bg-surface p-6 sm:p-7">
            <h1 className="font-display text-2xl font-bold text-ink">Get the Lessgo app</h1>
            <p className="mt-2 text-sm text-ink-muted">
              Phone sign-in isn&apos;t set up on this site yet.
            </p>
            <DownloadAppButton className="mt-5" />
          </section>
        ) : !user ? (
          <p className="text-sm text-ink-muted">Redirecting to sign in…</p>
        ) : (
          <>
            <div>
              <h1 className="font-display text-3xl font-bold text-ink">
                {name ? `Hi, ${name}` : 'Your invites'}
              </h1>
              <p className="mt-1 text-ink-muted">Reply to the plans you&apos;ve been invited to.</p>
            </div>

            {loading && !muo ? (
              <p className="text-sm text-ink-muted">Loading…</p>
            ) : events.length === 0 ? (
              <section className="rounded-xl border border-line bg-surface p-6 sm:p-7">
                <h2 className="font-display text-lg font-bold text-ink">No invites yet</h2>
                <p className="mt-2 text-sm text-ink-muted">
                  When a friend invites you to a plan, it shows up here. Creating your own plans
                  happens in the app.
                </p>
                <DownloadAppButton className="mt-5" />
              </section>
            ) : (
              <ul className="space-y-3">
                {events.map((ev) => {
                  const badge = ev.status === undefined ? undefined : RSVP_LABEL[ev.status];
                  return (
                    <li key={ev.event_id}>
                      <Link
                        href={`/e/${ev.event_id}`}
                        className="flex items-center gap-4 rounded-xl border border-line bg-surface p-4 transition-transform duration-200 ease-spring hover:-translate-y-px hover:border-line-strong"
                      >
                        {ev.dp_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={ev.dp_url}
                            alt=""
                            className="h-16 w-16 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="gradient-brand h-16 w-16 shrink-0 rounded-lg opacity-70" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-ink">
                            {ev.eventName || eventTypeLabel(ev.eventType)}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-ink-muted">
                            <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            {formatEventWhen(ev.startDate, ev.endDate) ||
                              eventTypeLabel(ev.eventType)}
                          </p>
                          {ev.locationName ? (
                            <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-ink-faint">
                              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                              {ev.locationName}
                            </p>
                          ) : null}
                          {badge ? (
                            <span
                              className="mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
                              style={{ background: `${badge.color}1F`, color: badge.color }}
                            >
                              {badge.text}
                            </span>
                          ) : (
                            <span className="mt-2 inline-block rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
                              Tap to reply
                            </span>
                          )}
                        </div>
                        <ChevronRight
                          className="h-5 w-5 shrink-0 text-ink-faint"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}
