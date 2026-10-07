'use client';

import type { ComponentType, ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { site } from '@content/site';
import { CHANNEL_DETAILS, INTEGRATION_STATUS_DETAILS } from '@web/lib/partner/channels';
import type { CampaignStatus, IntegrationStatus, PartnerAccount, RedemptionChannel } from '@web/lib/partner/types';

export const inputClass =
  'w-full min-h-11 rounded-md border border-line-strong bg-bg-elev px-3.5 text-sm text-ink ' +
  'placeholder:text-ink-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-profile ' +
  'disabled:opacity-60';

export const labelClass = 'mb-1.5 block text-sm font-semibold text-ink';

export const hintClass = 'mt-1 text-xs text-ink-muted';

export const primaryButtonClass =
  'gradient-brand inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold ' +
  'text-white transition-transform duration-200 ease-spring hover:-translate-y-px active:scale-[0.97] ' +
  'disabled:pointer-events-none disabled:opacity-55';

export const secondaryButtonClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line-strong px-5 text-sm ' +
  'font-semibold text-ink transition-colors hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-55';

export const ghostButtonClass =
  'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-semibold text-ink-muted ' +
  'transition-colors hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-55';

export function PortalMark({ subtitle = 'Partners' }: { subtitle?: string }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={site.logo} alt="" width={32} height={32} className="h-8 w-8 object-contain" />
      <span className="leading-tight">
        <span className="block font-display text-base font-extrabold tracking-tight text-ink">
          Less<span className="text-gradient">go</span>
        </span>
        <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          {subtitle}
        </span>
      </span>
    </span>
  );
}

export function BrandAvatar({
  partner,
  size = 40,
}: {
  partner: Pick<PartnerAccount, 'logoEmoji' | 'brandColor' | 'brandName'>;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex flex-none items-center justify-center rounded-full bg-surface-2"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.48,
        boxShadow: `0 0 0 2px var(--surface), 0 0 0 4px ${partner.brandColor}`,
      }}
    >
      {partner.logoEmoji}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-1 text-sm text-ink-muted">{eyebrow}</div> : null}
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 max-w-prose text-sm text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Card({
  children,
  className = '',
  title,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className={`rounded-lg border border-line bg-surface p-5 shadow-soft ${className}`}>
      {title || action ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? <h2 className="font-display text-base font-bold text-ink">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  accent = 'text-profile',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
        {Icon ? <Icon className={`h-4 w-4 ${accent}`} aria-hidden="true" /> : null}
      </div>
      <p className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}

const STATUS_STYLE: Record<CampaignStatus, { label: string; className: string }> = {
  live: { label: 'Live', className: 'bg-ok-tint text-ok' },
  paused: { label: 'Paused', className: 'bg-warn-tint text-warn' },
  scheduled: { label: 'Scheduled', className: 'bg-groups-tint text-groups' },
  in_review: { label: 'In review', className: 'bg-profile-tint text-profile' },
  rejected: { label: 'Changes needed', className: 'bg-down-tint text-down' },
  draft: { label: 'Draft', className: 'bg-surface-2 text-ink-muted' },
  ended: { label: 'Ended', className: 'bg-surface-2 text-ink-muted' },
};

export function StatusPill({ status }: { status: CampaignStatus }) {
  const style = STATUS_STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style.className}`}>
      {status === 'live' ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" /> : null}
      {style.label}
    </span>
  );
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-ink-muted" role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-down bg-down-tint px-4 py-3 text-sm text-ink">
      <AlertTriangle className="h-4 w-4 flex-none text-down" aria-hidden="true" />
      <span className="flex-1">{message}</span>
      {onRetry ? (
        <button type="button" onClick={onRetry} className={ghostButtonClass}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-line-strong px-6 py-12 text-center">
      <Icon className="h-8 w-8 text-ink-faint" aria-hidden="true" />
      <p className="mt-3 font-display text-lg font-bold text-ink">{title}</p>
      {body ? <p className="mt-1 max-w-sm text-sm text-ink-muted">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function DemoTag({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border border-gold-line bg-gold-tint px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-gold ${className}`}
    >
      Demo data
    </span>
  );
}

// Ink text on the tint: the accent colours themselves are too light for 11px text.
const CHANNEL_STYLE: Record<RedemptionChannel, string> = {
  in_store: 'bg-groups-tint text-ink',
  online_code: 'bg-vibes-tint text-ink',
  api_booking: 'bg-events-tint text-ink',
};

/** "📍 In-store", "🛒 Online checkout", "🎟️ Bookings via API". */
export function ChannelBadge({ channel, className = '' }: { channel: RedemptionChannel; className?: string }) {
  const detail = CHANNEL_DETAILS[channel];
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${CHANNEL_STYLE[channel]} ${className}`}
    >
      <span aria-hidden="true">{detail.emoji}</span>
      {detail.label}
    </span>
  );
}

const INTEGRATION_TONE: Record<'neutral' | 'warn' | 'info' | 'ok', string> = {
  neutral: 'bg-surface-2 text-ink-muted',
  warn: 'bg-warn-tint text-warn',
  info: 'bg-profile-tint text-profile',
  ok: 'bg-ok-tint text-ok',
};

export function IntegrationStatusBadge({ status }: { status: IntegrationStatus }) {
  const detail = INTEGRATION_STATUS_DETAILS[status];
  return (
    <span
      title={detail.summary}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${INTEGRATION_TONE[detail.tone]}`}
    >
      {status === 'live' ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" /> : null}
      {detail.label}
    </span>
  );
}
