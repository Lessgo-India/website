'use client';

import { Sparkles } from 'lucide-react';
import type { AdminStats } from '@web/lib/adminApi';
import { formatCount } from '@web/lib/adminFormat';

/**
 * The five numbers that answer "how big is Lessgo right now".
 *
 * Sits above both the health rail and the tabs so the headline scale is on
 * screen no matter which view is open; the full lifetime breakdown lives in the
 * All time tab. Gold is reserved for this one card, so the treatment keeps
 * meaning something.
 */
export default function TotalsCard({ data }: { data: AdminStats | null }) {
  const totals = [
    {
      label: 'Users',
      value: formatCount(data?.users.inGraph),
      hint: 'Everyone in the contacts graph',
    },
    { label: 'Events', value: formatCount(data?.events.total), hint: 'Ever created' },
    { label: 'Profiles', value: formatCount(data?.users.total), hint: 'Completed signups' },
    { label: 'Groups', value: formatCount(data?.groups.total), hint: 'Ever created' },
    { label: 'Vibes', value: formatCount(data?.vibes.total), hint: 'Ever posted' },
  ];

  return (
    <section
      aria-labelledby="totals-heading"
      className="gold-surface relative isolate overflow-hidden rounded-xl bg-surface p-5 shadow-lift sm:p-6"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-64 w-3/4 -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--gold-glow) 0%, transparent 70%)' }}
      />
      <span
        aria-hidden="true"
        className="gold-sheen pointer-events-none absolute inset-y-0 -left-1/4 -z-10 w-1/2 animate-gold-sweep"
      />
      <span
        aria-hidden="true"
        className="gold-ring pointer-events-none absolute inset-0 rounded-xl"
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Sparkles className="h-5 w-5 text-gold" aria-hidden="true" />
        <h2 id="totals-heading" className="text-gold-gradient font-display text-lg font-bold">
          All time, at a glance
        </h2>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {totals.map((total) => (
          <div key={total.label} className="gold-tile rounded-lg px-4 py-3.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gold">{total.label}</p>
            <p className="mt-1 font-display text-3xl font-extrabold tabular-nums text-ink">
              {total.value}
            </p>
            <p className="mt-1 text-xs text-ink-muted">{total.hint}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
