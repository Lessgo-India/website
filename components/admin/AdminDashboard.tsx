'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LogOut, RefreshCw } from 'lucide-react';
import { Logo } from '@ui/Logo';
import { ThemeToggle } from '@ui/ThemeToggle';
import DomainSection, { type Metric } from '@ui/admin/DomainSection';
import HealthRail from '@ui/admin/HealthRail';
import StatCard from '@ui/admin/StatCard';
import TrendGrid, { type Trend } from '@ui/admin/TrendGrid';
import WindowPicker from '@ui/admin/WindowPicker';
import { getAdminHealth, getAdminStats, getAdminTrends, type AdminStats } from '@web/lib/adminApi';
import {
  formatAgo,
  formatCount,
  formatMoney,
  formatPercent,
  formatRatio,
  rollingWindow,
  type WindowDays,
} from '@web/lib/adminFormat';
import { useAuth } from '@web/lib/auth';
import { usePoll } from '@web/lib/useAdminPoll';

const HEALTH_INTERVAL_MS = 30_000;
const STATS_INTERVAL_MS = 120_000;
const TREND_DAYS = 30;
const WINDOW_STORAGE_KEY = 'lessgo.admin.window';

export default function AdminDashboard() {
  const { getToken, signOut } = useAuth();
  const [days, setDays] = useState<WindowDays>(7);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(WINDOW_STORAGE_KEY));
    if ([1, 7, 15, 30].includes(stored)) setDays(stored as WindowDays);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(id);
  }, []);

  const chooseWindow = useCallback((next: WindowDays) => {
    setDays(next);
    window.localStorage.setItem(WINDOW_STORAGE_KEY, String(next));
  }, []);

  const health = usePoll(
    useCallback(() => getAdminHealth(getToken), [getToken]),
    HEALTH_INTERVAL_MS,
    'health',
  );

  // Recomputing the window per fetch keeps a long-open tab's "last 7 days"
  // actually relative to now rather than to whenever the page was opened.
  const stats = usePoll(
    useCallback(() => getAdminStats(rollingWindow(days), getToken), [days, getToken]),
    STATS_INTERVAL_MS,
    `stats-${days}`,
  );

  const trends = usePoll(
    useCallback(() => getAdminTrends(TREND_DAYS, getToken), [getToken]),
    STATS_INTERVAL_MS * 5,
    'trends',
  );

  const windowLabel = `${days}d`;
  const data = stats.data;
  const series = trends.data?.series ?? [];

  const ratioCards = useMemo<Trend[]>(() => {
    const r = data?.ratios;
    return [
      {
        label: 'Guests per event',
        value: formatRatio(r?.guestsPerEvent),
        definition: 'Average size of an event guest list, across every event.',
        accent: 'text-events',
      },
      {
        label: 'Invite → signup',
        value: formatPercent(r?.signupRate),
        definition: 'People with a profile, as a share of everyone in the contacts graph.',
        series: series.map((p) => (p.users ? (p.profiles ?? 0) / p.users : 0)),
        accent: 'text-profile',
      },
      {
        label: 'Events with expenses',
        value: formatPercent(r?.expenseAttachRate),
        definition: 'Events that have at least one expense recorded against them.',
        accent: 'text-split',
      },
      {
        label: 'Buzz → confirmed',
        value: formatPercent(r?.buzzConversion),
        definition: 'Confirmed Buzz as a share of those that resolved (confirmed + expired).',
        accent: 'text-groups',
      },
      {
        label: 'Members per group',
        value: formatRatio(r?.membersPerGroup),
        definition: 'Average member count across every group.',
        accent: 'text-groups',
      },
      {
        label: 'Average expense',
        value: formatMoney(r?.avgExpenseValue),
        definition: 'Total expense value divided by the number of expenses.',
        accent: 'text-split',
      },
    ];
  }, [data, series]);

  const growthCards = useMemo<Trend[]>(
    () => [
      {
        label: 'Profiles',
        value: formatCount(data?.users.total),
        definition: 'Signed-up accounts, cumulative.',
        series: series.map((p) => p.profiles ?? 0),
        accent: 'text-profile',
      },
      {
        label: 'Events',
        value: formatCount(data?.events.total),
        definition: 'Events ever created, cumulative.',
        series: series.map((p) => p.events ?? 0),
        accent: 'text-events',
      },
      {
        label: 'Expenses',
        value: formatCount(data?.money.expenses),
        definition: 'Expenses ever recorded, cumulative.',
        series: series.map((p) => p.expenses ?? 0),
        accent: 'text-split',
      },
    ],
    [data, series],
  );

  const refreshAll = () => {
    health.refresh();
    stats.refresh();
    trends.refresh();
  };

  return (
    <div className="container-page py-6">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-line pb-5">
        <Logo showWordmark={false} />
        <div className="min-w-0">
          <h1 className="font-display text-xl font-extrabold text-ink">
            Admin<span className="text-gradient"> · </span>Operations
          </h1>
          <p className="text-xs text-ink-muted">
            {data ? `Counts updated ${formatAgo(data.generatedAt, now)}` : 'Loading counts…'} · health
            refreshes every 30s
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <WindowPicker value={days} onChange={chooseWindow} disabled={stats.loading && !data} />
          <button
            type="button"
            onClick={refreshAll}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:bg-surface-2"
          >
            <span className="sr-only">Refresh now</span>
            <RefreshCw
              className={`h-4 w-4 ${stats.loading || health.loading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
          </button>
          <ThemeToggle />
          <button
            type="button"
            onClick={signOut}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:bg-surface-2"
          >
            <span className="sr-only">Sign out</span>
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <HealthRail health={health.data} loading={health.loading} error={health.error} />
        </div>

        <div className="min-w-0 space-y-6">
          {stats.error ? (
            <p
              role="alert"
              className="rounded-lg border border-down bg-down-tint px-4 py-3 text-sm text-ink"
            >
              {stats.error}
            </p>
          ) : null}

          <section aria-labelledby="headline-heading">
            <h2 id="headline-heading" className="sr-only">
              Headline totals
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                domain="profile"
                label="Users"
                value={formatCount(data?.users.total)}
                sub={`${formatCount(data?.users.created)} new in the last ${windowLabel}`}
                current={data?.users.created ?? 0}
                previous={data?.users.createdPrev ?? 0}
                windowLabel={windowLabel}
                deltaUnit="signups"
              />
              <StatCard
                domain="events"
                label="Events"
                value={formatCount(data?.events.total)}
                sub={`${formatCount(data?.events.live)} live now · ${formatCount(
                  data?.events.created,
                )} created in ${windowLabel}`}
                current={data?.events.created ?? 0}
                previous={data?.events.createdPrev ?? 0}
                windowLabel={windowLabel}
                deltaUnit="events"
              />
              <StatCard
                domain="groups"
                label="Groups"
                value={formatCount(data?.groups.total)}
                sub={`${formatCount(data?.groups.buzzOpen)} Buzz open right now`}
                current={data?.groups.created ?? 0}
                previous={data?.groups.createdPrev ?? 0}
                windowLabel={windowLabel}
                deltaUnit="groups"
              />
              <StatCard
                domain="split"
                label="Money split"
                value={formatMoney(data?.money.expenseValue)}
                sub={`${formatMoney(data?.money.createdValue)} across ${formatCount(
                  data?.money.created,
                )} expenses in ${windowLabel}`}
                current={data?.money.created ?? 0}
                previous={data?.money.createdPrev ?? 0}
                windowLabel={windowLabel}
                deltaUnit="expenses"
              />
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            <DomainSection
              id="events"
              title="Events"
              domain="events"
              metrics={eventMetrics(data, windowLabel)}
              note={
                data && data.events.rsvp === null
                  ? 'RSVP mix is not measured at this data volume.'
                  : undefined
              }
            />
            <DomainSection
              id="groups"
              title="Groups & Buzz"
              domain="groups"
              metrics={groupMetrics(data, windowLabel)}
            />
            <DomainSection
              id="money"
              title="Expenses & settlements"
              domain="split"
              metrics={moneyMetrics(data, windowLabel)}
            />
            <DomainSection
              id="people"
              title="People & Vibes"
              domain="profile"
              metrics={peopleMetrics(data, windowLabel)}
              note="Aggregate counts only — no individual records are read or returned."
            />
          </div>

          <TrendGrid
            id="ratios"
            title="Ratios"
            description="How the product behaves, not how much of it exists. All-time unless stated."
            trends={ratioCards}
          />
          <TrendGrid
            id="growth"
            title="Growth"
            description={`Daily totals captured at 03:00 IST, last ${TREND_DAYS} days. A flat line means no snapshots yet.`}
            trends={growthCards}
          />
        </div>
      </div>
    </div>
  );
}

type Stats = AdminStats | null;

function eventMetrics(data: Stats, windowLabel: string): Metric[] {
  const e = data?.events;
  const rsvp = e?.rsvp;
  return [
    { label: 'Coming up', value: formatCount(e?.upcoming), hint: 'Starts in the future' },
    { label: 'Live now', value: formatCount(e?.live), hint: 'Started, not yet ended' },
    { label: 'Wrapped', value: formatCount(e?.wrapped), hint: 'Ended within 30 days' },
    { label: 'Archived', value: formatCount(e?.archived), hint: 'Ended over 30 days ago' },
    { label: 'Recurring', value: formatCount(e?.recurring), hint: 'Repeats on a schedule' },
    { label: `Created in ${windowLabel}`, value: formatCount(e?.created) },
    { label: 'RSVP — going', value: rsvp ? formatCount(rsvp.going) : '—' },
    { label: 'RSVP — maybe', value: rsvp ? formatCount(rsvp.maybe) : '—' },
    { label: 'RSVP — no reply', value: rsvp ? formatCount(rsvp.noReply) : '—' },
    { label: 'RSVP — can’t make it', value: rsvp ? formatCount(rsvp.declined) : '—' },
    ...(e?.byType ?? []).map((row) => ({
      label: `Type · ${row.type}`,
      value: formatCount(row.count),
    })),
  ];
}

function groupMetrics(data: Stats, windowLabel: string): Metric[] {
  const g = data?.groups;
  return [
    { label: 'Groups', value: formatCount(g?.total) },
    { label: 'With at least one event', value: formatCount(g?.withEvents) },
    { label: `Created in ${windowLabel}`, value: formatCount(g?.created) },
    { label: 'Buzz — total', value: formatCount(g?.buzzTotal) },
    { label: 'Buzz — open', value: formatCount(g?.buzzOpen), hint: 'Still gathering interest' },
    { label: 'Buzz — confirmed', value: formatCount(g?.buzzConfirmed), hint: 'Became an event' },
    { label: 'Buzz — expired', value: formatCount(g?.buzzExpired), hint: 'Timed out unconfirmed' },
    { label: `Buzz created in ${windowLabel}`, value: formatCount(g?.buzzCreated) },
  ];
}

function moneyMetrics(data: Stats, windowLabel: string): Metric[] {
  const m = data?.money;
  return [
    { label: 'Expenses', value: formatCount(m?.expenses) },
    { label: 'Expense value', value: formatMoney(m?.expenseValue) },
    { label: 'Transactions', value: formatCount(m?.transactions), hint: 'One payer → one payee' },
    { label: 'Transaction value', value: formatMoney(m?.transactionValue) },
    { label: 'Settlements', value: formatCount(m?.settlements), hint: 'Recorded outside an event' },
    { label: 'Events with an expense', value: formatCount(m?.eventsWithExpense) },
    { label: `Expenses in ${windowLabel}`, value: formatCount(m?.created) },
    { label: `Value in ${windowLabel}`, value: formatMoney(m?.createdValue) },
    { label: `Transactions in ${windowLabel}`, value: formatCount(m?.transactionsCreated) },
  ];
}

function peopleMetrics(data: Stats, windowLabel: string): Metric[] {
  const u = data?.users;
  const v = data?.vibes;
  const f = data?.files;
  return [
    { label: 'Profiles', value: formatCount(u?.total), hint: 'Completed signups' },
    { label: 'Active accounts', value: formatCount(u?.active) },
    {
      label: 'Invited, never joined',
      value: formatCount(u?.invitedNotJoined),
      hint: 'In someone’s guest list with no profile yet',
    },
    { label: 'People in the graph', value: formatCount(u?.inGraph) },
    { label: `Signups in ${windowLabel}`, value: formatCount(u?.created) },
    { label: 'Vibes posted', value: formatCount(v?.total) },
    { label: 'Vibes live now', value: formatCount(v?.active) },
    { label: `Vibes in ${windowLabel}`, value: formatCount(v?.created) },
    { label: 'Interest tapped', value: formatCount(v?.interest) },
    { label: 'Documents', value: formatCount(f?.documents), hint: 'Byte totals are not measured' },
    { label: 'Gallery photos', value: formatCount(f?.photos) },
  ];
}
