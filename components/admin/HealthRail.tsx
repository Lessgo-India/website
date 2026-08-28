'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, CircleSlash, Loader2, X } from 'lucide-react';
import type { HealthSnapshot, ServiceHealth, ServiceStatus } from '@web/lib/adminApi';
import { formatAgo, formatIstTime, formatLatency } from '@web/lib/adminFormat';

/** Status never travels by colour alone — every row carries an icon and a word. */
const PRESENTATION: Record<
  ServiceStatus,
  { label: string; text: string; dot: string; Icon: typeof Check; rank: number }
> = {
  down: { label: 'Down', text: 'text-down', dot: 'bg-down', Icon: X, rank: 0 },
  unconfigured: {
    label: 'Not set',
    text: 'text-ink-faint',
    dot: 'bg-ink-faint',
    Icon: CircleSlash,
    rank: 1,
  },
  degraded: {
    label: 'Slow',
    text: 'text-warn',
    dot: 'bg-warn',
    Icon: AlertTriangle,
    rank: 2,
  },
  ok: { label: 'Healthy', text: 'text-ok', dot: 'bg-ok', Icon: Check, rank: 3 },
};

export default function HealthRail({
  health,
  loading,
  error,
}: {
  health: HealthSnapshot | null;
  loading: boolean;
  error: string | null;
}) {
  const announcement = useStatusChangeAnnouncement(health);
  const [now, setNow] = useState(() => Date.now());
  // Desktop is the real tool; on a phone the rail collapses to its summary pill
  // so "is anything on fire" still fits above the fold.
  const [mobileOpen, setMobileOpen] = useState(false);

  // Keeps the "8s ago" label honest between polls without re-fetching.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(id);
  }, []);

  const services = health
    ? [...health.services].sort(
        (a, b) =>
          PRESENTATION[a.status].rank - PRESENTATION[b.status].rank ||
          a.name.localeCompare(b.name),
      )
    : [];

  return (
    <section aria-labelledby="health-heading" className="rounded-xl border border-line bg-surface">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 id="health-heading" className="font-display text-sm font-bold text-ink">
          Service health
        </h2>
        <div className="flex items-center gap-2">
          {loading && !health ? (
            <Loader2 className="h-4 w-4 animate-spin text-ink-faint" aria-hidden="true" />
          ) : (
            <Summary health={health} />
          )}
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-controls="health-list"
            className="-mr-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted lg:hidden"
          >
            <span className="sr-only">
              {mobileOpen ? 'Hide service list' : 'Show service list'}
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${mobileOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </header>

      {/* Announces transitions only. A poll that changed nothing stays silent so
          a screen-reader user isn't interrupted every 30 seconds. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {error ? (
        <p role="alert" className="px-4 py-3 text-sm text-down">
          {error}
        </p>
      ) : null}

      <div id="health-list" className={mobileOpen ? '' : 'hidden lg:block'}>
        <ul className="divide-y divide-line">
          {services.map((service) => (
            <HealthRow key={service.name} service={service} />
          ))}
          {!health && !error
            ? Array.from({ length: 5 }).map((_, index) => (
                <li key={index} className="px-4 py-3">
                  <span className="block h-4 w-2/3 rounded bg-surface-2" />
                </li>
              ))
            : null}
        </ul>

        <footer className="border-t border-line px-4 py-2.5 text-xs text-ink-faint">
          {health ? (
            <>
              Checked {formatAgo(health.checkedAt, now)} ·{' '}
              <span className="font-mono">{formatIstTime(health.checkedAt)}</span>
            </>
          ) : (
            'Waiting for the first check…'
          )}
        </footer>
      </div>
    </section>
  );
}

function Summary({ health }: { health: HealthSnapshot | null }) {
  if (!health) return null;
  const { ok, total, down, degraded } = health.summary;
  const allWell = down === 0 && degraded === 0;

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        allWell ? 'bg-ok-tint text-ok' : 'bg-down-tint text-down'
      }`}
    >
      {allWell ? `All ${total} healthy` : `${ok}/${total} healthy`}
    </span>
  );
}

function HealthRow({ service }: { service: ServiceHealth }) {
  const { label, text, dot, Icon } = PRESENTATION[service.status];

  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate font-mono text-[0.8rem] text-ink">
        {service.name}
      </span>
      <span className="shrink-0 font-mono text-[0.7rem] tabular-nums text-ink-faint">
        {formatLatency(service.latencyMs)}
      </span>
      <span className={`inline-flex shrink-0 items-center gap-1 text-[0.7rem] font-semibold ${text}`}>
        <Icon className="h-3 w-3" aria-hidden="true" />
        {label}
      </span>
    </li>
  );
}

/** Builds a sentence for the live region whenever a service changes state. */
function useStatusChangeAnnouncement(health: HealthSnapshot | null): string {
  const previous = useRef<Map<string, ServiceStatus> | null>(null);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (!health) return;
    const current = new Map(health.services.map((s) => [s.name, s.status]));

    if (previous.current) {
      const changes = health.services
        .filter((s) => previous.current?.get(s.name) !== s.status)
        .map((s) => `${s.name} is ${PRESENTATION[s.status].label.toLowerCase()}`);
      if (changes.length) setAnnouncement(changes.join(', '));
    }

    previous.current = current;
  }, [health]);

  return announcement;
}
