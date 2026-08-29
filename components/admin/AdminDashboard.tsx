'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LogOut, RefreshCw } from 'lucide-react';
import { Logo } from '@ui/Logo';
import { ThemeToggle } from '@ui/ThemeToggle';
import AllTimeCard from '@ui/admin/AllTimeCard';
import DomainSection, { type Metric } from '@ui/admin/DomainSection';
import HealthRail from '@ui/admin/HealthRail';
import StatCard from '@ui/admin/StatCard';
import TrendGrid, { type Trend } from '@ui/admin/TrendGrid';
import WindowPicker from '@ui/admin/WindowPicker';
import { getAdminHealth, getAdminStats, getAdminTrends, adminLogout, type AdminStats } from '@web/lib/adminApi';
import {
  formatAgo,
  formatCount,
  formatMoney,
  formatMoneyExact,
  formatPercent,
  formatRatio,
  rollingWindow,
  type WindowDays,
} from '@web/lib/adminFormat';
import { usePoll } from '@web/lib/useAdminPoll';

const HEALTH_INTERVAL_MS = 30_000;
const STATS_INTERVAL_MS = 120_000;
const TREND_DAYS = 30;
const WINDOW_STORAGE_KEY = 'lessgo.admin.window';

export default function AdminDashboard() {
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
    useCallback(() => getAdminHealth(), []),
    HEALTH_INTERVAL_MS,
    'health',
  );

  // Recomputing the window per fetch keeps a long-open tab's "last 7 days"
  // actually relative to now rather than to whenever the page was opened.
  const stats = usePoll(
    useCallback(() => getAdminStats(rollingWindow(days)), [days]),
    STATS_INTERVAL_MS,
    `stats-${days}`,
  );

  const trends = usePoll(
    useCallback(() => getAdminTrends(TREND_DAYS), []),
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
        title: formatMoneyExact(r?.avgExpenseValue),
        definition: 'Total expense value divided by the number of expenses.',
        accent: 'text-split',
      },
    ];
  }, [data, series]);

  const refreshAll = () => {
    health.refresh();
    stats.refresh();
    trends.refresh();
  };

  const signOut = async () => {
    await adminLogout();
    window.location.reload();
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

          <AllTimeCard data={data} series={series} trendDays={TREND_DAYS} />

          <TrendGrid
            id="ratios"
            title="Ratios"
            description="How the product behaves, not how much of it exists. All time — not affected by the window filter."
            trends={ratioCards}
          />

          <section aria-labelledby="window-heading" className="space-y-4">
            <div>
              <h2 id="window-heading" className="font-display text-lg font-bold text-ink">
                Last {windowLabel}
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                A rolling window ending now. Everything from here down moves with the picker;
                lifetime totals live in the card above.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                domain="profile"
                label="New users"
                value={formatCount(data?.users.created)}
                sub={`${formatCount(data?.users.createdPrev)} in the previous ${windowLabel}`}
                current={data?.users.created ?? 0}
                previous={data?.users.createdPrev ?? 0}
                windowLabel={windowLabel}
                deltaUnit="signups"
              />
              <StatCard
                domain="events"
                label="New events"
                value={formatCount(data?.events.created)}
                sub={`${formatCount(data?.events.live)} live right now`}
                current={data?.events.created ?? 0}
                previous={data?.events.createdPrev ?? 0}
                windowLabel={windowLabel}
                deltaUnit="events"
              />
              <StatCard
                domain="groups"
                label="New groups"
                value={formatCount(data?.groups.created)}
                sub={`${formatCount(data?.groups.buzzCreated)} Buzz started · ${formatCount(
                  data?.groups.buzzOpen,
                )} open right now`}
                current={data?.groups.created ?? 0}
                previous={data?.groups.createdPrev ?? 0}
                windowLabel={windowLabel}
                deltaUnit="groups"
              />
              <StatCard
                domain="split"
                label="Money split"
                value={formatMoney(data?.money.createdValue)}
                valueTitle={formatMoneyExact(data?.money.createdValue)}
                sub={`across ${formatCount(data?.money.created)} expenses`}
                current={data?.money.created ?? 0}
                previous={data?.money.createdPrev ?? 0}
                windowLabel={windowLabel}
                deltaUnit="expenses"
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <DomainSection
                id="events"
                title="Events"
                domain="events"
                metrics={eventMetrics(data, windowLabel)}
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
          </section>
        </div>
      </div>
    </div>
  );
}

type Stats = AdminStats | null;

/**
 * The lower tables carry only what moves with the window picker, plus the few
 * "right now" states that are genuinely current rather than cumulative.
 * Lifetime totals belong to `AllTimeCard`.
 */
function previousHint(previous: number | undefined, windowLabel: string): string {
  return `${formatCount(previous)} in the previous ${windowLabel}`;
}

function eventMetrics(data: Stats, windowLabel: string): Metric[] {
  const e = data?.events;
  return [
    {
      label: `Created in ${windowLabel}`,
      value: formatCount(e?.created),
      hint: previousHint(e?.createdPrev, windowLabel),
    },
    { label: 'Live now', value: formatCount(e?.live), hint: 'Started, not yet ended' },
    { label: 'Coming up', value: formatCount(e?.upcoming), hint: 'Starts in the future' },
    { label: 'Wrapped', value: formatCount(e?.wrapped), hint: 'Ended within the last 30 days' },
  ];
}

function groupMetrics(data: Stats, windowLabel: string): Metric[] {
  const g = data?.groups;
  return [
    {
      label: `Created in ${windowLabel}`,
      value: formatCount(g?.created),
      hint: previousHint(g?.createdPrev, windowLabel),
    },
    {
      label: `Buzz started in ${windowLabel}`,
      value: formatCount(g?.buzzCreated),
      hint: previousHint(g?.buzzCreatedPrev, windowLabel),
    },
    { label: 'Buzz open now', value: formatCount(g?.buzzOpen), hint: 'Still gathering interest' },
  ];
}

function moneyMetrics(data: Stats, windowLabel: string): Metric[] {
  const m = data?.money;
  return [
    {
      label: `Expenses in ${windowLabel}`,
      value: formatCount(m?.created),
      hint: previousHint(m?.createdPrev, windowLabel),
    },
    {
      label: `Value in ${windowLabel}`,
      value: formatMoney(m?.createdValue),
      title: formatMoneyExact(m?.createdValue),
    },
    {
      label: `Transactions in ${windowLabel}`,
      value: formatCount(m?.transactionsCreated),
      hint: previousHint(m?.transactionsCreatedPrev, windowLabel),
    },
  ];
}

function peopleMetrics(data: Stats, windowLabel: string): Metric[] {
  const u = data?.users;
  const v = data?.vibes;
  const f = data?.files;
  return [
    {
      label: `Signups in ${windowLabel}`,
      value: formatCount(u?.created),
      hint: previousHint(u?.createdPrev, windowLabel),
    },
    {
      label: `Vibes in ${windowLabel}`,
      value: formatCount(v?.created),
      hint: previousHint(v?.createdPrev, windowLabel),
    },
    { label: 'Vibes live now', value: formatCount(v?.active), hint: 'Not yet expired' },
    { label: `Documents in ${windowLabel}`, value: formatCount(f?.documentsCreated) },
    { label: `Gallery photos in ${windowLabel}`, value: formatCount(f?.photosCreated) },
  ];
}
