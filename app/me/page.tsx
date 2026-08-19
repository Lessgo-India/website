'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@web/lib/auth';
import { useMe } from '@web/lib/useMe';
import { eventTypeLabel, formatEventWhen } from '@web/lib/format';
import AppHeader from '@web/components/AppHeader';
import DownloadAppButton from '@web/components/DownloadAppButton';

export default function MePage() {
  const router = useRouter();
  const { ready, user, configured } = useAuth();
  const { muo, name, loading } = useMe();

  useEffect(() => {
    if (ready && configured && !user) router.replace('/onboarding?next=/me');
  }, [ready, configured, user, router]);

  const events = muo?.events ?? [];

  return (
    <div className="min-h-screen bg-primary">
      <AppHeader />
      <main className="container mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-5">
        {!configured ? (
          <div className="luma-card space-y-3">
            <h1 className="text-xl font-semibold text-primary">Get the Lessgo app</h1>
            <p className="text-secondary text-sm">Sign-in isn’t configured on the web yet.</p>
            <DownloadAppButton />
          </div>
        ) : !user ? (
          <div className="luma-card">
            <p className="text-secondary text-sm">Redirecting to sign in…</p>
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-bold text-primary">
                {name ? `Hi, ${name}` : 'Your events'}
              </h1>
              <p className="text-secondary text-sm">Your upcoming and recent events.</p>
            </div>

            {loading && !muo ? (
              <div className="luma-card">
                <p className="text-secondary text-sm">Loading…</p>
              </div>
            ) : events.length === 0 ? (
              <div className="luma-card space-y-3">
                <p className="text-secondary text-sm">
                  No events yet. Create and manage events in the app.
                </p>
                <DownloadAppButton />
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((ev) => (
                  <Link
                    key={ev.event_id}
                    href={`/e/${ev.event_id}`}
                    className="event-card block no-underline"
                  >
                    <div className="event-card-content flex items-center gap-4">
                      {ev.dp_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ev.dp_url}
                          alt=""
                          className="h-14 w-14 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div
                          className="h-14 w-14 rounded-lg shrink-0"
                          style={{ background: 'var(--bg-tertiary)' }}
                        />
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-primary truncate">
                          {ev.eventName || 'Event'}
                        </p>
                        <p className="text-secondary text-sm truncate">
                          {formatEventWhen(ev.startDate, ev.endDate) || eventTypeLabel(ev.eventType)}
                        </p>
                        {ev.locationName ? (
                          <p className="text-muted text-xs truncate">{ev.locationName}</p>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
