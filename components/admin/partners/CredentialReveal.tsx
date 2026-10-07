'use client';

import { useState } from 'react';
import { AlertTriangle, Eye, EyeOff, KeyRound, Mail, MailCheck, Smartphone } from 'lucide-react';
import { DemoTag } from '@ui/partner/ui';
import { PARTNER_PORTAL_CONFIG } from '@web/lib/partner/config';
import { formatDateTime } from '@web/lib/partner/format';
import { buildInviteMessage, formatIndianMobile } from '@web/lib/partner/onboarding';
import type { IssuedCredential } from '@web/lib/partner/types';
import { adminCard, adminSecondaryButton, CopyButton } from './partnerAdminUi';

/**
 * Shown exactly once after issuing or resetting a login: the temporary
 * password can't be fetched again (a lost one is replaced with a reset).
 */
export default function CredentialReveal({
  credential,
  brandName,
  recipientName,
  recipientEmail,
  title = 'Login issued',
}: {
  credential: IssuedCredential;
  brandName: string;
  recipientName: string;
  recipientEmail: string;
  title?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const expiresLabel = `${formatDateTime(credential.expiresAt)} IST`;
  const invite = buildInviteMessage({
    brandName,
    recipientName,
    userId: credential.userId,
    temporaryPassword: credential.temporaryPassword,
    loginUrl: credential.loginUrl,
    expiresLabel,
  });
  const mailto = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(invite.subject)}&body=${encodeURIComponent(invite.body)}`;

  return (
    <section aria-labelledby="credential-title" className={`${adminCard} border-profile p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-md bg-profile-tint text-profile">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="credential-title" className="font-display text-lg font-bold text-ink">
              {title}
            </h2>
            <p className="text-sm text-ink-muted">
              For {recipientName} at {brandName}
            </p>
          </div>
        </div>
        {PARTNER_PORTAL_CONFIG.useDummyData ? <DemoTag /> : null}
      </div>

      <p className="mt-4 flex gap-2 rounded-md border border-warn bg-warn-tint px-3 py-2 text-sm text-ink">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-warn" aria-hidden="true" />
        This temporary password is shown only now. If it’s lost, reset the login to issue a new one.
      </p>

      <dl className="mt-4 divide-y divide-line rounded-md border border-line">
        <Row label="Sign-in page">
          <a href={credential.loginUrl} target="_blank" rel="noreferrer" className="break-all font-mono text-sm text-profile hover:underline">
            {credential.loginUrl}
          </a>
          <CopyButton value={credential.loginUrl} />
        </Row>
        <Row label="User ID">
          <span className="font-mono text-sm font-semibold text-ink">{credential.userId}</span>
          <CopyButton value={credential.userId} />
        </Row>
        <Row label="Temporary password">
          <span className="font-mono text-sm font-semibold tracking-wide text-ink" aria-live="polite">
            {showPassword ? credential.temporaryPassword : '••••-••••-••••'}
          </span>
          <span className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-line px-3 text-xs font-semibold text-ink hover:bg-surface-2"
            >
              {showPassword ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
              {showPassword ? 'Hide' : 'Show'}
            </button>
            <CopyButton value={credential.temporaryPassword} />
          </span>
        </Row>
        <Row label="Works until">
          <span className="text-sm text-ink">{expiresLabel}</span>
          <span className="text-xs text-ink-muted">They set their own password at first sign-in.</span>
        </Row>
      </dl>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Delivery</p>
        {credential.dispatch.length === 0 ? (
          <p className="mt-1 text-sm text-ink">Nothing was sent. Share the invite below with {recipientName.split(' ')[0]}.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {credential.dispatch.map((item) => (
              <li
                key={`${item.channel}-${item.to}`}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  item.status === 'queued' ? 'bg-ok-tint text-ok' : 'bg-down-tint text-down'
                }`}
              >
                {item.channel === 'email' ? <MailCheck className="h-3.5 w-3.5" aria-hidden="true" /> : <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />}
                {item.channel === 'email' ? 'Email' : 'SMS'} {item.status === 'queued' ? 'queued to' : 'failed for'}{' '}
                {item.channel === 'sms' ? formatIndianMobile(item.to) : item.to}
              </li>
            ))}
          </ul>
        )}
        {PARTNER_PORTAL_CONFIG.useDummyData && credential.dispatch.length > 0 ? (
          <p className="mt-2 text-xs text-ink-muted">Demo: nothing actually leaves this browser.</p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <CopyButton value={`${invite.subject}\n\n${invite.body}`} label="Copy invite message" className={adminSecondaryButton} />
        <a href={mailto} className={adminSecondaryButton}>
          <Mail className="h-4 w-4" aria-hidden="true" />
          Open email draft
        </a>
      </div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted sm:w-40 sm:flex-none">{label}</dt>
      <dd className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">{children}</dd>
    </div>
  );
}
