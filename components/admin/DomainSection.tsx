'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface Metric {
  label: string;
  value: string;
  /** Shown under the label — what the number actually counts. */
  hint?: string;
  /** Exact figure behind an abbreviated `value`, shown on hover. */
  title?: string;
}

type Domain = 'events' | 'groups' | 'split' | 'vibes' | 'profile';

const ACCENT: Record<Domain, { text: string; tint: string }> = {
  events: { text: 'text-events', tint: 'bg-events-tint' },
  groups: { text: 'text-groups', tint: 'bg-groups-tint' },
  split: { text: 'text-split', tint: 'bg-split-tint' },
  vibes: { text: 'text-vibes', tint: 'bg-vibes-tint' },
  profile: { text: 'text-profile', tint: 'bg-profile-tint' },
};

const STORAGE_PREFIX = 'lessgo.admin.section.';

/**
 * A collapsible block of sub-counts for one product domain, colour-keyed to the
 * same accent the app uses for that domain. Sub-counts are a real table because
 * that is what they are — screen readers then get row and column context free.
 */
export default function DomainSection({
  id,
  title,
  domain,
  metrics,
  note,
}: {
  id: string;
  title: string;
  domain: Domain;
  metrics: Metric[];
  note?: string;
}) {
  const [open, setOpen] = useState(true);
  const accent = ACCENT[domain];

  useEffect(() => {
    setOpen(window.localStorage.getItem(`${STORAGE_PREFIX}${id}`) !== 'closed');
  }, [id]);

  const toggle = () => {
    setOpen((previous) => {
      const next = !previous;
      window.localStorage.setItem(`${STORAGE_PREFIX}${id}`, next ? 'open' : 'closed');
      return next;
    });
  };

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface">
      <h3>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-2"
        >
          <span className={`h-6 w-1.5 rounded-full ${accent.tint}`} aria-hidden="true" />
          <span className={`font-display text-base font-bold ${accent.text}`}>{title}</span>
          <ChevronDown
            className={`ml-auto h-4 w-4 text-ink-faint transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </button>
      </h3>

      <div id={`${id}-panel`} hidden={!open}>
        <table className="w-full border-t border-line text-sm">
          <caption className="sr-only">{title} breakdown</caption>
          <tbody>
            {metrics.map((metric) => (
              <tr key={metric.label} className="border-b border-line last:border-b-0">
                <th scope="row" className="px-5 py-2.5 text-left font-normal align-top">
                  <span className="text-ink">{metric.label}</span>
                  {metric.hint ? (
                    <span className="mt-0.5 block text-xs text-ink-muted">{metric.hint}</span>
                  ) : null}
                </th>
                <td
                  className="px-5 py-2.5 text-right font-mono tabular-nums text-ink"
                  title={metric.title}
                >
                  {metric.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {note ? <p className="px-5 py-3 text-xs text-ink-muted">{note}</p> : null}
      </div>
    </section>
  );
}
