/**
 * Display formatting for the partner portal: en-IN digit grouping, the Indian
 * short scale (K/L/Cr) and IST dates regardless of the browser's time zone.
 */
export { formatInr } from './rules';

const IST = 'Asia/Kolkata';
const DAY_MS = 24 * 60 * 60 * 1000;
/** IST is a fixed UTC+05:30 (no DST). */
const IST_OFFSET_MS = 330 * 60 * 1000;

const counts = new Intl.NumberFormat('en-IN');
const percent = new Intl.NumberFormat('en-IN', { style: 'percent', maximumFractionDigits: 1 });
const day = new Intl.DateTimeFormat('en-IN', { timeZone: IST, day: 'numeric', month: 'short', year: 'numeric' });
const shortDay = new Intl.DateTimeFormat('en-IN', { timeZone: IST, day: 'numeric', month: 'short' });
const dayTime = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST,
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});
const weekday = new Intl.DateTimeFormat('en-IN', { timeZone: IST, weekday: 'short' });

export function formatCount(value: number): string {
  return counts.format(value);
}

const SHORT_SCALE = [
  { min: 10_000_000, suffix: 'Cr' },
  { min: 100_000, suffix: 'L' },
  { min: 1_000, suffix: 'K' },
] as const;

/** 1,24,000 → "1.2L". */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const unit = SHORT_SCALE.find((candidate) => abs >= candidate.min);
  if (!unit) return counts.format(value);
  const scaled = value / unit.min;
  return `${scaled.toFixed(Math.abs(scaled) < 100 ? 1 : 0).replace(/\.0$/, '')}${unit.suffix}`;
}

/** Paise → "₹6.9L" for dense KPI tiles. */
export function formatInrCompact(minor: number): string {
  return `₹${formatCompact(Math.round(minor / 100))}`;
}

export function formatPercent(ratio: number | null): string {
  return ratio === null ? '—' : percent.format(ratio);
}

export function formatDate(iso: string): string {
  return day.format(new Date(iso));
}

export function formatShortDay(iso: string): string {
  return shortDay.format(new Date(iso));
}

export function formatWeekday(iso: string): string {
  return weekday.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return dayTime.format(new Date(iso));
}

export function formatRelative(iso: string, now: number = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const suffix = (text: string) => (diff < 0 ? `${text} ago` : `in ${text}`);
  if (abs < 60_000) return 'just now';
  if (abs < 3_600_000) return suffix(`${Math.round(abs / 60_000)} min`);
  if (abs < DAY_MS) return suffix(`${Math.round(abs / 3_600_000)} h`);
  const days = Math.round(abs / DAY_MS);
  return suffix(`${days} day${days === 1 ? '' : 's'}`);
}

/** True once `iso` has passed (temporary passwords, start dates). */
export function isPast(iso: string, now: number = Date.now()): boolean {
  return Date.parse(iso) <= now;
}

/** ISO → "YYYY-MM-DD" in IST, for <input type="date">. */
export function toDateInputValue(iso: string): string {
  return new Date(new Date(iso).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" (IST) → ISO at the start, or the last millisecond, of that IST day. */
export function fromDateInputValue(value: string, endOfDay = false): string {
  const start = Date.parse(`${value}T00:00:00.000Z`) - IST_OFFSET_MS;
  if (Number.isNaN(start)) return '';
  return new Date(endOfDay ? start + DAY_MS - 1 : start).toISOString();
}

export function greeting(now: Date = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat('en-IN', { timeZone: IST, hour: 'numeric', hour12: false }).format(now));
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
