'use client';

import { useState, type FormEvent } from 'react';
import { BadgeCheck, CircleX, Loader2, Mail, MapPin, Store } from 'lucide-react';
import { approvePartnerApplication, rejectPartnerApplication } from '@web/lib/adminPartnersApi';
import { formatDate, formatRelative } from '@web/lib/partner/format';
import { stateName } from '@web/lib/partner/indiaGeo';
import { handleProblem, PLAN_DETAILS } from '@web/lib/partner/onboarding';
import type {
  PartnerApplication,
  PartnerApplicationApprovalResult,
  PartnerPlan,
} from '@web/lib/partner/types';
import CredentialReveal from './CredentialReveal';
import {
  adminCard,
  adminInput,
  adminLabel,
  adminPrimaryButton,
  adminSecondaryButton,
  FieldError,
} from './partnerAdminUi';
import { ChannelBadge } from '@ui/partner/ui';

export default function PartnerApplicationReviewCard({
  application,
  onReviewed,
}: {
  application: PartnerApplication;
  onReviewed: () => void;
}) {
  const [handle, setHandle] = useState(application.handle);
  const [plan, setPlan] = useState<PartnerPlan>('pilot');
  const [logoEmoji, setLogoEmoji] = useState('🏷️');
  const [brandColor, setBrandColor] = useState('#22D3C5');
  const [sendEmail, setSendEmail] = useState(true);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PartnerApplicationApprovalResult | null>(null);
  const handleError = handleProblem(handle);

  async function approve(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (handleError) {
      setError(handleError);
      return;
    }
    setBusy('approve');
    try {
      setResult(
        await approvePartnerApplication(application.id, {
          handle,
          logoEmoji,
          brandColor,
          plan,
          dispatch: { email: sendEmail },
        }),
      );
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    setError(null);
    if (reason.trim().length < 5) {
      setError('Add a short reason for rejecting the application.');
      return;
    }
    setBusy('reject');
    try {
      await rejectPartnerApplication(application.id, reason.trim());
      onReviewed();
    } catch (caught) {
      setError((caught as Error).message);
      setBusy(null);
    }
  }

  if (result) {
    return (
      <article className={`${adminCard} space-y-4 border-ok p-5`}>
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-full bg-ok-tint text-ok">
            <BadgeCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-bold text-ink">{result.partner.brandName} is approved</h3>
            <p className="mt-1 text-sm text-ink-muted">
              The partner and owner login were created. The account stays invited until the owner sets a password.
            </p>
          </div>
        </div>
        {result.credential ? (
          <CredentialReveal
            credential={result.credential}
            brandName={result.partner.brandName}
            recipientName={application.contactName}
            recipientEmail={application.contactEmail}
            title="Owner login issued"
          />
        ) : (
          <p className="rounded-md bg-ok-tint px-3 py-2 text-sm text-ink">
            This approval was already completed. The original welcome email and credentials were not sent again.
          </p>
        )}
        <button type="button" onClick={onReviewed} className={adminPrimaryButton}>
          Done
        </button>
      </article>
    );
  }

  return (
    <article className={`${adminCard} p-5`}>
      <div className="flex flex-wrap items-start gap-3">
        <span
          className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-md text-xl"
          style={{ backgroundColor: `${brandColor}22`, border: `1px solid ${brandColor}66` }}
          aria-hidden="true"
        >
          {logoEmoji || '🏷️'}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-bold text-ink">{application.brandName}</h3>
          <p className="text-sm text-ink-muted">{application.legalName}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {application.channels.map((channel) => (
              <ChannelBadge key={channel} channel={channel} />
            ))}
          </div>
        </div>
        <p className="text-right text-xs text-ink-muted">
          Applied {formatRelative(application.submittedAt)}
          <span className="block">{formatDate(application.submittedAt)}</span>
        </p>
      </div>

      <dl className="mt-4 grid gap-3 rounded-md bg-bg-elev p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-ink-muted">Business</dt>
          <dd className="mt-1 flex items-center gap-1.5 font-medium text-ink">
            <Store className="h-3.5 w-3.5 text-profile" aria-hidden="true" />
            {application.category} · {application.gstin}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Location</dt>
          <dd className="mt-1 flex items-center gap-1.5 font-medium text-ink">
            <MapPin className="h-3.5 w-3.5 text-groups" aria-hidden="true" />
            {application.city}, {stateName(application.stateCode)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Primary contact</dt>
          <dd className="mt-1 font-medium text-ink">{application.contactName}</dd>
          <dd className="break-all text-xs text-ink-muted">{application.contactEmail} · {application.contactPhone}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Website</dt>
          <dd className="mt-1 break-all font-medium text-ink">{application.website || 'In-store only'}</dd>
        </div>
      </dl>

      <form onSubmit={approve} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label>
          <span className={adminLabel}>User-ID prefix</span>
          <input
            value={handle}
            onChange={(event) => setHandle(event.target.value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16))}
            className={`${adminInput} font-mono`}
            aria-invalid={!!handleError}
            aria-describedby={handleError ? 'application-handle-error' : undefined}
          />
          <FieldError id="application-handle-error" message={handleError ?? undefined} />
        </label>
        <label>
          <span className={adminLabel}>Plan</span>
          <select value={plan} onChange={(event) => setPlan(event.target.value as PartnerPlan)} className={adminInput}>
            {(Object.keys(PLAN_DETAILS) as PartnerPlan[]).map((option) => (
              <option key={option} value={option}>{PLAN_DETAILS[option].label}</option>
            ))}
          </select>
        </label>
        <label>
          <span className={adminLabel}>Brand marker</span>
          <input value={logoEmoji} onChange={(event) => setLogoEmoji(event.target.value.slice(0, 8))} className={adminInput} />
        </label>
        <label>
          <span className={adminLabel}>Brand colour</span>
          <span className="flex items-center gap-2">
            <input type="color" value={brandColor} onChange={(event) => setBrandColor(event.target.value.toUpperCase())} className="h-11 w-14 rounded-md border border-line bg-surface p-1" />
            <input value={brandColor} onChange={(event) => setBrandColor(event.target.value.toUpperCase().slice(0, 7))} className={`${adminInput} font-mono uppercase`} />
          </span>
        </label>

        <label className="flex min-h-11 items-center gap-2 text-sm text-ink sm:col-span-2">
          <input type="checkbox" checked={sendEmail} onChange={(event) => setSendEmail(event.target.checked)} className="h-4 w-4 accent-[var(--profile)]" />
          <Mail className="h-4 w-4 text-profile" aria-hidden="true" />
          Send the welcome email with account details
        </label>
        {error ? <p role="alert" className="text-sm font-medium text-down sm:col-span-2">{error}</p> : null}
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button type="submit" disabled={busy !== null} className={adminPrimaryButton}>
            {busy === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <BadgeCheck className="h-4 w-4" aria-hidden="true" />}
            {sendEmail ? 'Approve & send welcome email' : 'Approve & create account'}
          </button>
          <button type="button" disabled={busy !== null} onClick={() => setRejecting((value) => !value)} className={adminSecondaryButton}>
            <CircleX className="h-4 w-4" aria-hidden="true" /> Reject
          </button>
        </div>
      </form>

      {rejecting ? (
        <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3 sm:flex-row">
          <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason for rejection" className={adminInput} />
          <button type="button" disabled={busy !== null} onClick={reject} className={adminSecondaryButton}>
            {busy === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Confirm rejection
          </button>
        </div>
      ) : null}
    </article>
  );
}
