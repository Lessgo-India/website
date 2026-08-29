'use client';

import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { toDelta } from '@web/lib/adminFormat';

type Domain = 'events' | 'groups' | 'split' | 'vibes' | 'profile';

const ACCENT: Record<Domain, string> = {
  events: 'text-events',
  groups: 'text-groups',
  split: 'text-split',
  vibes: 'text-vibes',
  profile: 'text-profile',
};

/**
 * A headline number with the one thing that makes it actionable: how it moved
 * against the previous window of the same length.
 */
export default function StatCard({
  label,
  value,
  valueTitle,
  sub,
  current,
  previous,
  windowLabel,
  domain,
  deltaUnit,
}: {
  label: string;
  value: string;
  /** Exact figure behind an abbreviated `value`, shown on hover. */
  valueTitle?: string;
  sub: string;
  current: number;
  previous: number;
  windowLabel: string;
  domain: Domain;
  deltaUnit?: string;
}) {
  const delta = toDelta(current, previous);
  const Icon =
    delta.direction === 'up' ? ArrowUpRight : delta.direction === 'down' ? ArrowDownRight : Minus;
  const tone =
    delta.direction === 'up'
      ? 'text-ok'
      : delta.direction === 'down'
        ? 'text-down'
        : 'text-ink-faint';

  const unit = deltaUnit ? ` ${deltaUnit}` : '';

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <p className={`text-xs font-semibold uppercase tracking-wide ${ACCENT[domain]}`}>{label}</p>
      <p
        className="mt-2 font-display text-3xl font-extrabold tabular-nums text-ink"
        title={valueTitle}
        aria-label={`${label}: ${valueTitle ?? value}. ${delta.spoken}${unit} versus the previous ${windowLabel}`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-ink-muted">{sub}</p>
      <p className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold ${tone}`}>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        <span aria-hidden="true">
          {delta.label}
          {unit}
        </span>
        <span className="font-normal text-ink-faint">vs previous {windowLabel}</span>
      </p>
    </div>
  );
}
