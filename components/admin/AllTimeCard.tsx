'use client';

import Sparkline from './Sparkline';
import type { AdminStats, TrendPoint } from '@web/lib/adminApi';
import { formatCount, formatMoney, formatMoneyExact } from '@web/lib/adminFormat';

type Domain = 'events' | 'groups' | 'split' | 'vibes' | 'profile';

const ACCENT: Record<Domain, { text: string; tint: string }> = {
  events: { text: 'text-events', tint: 'bg-events-tint' },
  groups: { text: 'text-groups', tint: 'bg-groups-tint' },
  split: { text: 'text-split', tint: 'bg-split-tint' },
  vibes: { text: 'text-vibes', tint: 'bg-vibes-tint' },
  profile: { text: 'text-profile', tint: 'bg-profile-tint' },
};

interface Figure {
  label: string;
  value: string;
  /** Exact figure behind an abbreviated `value`, shown on hover. */
  title?: string;
  hint?: string;
  /** Daily snapshots of this same cumulative total, last 30 days. */
  series?: number[];
}

interface Block {
  title: string;
  domain: Domain;
  figures: Figure[];
  note?: string;
}

/**
 * Every lifetime total the dashboard knows about, in one place.
 *
 * This card is deliberately the ONLY home for cumulative numbers: everything
 * below it answers to the window picker, so an operator never has to work out
 * whether a figure means "ever" or "in the last 7 days".
 */
export default function AllTimeCard({
  data,
  series,
  trendDays,
}: {
  data: AdminStats | null;
  series: TrendPoint[];
  trendDays: number;
}) {
  const blocks = buildBlocks(data, series);

  return (
    <section
      aria-labelledby="all-time-heading"
      className="rounded-xl border border-line bg-surface p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id="all-time-heading" className="font-display text-lg font-bold text-ink">
          All time
        </h2>
        <span className="rounded-full border border-line bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink-muted">
          Not affected by the window filter
        </span>
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        Lifetime totals across every dimension. Sparklines are the daily snapshot of that same
        total over the last {trendDays} days.
      </p>

      <div className="mt-5 space-y-6">
        {blocks.map((block) => {
          const accent = ACCENT[block.domain];
          return (
            <div key={block.title}>
              <div className="flex items-center gap-2">
                <span className={`h-4 w-1.5 rounded-full ${accent.tint}`} aria-hidden="true" />
                <h3 className={`font-display text-sm font-bold ${accent.text}`}>{block.title}</h3>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {block.figures.map((figure) => {
                  // Snapshots only exist once the nightly job has run a couple of
                  // times, so the wide tile has to follow the sparkline, not the
                  // intent to draw one.
                  const drawSparkline = (figure.series?.length ?? 0) > 1;
                  return (
                    <div
                      key={figure.label}
                      // A sparkline is a fixed 120px wide — too wide for one column.
                      className={`rounded-lg border border-line bg-surface-2 px-4 py-3 ${
                        drawSparkline ? 'col-span-2' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                            {figure.label}
                          </p>
                          <p
                            className="mt-1 font-display text-xl font-extrabold tabular-nums text-ink"
                            title={figure.title}
                          >
                            {figure.value}
                          </p>
                        </div>
                        {drawSparkline ? (
                          <Sparkline points={figure.series!} className={accent.text} />
                        ) : null}
                      </div>
                      {figure.hint ? (
                        <p className="mt-1.5 text-xs text-ink-muted">{figure.hint}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {block.note ? <p className="mt-2 text-xs text-ink-muted">{block.note}</p> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function buildBlocks(data: AdminStats | null, series: TrendPoint[]): Block[] {
  const u = data?.users;
  const e = data?.events;
  const g = data?.groups;
  const m = data?.money;
  const v = data?.vibes;
  const f = data?.files;
  const rsvp = e?.rsvp;

  const track = (pick: (point: TrendPoint) => number | undefined) =>
    series.map((point) => pick(point) ?? 0);

  return [
    {
      title: 'People',
      domain: 'profile',
      figures: [
        {
          label: 'Profiles',
          value: formatCount(u?.total),
          hint: 'Completed signups',
          series: track((p) => p.profiles),
        },
        {
          label: 'People in the graph',
          value: formatCount(u?.inGraph),
          hint: 'Everyone any guest list has ever named',
          series: track((p) => p.users),
        },
        { label: 'Active accounts', value: formatCount(u?.active) },
        {
          label: 'Invited, never joined',
          value: formatCount(u?.invitedNotJoined),
          hint: 'In a guest list with no profile yet',
        },
      ],
    },
    {
      title: 'Events',
      domain: 'events',
      figures: [
        {
          label: 'Events',
          value: formatCount(e?.total),
          hint: 'Ever created',
          series: track((p) => p.events),
        },
        { label: 'Recurring', value: formatCount(e?.recurring), hint: 'Repeats on a schedule' },
        { label: 'Archived', value: formatCount(e?.archived), hint: 'Ended over 30 days ago' },
        { label: 'RSVP — going', value: rsvp ? formatCount(rsvp.going) : '—' },
        { label: 'RSVP — maybe', value: rsvp ? formatCount(rsvp.maybe) : '—' },
        { label: 'RSVP — no reply', value: rsvp ? formatCount(rsvp.noReply) : '—' },
        { label: 'RSVP — can’t make it', value: rsvp ? formatCount(rsvp.declined) : '—' },
        ...(e?.byType ?? []).map((row) => ({
          label: `Type · ${row.type}`,
          value: formatCount(row.count),
        })),
      ],
      note:
        data && data.events.rsvp === null
          ? 'RSVP mix is not measured at this data volume.'
          : undefined,
    },
    {
      title: 'Groups & Buzz',
      domain: 'groups',
      figures: [
        {
          label: 'Groups',
          value: formatCount(g?.total),
          series: track((p) => p.groups),
        },
        { label: 'With at least one event', value: formatCount(g?.withEvents) },
        {
          label: 'Buzz',
          value: formatCount(g?.buzzTotal),
          series: track((p) => p.buzzes),
        },
        { label: 'Buzz — confirmed', value: formatCount(g?.buzzConfirmed), hint: 'Became an event' },
        {
          label: 'Buzz — expired',
          value: formatCount(g?.buzzExpired),
          hint: 'Timed out unconfirmed',
        },
      ],
    },
    {
      title: 'Money',
      domain: 'split',
      figures: [
        {
          label: 'Expenses',
          value: formatCount(m?.expenses),
          series: track((p) => p.expenses),
        },
        {
          label: 'Expense value',
          value: formatMoney(m?.expenseValue),
          title: formatMoneyExact(m?.expenseValue),
        },
        {
          label: 'Transactions',
          value: formatCount(m?.transactions),
          hint: 'One payer → one payee',
          series: track((p) => p.transactions),
        },
        {
          label: 'Transaction value',
          value: formatMoney(m?.transactionValue),
          title: formatMoneyExact(m?.transactionValue),
        },
        {
          label: 'Settlements',
          value: formatCount(m?.settlements),
          hint: 'Recorded outside an event',
        },
        { label: 'Events with an expense', value: formatCount(m?.eventsWithExpense) },
      ],
    },
    {
      title: 'Vibes & files',
      domain: 'vibes',
      figures: [
        {
          label: 'Vibes posted',
          value: formatCount(v?.total),
          series: track((p) => p.statuses),
        },
        { label: 'Interest tapped', value: formatCount(v?.interest) },
        {
          label: 'Documents',
          value: formatCount(f?.documents),
          hint: 'Byte totals are not measured',
        },
        { label: 'Gallery photos', value: formatCount(f?.photos) },
      ],
    },
  ];
}
