'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';
import { useAdminSession } from '@ui/admin/AdminGate';
import { isPast } from '@web/lib/partner/format';
import { formatIndianMobile } from '@web/lib/partner/onboarding';
import type { PartnerLogin, PartnerStatus } from '@web/lib/partner/types';

export const adminPrimaryButton =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-profile px-5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50';
export const adminSecondaryButton =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line px-4 text-sm font-semibold text-ink hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50';
export const adminDangerButton =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-down px-4 text-sm font-semibold text-down hover:bg-down-tint disabled:cursor-not-allowed disabled:opacity-50';
export const adminSmallButton =
  'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-line px-3 text-xs font-semibold text-ink hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50';
export const adminInput =
  'w-full min-h-11 rounded-md border border-line bg-surface px-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-profile disabled:opacity-60';
export const adminLabel = 'mb-1.5 block text-sm font-semibold text-ink';
export const adminHint = 'mt-1 text-xs text-ink-muted';
export const adminCard = 'rounded-lg border border-line bg-surface';

/** The signed-in admin, for the dummy audit trail (the backend reads the session). */
export function useAdminActor(): string {
  const { session } = useAdminSession();
  return session.userId ? formatIndianMobile(session.userId) : 'Lessgo admin';
}

const PARTNER_STATUS: Record<PartnerStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-ok-tint text-ok' },
  invited: { label: 'Invited', className: 'bg-warn-tint text-warn' },
  suspended: { label: 'Suspended', className: 'bg-down-tint text-down' },
};

export function PartnerStatusBadge({ status }: { status: PartnerStatus }) {
  const style = PARTNER_STATUS[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${style.className}`}>
      {style.label}
    </span>
  );
}

export function LoginStateBadge({ login }: { login: PartnerLogin }) {
  if (login.status === 'disabled') {
    return <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-ink-muted">Turned off</span>;
  }
  if (login.mustChangePassword) {
    const expired = !!login.temporaryExpiresAt && isPast(login.temporaryExpiresAt);
    return (
      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${expired ? 'bg-down-tint text-down' : 'bg-warn-tint text-warn'}`}>
        {expired ? 'Invite expired' : 'Invite pending'}
      </span>
    );
  }
  return <span className="rounded-full bg-ok-tint px-2 py-0.5 text-[11px] font-semibold text-ok">Active</span>;
}

/** Copies `value`; the label flips to "Copied" for a moment. */
export function CopyButton({ value, label = 'Copy', className = adminSmallButton }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const area = document.createElement('textarea');
      area.value = value;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button type="button" onClick={copy} className={className}>
      {copied ? <Check className="h-3.5 w-3.5 text-ok" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
      <span aria-live="polite">{copied ? 'Copied' : label}</span>
    </button>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-xs font-medium text-down">
      {message}
    </p>
  );
}

export function FieldWarning({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-warn">{message}</p>;
}

export function SectionHeading({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-display text-lg font-bold text-ink">{children}</h2>
      {action}
    </div>
  );
}
