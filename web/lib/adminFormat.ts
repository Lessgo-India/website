/**
 * Formatting for the admin dashboard.
 *
 * Everything is rendered for an India-based operator: `en-IN` digit grouping
 * (1,20,000 — not 120,000), rupees, and IST timestamps regardless of where the
 * browser or the server happens to be.
 */

const IST = 'Asia/Kolkata';

const counts = new Intl.NumberFormat('en-IN');
const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
const decimals = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const istClock = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});
const istDay = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST,
  day: 'numeric',
  month: 'short',
});

export const WINDOW_OPTIONS = [
  { days: 1, label: '1d', description: 'Last 24 hours' },
  { days: 7, label: '7d', description: 'Last 7 days' },
  { days: 15, label: '15d', description: 'Last 15 days' },
  { days: 30, label: '30d', description: 'Last 30 days' },
] as const;

export type WindowDays = (typeof WINDOW_OPTIONS)[number]['days'];

/**
 * Rolling window ending now — "7d" means the last 168 hours, not "since
 * Monday". Rolling avoids the trap where a calendar bucket looks empty for the
 * first hours of a new day, and it sidesteps timezone drift entirely.
 */
export function rollingWindow(days: number): { from: Date; to: Date } {
  const to = new Date();
  return { from: new Date(to.getTime() - days * 24 * 60 * 60 * 1000), to };
}

export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return counts.format(value);
}

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return rupees.format(value);
}

export function formatRatio(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return decimals.format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${Math.round(value * 100)}%`;
}

export interface Delta {
  direction: 'up' | 'down' | 'flat';
  label: string;
  /** Read aloud by screen readers, since the arrow glyph carries no meaning. */
  spoken: string;
}

export function toDelta(current: number, previous: number): Delta {
  const diff = current - previous;
  if (diff === 0) {
    return { direction: 'flat', label: 'no change', spoken: 'no change' };
  }
  const magnitude = counts.format(Math.abs(diff));
  return diff > 0
    ? { direction: 'up', label: `+${magnitude}`, spoken: `up ${magnitude}` }
    : { direction: 'down', label: `−${magnitude}`, spoken: `down ${magnitude}` };
}

export function formatIstTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${istClock.format(date)} IST`;
}

export function formatIstDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return istDay.format(date);
}

export function formatAgo(iso: string | null | undefined, now: number): string {
  if (!iso) return 'never';
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

export function formatLatency(ms: number | null): string {
  if (ms === null) return '—';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}
