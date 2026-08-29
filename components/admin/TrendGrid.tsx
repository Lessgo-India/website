'use client';

import Sparkline from './Sparkline';

export interface Trend {
  label: string;
  value: string;
  /** Stated on the card, not in a tooltip — an ambiguous denominator lies. */
  definition: string;
  /** Exact figure behind an abbreviated `value`, shown on hover. */
  title?: string;
  series?: number[];
  accent?: string;
}

/**
 * Ratio metrics: the handful of numbers that describe how the product is
 * behaving rather than how much of it exists.
 */
export default function TrendGrid({
  id,
  title,
  description,
  trends,
}: {
  id: string;
  title: string;
  description: string;
  trends: Trend[];
}) {
  return (
    <section aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className="font-display text-lg font-bold text-ink">
        {title}
      </h2>
      <p className="mt-1 text-sm text-ink-muted">{description}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {trends.map((trend) => (
          <div key={trend.label} className="rounded-xl border border-line bg-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  {trend.label}
                </p>
                <p
                  className="mt-1.5 font-display text-2xl font-extrabold tabular-nums text-ink"
                  title={trend.title}
                >
                  {trend.value}
                </p>
              </div>
              {trend.series && trend.series.length > 1 ? (
                <Sparkline points={trend.series} className={trend.accent ?? 'text-profile'} />
              ) : null}
            </div>
            <p className="mt-3 text-xs text-ink-muted">{trend.definition}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
