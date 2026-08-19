'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Check,
  Download,
  FileText,
  HelpCircle,
  Loader2,
  MapPin,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@web/lib/auth';
import { getDocuments, getEvent, getGallery, setRsvp } from '@web/lib/api';
import {
  numberToRsvp,
  RSVP_TO_NUMBER,
  type DocItem,
  type EventDetail,
  type GalleryItem,
  type RsvpStatus,
} from '@web/lib/types';
import { eventTypeLabel, formatEventWhen, isPast } from '@web/lib/format';
import DownloadAppButton from './DownloadAppButton';

const RSVP_OPTIONS: {
  key: Exclude<RsvpStatus, 'pending'>;
  label: string;
  color: string;
  icon: React.ReactNode;
}[] = [
  { key: 'going', label: 'Going', color: '#10b981', icon: <Check className="h-4 w-4" /> },
  { key: 'maybe', label: 'Maybe', color: '#f59e0b', icon: <HelpCircle className="h-4 w-4" /> },
  { key: 'not_going', label: 'Not going', color: '#ef4444', icon: <X className="h-4 w-4" /> },
];

function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-secondary">
      <Loader2 className="h-5 w-5 animate-spin" />
      {label ? <span className="text-sm">{label}</span> : null}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="luma-card space-y-4">{children}</div>;
}

export default function EventClient({ id }: { id: string }) {
  const { ready, user, userId, getToken, configured } = useAuth();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusNum, setStatusNum] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!ready) return;
      if (!user) {
        setLoading(false);
        return;
      }
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const ev = await getEvent(id, token);
        if (!active) return;
        setEvent(ev);
        setStatusNum(ev.members_list?.find((m) => m.userId === userId)?.status);
        const [g, d] = await Promise.allSettled([
          getGallery(id, token),
          getDocuments(id, token),
        ]);
        if (!active) return;
        if (g.status === 'fulfilled') setGallery(g.value);
        if (d.status === 'fulfilled') setDocs(d.value);
      } catch (e) {
        if (active) setError((e as Error)?.message || 'Could not load this event.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [ready, user, userId, id, getToken]);

  const members = event?.members_list ?? [];
  const isMember = useMemo(
    () => !!userId && members.some((m) => m.userId === userId),
    [members, userId],
  );
  const goingCount = members.filter((m) => m.status === 1).length;
  const maybeCount = members.filter((m) => m.status === 0).length;
  const myStatus = numberToRsvp(statusNum);
  const ended = isPast(event?.endDate, event?.startDate);

  const handleRsvp = useCallback(
    async (next: Exclude<RsvpStatus, 'pending'>) => {
      if (!userId) return;
      const token = await getToken();
      if (!token) {
        setError('Your session expired. Please sign in again.');
        return;
      }
      const previous = statusNum;
      setSaving(true);
      setError(null);
      setStatusNum(RSVP_TO_NUMBER[next]);
      try {
        await setRsvp(id, userId, RSVP_TO_NUMBER[next], token);
      } catch (e) {
        setStatusNum(previous);
        setError((e as Error)?.message || 'Could not update your RSVP.');
      } finally {
        setSaving(false);
      }
    },
    [getToken, id, statusNum, userId],
  );

  // --- Sign-in required states ---
  if (!configured) {
    return (
      <Card>
        <h2 className="text-lg font-semibold text-primary">Sign-in unavailable</h2>
        <p className="text-secondary text-sm">
          Get the Lessgo app to RSVP and view this event.
        </p>
        <DownloadAppButton subtitle="RSVP in the app" />
      </Card>
    );
  }

  if (!ready) return <Card><Spinner label="Loading…" /></Card>;

  if (!user) {
    const next = encodeURIComponent(`/e/${id}`);
    return (
      <Card>
        <h2 className="text-lg font-semibold text-primary">RSVP &amp; see full details</h2>
        <p className="text-secondary text-sm">
          Sign in with your phone number to RSVP, view the guest count and download shared photos
          &amp; documents. No app install required.
        </p>
        <Link href={`/onboarding?next=${next}`} className="luma-button luma-button-primary">
          Continue with phone
        </Link>
        <div className="pt-2">
          <p className="text-xs text-muted mb-2">Prefer the full experience?</p>
          <DownloadAppButton subtitle="Get the app" />
        </div>
      </Card>
    );
  }

  if (loading) return <Card><Spinner label="Loading event…" /></Card>;

  if (error && !event) {
    return (
      <Card>
        <p className="text-sm" style={{ color: 'var(--error)' }}>
          {error}
        </p>
        <DownloadAppButton subtitle="Open in the app" />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* RSVP */}
      <Card>
        {isMember ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-primary">Your RSVP</h2>
              {saving ? <Loader2 className="h-4 w-4 animate-spin text-secondary" /> : null}
            </div>
            {ended ? (
              <p className="text-xs text-muted">This event has ended.</p>
            ) : null}
            <div className="grid grid-cols-3 gap-2">
              {RSVP_OPTIONS.map((opt) => {
                const active = myStatus === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => void handleRsvp(opt.key)}
                    disabled={saving}
                    className="flex flex-col items-center justify-center gap-1 rounded-xl border py-3 text-sm font-medium transition"
                    style={{
                      borderColor: active ? opt.color : 'var(--border-light)',
                      background: active ? `${opt.color}1F` : 'transparent',
                      color: active ? opt.color : 'var(--text-secondary)',
                    }}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-primary">You’re not on the guest list</h2>
            <p className="text-secondary text-sm">
              Only invited guests can RSVP to this event. Get the app to join and see more.
            </p>
            <DownloadAppButton subtitle="Join in the app" />
          </>
        )}
        {error ? (
          <p className="text-sm" style={{ color: 'var(--error)' }}>
            {error}
          </p>
        ) : null}
      </Card>

      {/* Details */}
      <Card>
        <h2 className="text-lg font-semibold text-primary">Details</h2>
        <div className="space-y-3 text-sm">
          {formatEventWhen(event?.startDate, event?.endDate) ? (
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 mt-0.5 icon-scheduling" />
              <span className="text-secondary">
                {formatEventWhen(event?.startDate, event?.endDate)}
              </span>
            </div>
          ) : null}
          {event?.locationName ? (
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 mt-0.5 icon-location" />
              <span className="text-secondary">{event.locationName}</span>
            </div>
          ) : null}
          <div className="flex items-start gap-3">
            <Users className="h-4 w-4 mt-0.5 icon-community" />
            <span className="text-secondary">
              {goingCount} going
              {maybeCount ? ` · ${maybeCount} maybe` : ''} · {members.length} invited
            </span>
          </div>
        </div>
        {event?.description ? (
          <p className="text-secondary text-sm whitespace-pre-wrap border-t border-light pt-3">
            {event.description}
          </p>
        ) : null}
        {event?.eventType ? (
          <span className="event-badge text-xs">{eventTypeLabel(event.eventType)}</span>
        ) : null}
      </Card>

      {/* Photos */}
      {gallery.length > 0 ? (
        <Card>
          <h2 className="text-lg font-semibold text-primary">Photos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {gallery.slice(0, 24).map((item, i) => (
              <a
                key={item._id ?? item.url ?? i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-lg border border-light"
                title="Open / save photo"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={item.fileName || 'Event photo'}
                  loading="lazy"
                  className="h-28 w-full object-cover"
                />
              </a>
            ))}
          </div>
        </Card>
      ) : null}

      {/* Documents */}
      {docs.length > 0 ? (
        <Card>
          <h2 className="text-lg font-semibold text-primary">Tickets &amp; documents</h2>
          <ul className="divide-y divide-[color:var(--border-light)]">
            {docs.map((doc, i) => (
              <li key={doc._id ?? doc.url ?? i} className="flex items-center justify-between gap-3 py-3">
                <span className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 shrink-0 text-secondary" />
                  <span className="truncate text-sm text-secondary">
                    {doc.label || doc.fileName || 'Document'}
                  </span>
                </span>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="luma-button luma-button-secondary text-sm inline-flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* Post/create actions live in the app only */}
      <Card>
        <h2 className="text-lg font-semibold text-primary">Do more in the app</h2>
        <p className="text-secondary text-sm">
          Add photos, split expenses, vote in polls, post updates and chat with the group in the
          Lessgo app.
        </p>
        <DownloadAppButton subtitle="Get the app" />
      </Card>
    </div>
  );
}
