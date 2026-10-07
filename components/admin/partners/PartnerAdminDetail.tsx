'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  History,
  KeyRound,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  UserCheck,
  UserPlus,
  UserX,
} from 'lucide-react';
import AdminConfirmDialog from '@ui/admin/AdminConfirmDialog';
import { BrandAvatar, ChannelBadge, StatusPill } from '@ui/partner/ui';
import { usePartnerQuery } from '@ui/partner/usePartnerQuery';
import {
  addPartnerLogin,
  getAdminPartner,
  resetPartnerLoginPassword,
  setPartnerLoginStatus,
  setPartnerStatus,
} from '@web/lib/adminPartnersApi';
import { redeemedNoun } from '@web/lib/partner/channels';
import { partnerLoginUrl } from '@web/lib/partner/config';
import { formatDate, formatDateTime, formatRelative, isPast } from '@web/lib/partner/format';
import { describeDistrict, stateName } from '@web/lib/partner/indiaGeo';
import {
  baseUserId,
  formatIndianMobile,
  isValidEmail,
  isValidIndianMobile,
  PLAN_DETAILS,
  ROLE_DETAILS,
  uniqueUserId,
} from '@web/lib/partner/onboarding';
import { rolesFor } from '@web/lib/partner/rules';
import type {
  AdminPartnerDetail,
  IssuedCredential,
  PartnerAuditEntry,
  PartnerLogin,
  PartnerRole,
} from '@web/lib/partner/types';
import CampaignReviewCard from './CampaignReviewCard';
import CredentialReveal from './CredentialReveal';
import PartnerChannelsCard from './PartnerChannelsCard';
import {
  adminCard,
  adminDangerButton,
  adminHint,
  adminInput,
  adminLabel,
  adminPrimaryButton,
  adminSecondaryButton,
  adminSmallButton,
  LoginStateBadge,
  PartnerStatusBadge,
  SectionHeading,
  useAdminActor,
} from './partnerAdminUi';

interface Issued {
  credential: IssuedCredential;
  name: string;
  email: string;
  title: string;
}

export default function PartnerAdminDetail({ partnerId }: { partnerId: string }) {
  const actor = useAdminActor();
  const query = usePartnerQuery(() => getAdminPartner(partnerId), partnerId);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (query.error && !query.data) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-down bg-down-tint px-4 py-3 text-sm text-ink">
          {query.error}
          <button type="button" onClick={query.reload} className={adminSecondaryButton}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
          </button>
        </p>
      </div>
    );
  }
  if (!query.data) return <p className="text-sm text-ink-muted">Loading…</p>;

  const detail = query.data;
  const { partner } = detail;
  const owner = detail.logins.find((login) => login.role === 'owner');
  const inReview = detail.campaigns.filter((campaign) => campaign.status === 'in_review');

  function showIssued(next: Issued) {
    setIssued(next);
    setNotice(null);
    query.reload();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="space-y-6">
      <BackLink />

      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
        <div className="flex items-center gap-4">
          <BrandAvatar partner={partner} size={56} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{partner.brandName}</h1>
              <PartnerStatusBadge status={partner.status} />
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              {PLAN_DETAILS[partner.plan].label} plan · logins <span className="font-mono">{partner.handle}.*</span> · partner since{' '}
              {formatDate(partner.onboardedAt)}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {partner.channels.map((channel) => (
                <ChannelBadge key={channel} channel={channel} />
              ))}
            </div>
          </div>
        </div>
        <StatusControls detail={detail} actor={actor} onChanged={(message) => { setNotice(message); query.reload(); }} />
      </header>

      <div className="space-y-3" aria-live="polite">
        {notice ? <p className="rounded-md border border-ok bg-ok-tint px-4 py-3 text-sm text-ink">{notice}</p> : null}
        {partner.status === 'invited' && owner ? (
          <Banner tone="warn" title="Waiting for the owner’s first sign-in">
            {owner.temporaryExpiresAt && isPast(owner.temporaryExpiresAt)
              ? `The temporary password for ${owner.userId} expired ${formatRelative(owner.temporaryExpiresAt)}. Reset the login to send a new one.`
              : `${owner.userId} has a temporary password${
                  owner.temporaryExpiresAt ? ` until ${formatDateTime(owner.temporaryExpiresAt)}` : ''
                }. Reset the login if they lost it.`}
          </Banner>
        ) : null}
        {partner.status === 'suspended' ? (
          <Banner tone="down" title={`Suspended ${partner.suspendedAt ? formatRelative(partner.suspendedAt) : ''}`}>
            {partner.suspendedReason} Logins are blocked and their offers are out of the Vibes tray; vouchers already claimed
            still need honouring.
          </Banner>
        ) : null}
      </div>

      {issued ? (
        <CredentialReveal
          // A fresh mount per credential, so each new password starts hidden.
          key={`${issued.credential.userId}:${issued.credential.expiresAt}`}
          credential={issued.credential}
          brandName={partner.brandName}
          recipientName={issued.name}
          recipientEmail={issued.email}
          title={issued.title}
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <PartnerChannelsCard detail={detail} actor={actor} onChanged={(message) => { setNotice(message); query.reload(); }} />

          <LoginsSection detail={detail} actor={actor} onIssued={showIssued} onChanged={(message) => { setNotice(message); query.reload(); }} />

          {inReview.length ? (
            <section aria-labelledby="partner-review-heading">
              <SectionHeading>
                <span id="partner-review-heading">Waiting for review</span>
              </SectionHeading>
              <div className="space-y-4">
                {inReview.map((campaign) => (
                  <CampaignReviewCard
                    key={campaign.id}
                    item={{ campaign, partner }}
                    showPartner={false}
                    onReviewed={(updated) => {
                      setNotice(updated.status === 'rejected' ? `Sent “${updated.headline}” back to ${partner.brandName}.` : `Approved “${updated.headline}”.`);
                      query.reload();
                    }}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section aria-labelledby="partner-campaigns-heading" className={`${adminCard} p-5`}>
            <SectionHeading>
              <span id="partner-campaigns-heading">Campaigns</span>
            </SectionHeading>
            {detail.campaigns.length === 0 ? (
              <p className="text-sm text-ink-muted">None yet. Campaigns the partner submits from their portal appear here.</p>
            ) : (
              <ul className="divide-y divide-line">
                {detail.campaigns.map((campaign) => (
                  <li key={campaign.id} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-extrabold tracking-wide text-ink">{campaign.offer.label}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{campaign.headline}</span>
                      <span className="block text-xs text-ink-muted">
                        {formatDate(campaign.schedule.startAt)} – {formatDate(campaign.schedule.endAt)} ·{' '}
                        {campaign.stats.redeemed.toLocaleString('en-IN')} {redeemedNoun(campaign.channel, campaign.stats.redeemed)}
                      </span>
                    </span>
                    {partner.channels.length > 1 ? <ChannelBadge channel={campaign.channel} /> : null}
                    <StatusPill status={campaign.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {partner.channels.includes('in_store') || detail.outlets.length > 0 ? (
          <section aria-labelledby="partner-outlets-heading" className={`${adminCard} p-5`}>
            <SectionHeading>
              <span id="partner-outlets-heading">Outlets</span>
            </SectionHeading>
            {detail.outlets.length === 0 ? (
              <p className="text-sm text-ink-muted">None yet. The partner adds outlets in their portal; cashier logins need one.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {detail.outlets.map((outlet) => (
                  <li key={outlet.id} className="flex gap-2.5 text-sm">
                    <MapPin className={`mt-0.5 h-4 w-4 flex-none ${outlet.status === 'active' ? 'text-events' : 'text-ink-faint'}`} aria-hidden="true" />
                    <span>
                      <span className="block font-semibold text-ink">
                        {outlet.name}
                        {outlet.status === 'paused' ? <span className="ml-2 text-xs font-normal text-warn">paused</span> : null}
                      </span>
                      <span className="block text-xs text-ink-muted">
                        {outlet.address} · {outlet.pincode} · {describeDistrict(outlet.districtId)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          ) : null}
        </div>

        <aside className="space-y-6">
          <section aria-labelledby="partner-business-heading" className={`${adminCard} p-5`}>
            <SectionHeading>
              <span id="partner-business-heading">Business</span>
            </SectionHeading>
            <dl className="space-y-2.5 text-sm">
              <Row label="Legal name">{partner.legalName}</Row>
              <Row label="GSTIN">
                <span className="font-mono">{partner.gstin}</span>
              </Row>
              <Row label="Category">{partner.category}</Row>
              {partner.website ? (
                <Row label="Website">
                  <span className="break-all">{partner.website}</span>
                </Row>
              ) : null}
              <Row label="Location">
                {partner.city}, {stateName(partner.stateCode)}
              </Row>
              <Row label="Contact">
                {partner.contactName}
                <span className="block text-xs text-ink-muted">{partner.contactEmail}</span>
                <span className="block text-xs text-ink-muted">{formatIndianMobile(partner.contactPhone)}</span>
              </Row>
              <Row label="API key">
                <span className="font-mono text-xs">{partner.integration.apiKeyPreview}</span>
              </Row>
              {partner.integration.webhookUrl ? (
                <Row label="Webhook">
                  <span className="break-all font-mono text-xs">{partner.integration.webhookUrl}</span>
                </Row>
              ) : null}
            </dl>
            <a href={partnerLoginUrl()} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-profile hover:underline">
              Partner sign-in page <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </section>

          <section aria-labelledby="partner-activity-heading" className={`${adminCard} p-5`}>
            <SectionHeading>
              <span id="partner-activity-heading" className="inline-flex items-center gap-2">
                <History className="h-4 w-4 text-ink-muted" aria-hidden="true" /> Activity
              </span>
            </SectionHeading>
            <ActivityList entries={detail.activity} />
          </section>
        </aside>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/admin/partners" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Partners
    </Link>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="min-w-0 break-words text-ink">{children}</dd>
    </div>
  );
}

function Banner({ tone, title, children }: { tone: 'warn' | 'down'; title: string; children: React.ReactNode }) {
  return (
    <div role="status" className={`flex gap-3 rounded-md border px-4 py-3 text-sm text-ink ${tone === 'warn' ? 'border-warn bg-warn-tint' : 'border-down bg-down-tint'}`}>
      <AlertTriangle className={`mt-0.5 h-4 w-4 flex-none ${tone === 'warn' ? 'text-warn' : 'text-down'}`} aria-hidden="true" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-ink-muted">{children}</p>
      </div>
    </div>
  );
}

function StatusControls({
  detail,
  actor,
  onChanged,
}: {
  detail: AdminPartnerDetail;
  actor: string;
  onChanged: (message: string) => void;
}) {
  const { partner } = detail;
  const [suspending, setSuspending] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply(change: { status: 'suspended'; reason: string } | { status: 'active' }) {
    setBusy(true);
    setError(null);
    try {
      const updated = await setPartnerStatus(partner.id, change, { actor });
      setSuspending(false);
      setReactivating(false);
      setReason('');
      onChanged(updated.status === 'suspended' ? `${partner.brandName} is suspended.` : `${partner.brandName} is ${updated.status} again.`);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (partner.status === 'suspended') {
    return (
      <div className="flex flex-col items-end gap-2">
        <button type="button" onClick={() => setReactivating(true)} className={adminSecondaryButton}>
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Reactivate
        </button>
        {error ? <p className="text-sm text-down">{error}</p> : null}
        <AdminConfirmDialog
          open={reactivating}
          title={`Reactivate ${partner.brandName}?`}
          body="Their logins work again and approved campaigns return to the Vibes tray."
          confirmLabel="Reactivate"
          busy={busy}
          onCancel={() => setReactivating(false)}
          onConfirm={() => apply({ status: 'active' })}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm sm:w-auto">
      {suspending ? (
        <div className={`${adminCard} p-4`}>
          <label htmlFor="suspend-reason" className={adminLabel}>
            Why suspend {partner.brandName}?
          </label>
          <textarea
            id="suspend-reason"
            rows={2}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. Outlets refusing valid vouchers — investigating."
            className={`${adminInput} py-2`}
          />
          <p className={adminHint}>Logins stop working and offers leave the tray straight away.</p>
          {error ? <p role="alert" className="mt-2 text-sm text-down">{error}</p> : null}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => apply({ status: 'suspended', reason })} disabled={busy || reason.trim().length < 5} className={adminDangerButton}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldOff className="h-4 w-4" aria-hidden="true" />}
              Suspend
            </button>
            <button type="button" onClick={() => setSuspending(false)} disabled={busy} className={adminSecondaryButton}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setSuspending(true)} className={adminDangerButton}>
          <ShieldOff className="h-4 w-4" aria-hidden="true" />
          Suspend partner
        </button>
      )}
    </div>
  );
}

function LoginsSection({
  detail,
  actor,
  onIssued,
  onChanged,
}: {
  detail: AdminPartnerDetail;
  actor: string;
  onIssued: (issued: Issued) => void;
  onChanged: (message: string) => void;
}) {
  const { partner, logins } = detail;
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState<string | null>(null);
  const [turningOff, setTurningOff] = useState<PartnerLogin | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const suspended = partner.status === 'suspended';

  async function toggle(login: PartnerLogin, status: PartnerLogin['status']) {
    setBusy(login.userId);
    setError(null);
    try {
      await setPartnerLoginStatus(partner.id, login.userId, status, { actor });
      setTurningOff(null);
      onChanged(status === 'disabled' ? `Turned off ${login.userId}. Any open session ended.` : `Turned on ${login.userId}.`);
    } catch (caught) {
      setError((caught as Error).message);
      setTurningOff(null);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="partner-logins-heading" className={`${adminCard} p-5`}>
      <SectionHeading
        action={
          !adding ? (
            <button type="button" onClick={() => setAdding(true)} disabled={suspended} className={adminSecondaryButton} title={suspended ? 'Reactivate the partner first' : undefined}>
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Add login
            </button>
          ) : null
        }
      >
        <span id="partner-logins-heading">Logins</span>
      </SectionHeading>

      {adding ? (
        <AddLoginForm
          detail={detail}
          actor={actor}
          onCancel={() => setAdding(false)}
          onIssued={(issued) => {
            setAdding(false);
            onIssued(issued);
          }}
        />
      ) : null}

      {error ? (
        <p role="alert" className="mb-3 rounded-md border border-down bg-down-tint px-3 py-2 text-sm text-ink">
          {error}
        </p>
      ) : null}

      <ul className="divide-y divide-line">
        {logins.map((login) => (
          <li key={login.userId} className="py-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-ink">{login.userId}</span>
                  <LoginStateBadge login={login} />
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {login.name} · {ROLE_DETAILS[login.role].label}
                  {login.outletId ? ` · ${detail.outlets.find((outlet) => outlet.id === login.outletId)?.name ?? 'outlet'}` : ''} ·{' '}
                  {login.email}
                  {login.phone ? ` · ${formatIndianMobile(login.phone)}` : ''}
                </p>
                <p className="text-xs text-ink-muted">
                  {login.lastSignInAt ? `Last signed in ${formatRelative(login.lastSignInAt)}` : 'Never signed in'}
                  {login.mustChangePassword && login.temporaryExpiresAt ? ` · temporary password until ${formatDateTime(login.temporaryExpiresAt)}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setResetting(resetting === login.userId ? null : login.userId)}
                  disabled={suspended || login.status === 'disabled' || busy !== null}
                  className={adminSmallButton}
                  title={login.status === 'disabled' ? 'Turn the login on first' : undefined}
                >
                  <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                  {login.mustChangePassword ? 'Resend invite' : 'Reset password'}
                </button>
                {login.status === 'active' ? (
                  <button type="button" onClick={() => setTurningOff(login)} disabled={busy !== null} className={adminSmallButton}>
                    <UserX className="h-3.5 w-3.5" aria-hidden="true" />
                    Turn off
                  </button>
                ) : (
                  <button type="button" onClick={() => toggle(login, 'active')} disabled={busy !== null} className={adminSmallButton}>
                    {busy === login.userId ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />}
                    Turn on
                  </button>
                )}
              </div>
            </div>
            {resetting === login.userId ? (
              <ResetPanel
                login={login}
                onCancel={() => setResetting(null)}
                onReset={async (dispatch) => {
                  const credential = await resetPartnerLoginPassword(partner.id, login.userId, dispatch, { actor });
                  setResetting(null);
                  onIssued({
                    credential,
                    name: login.name,
                    email: login.email,
                    title: login.mustChangePassword ? 'New invite issued' : 'Password reset',
                  });
                }}
              />
            ) : null}
          </li>
        ))}
      </ul>

      <AdminConfirmDialog
        open={turningOff !== null}
        title={`Turn off ${turningOff?.userId ?? ''}?`}
        body="They’re signed out at once and can’t sign in until the login is turned back on."
        confirmLabel="Turn off"
        destructive
        busy={busy !== null}
        onCancel={() => setTurningOff(null)}
        onConfirm={() => turningOff && toggle(turningOff, 'disabled')}
      />
    </section>
  );
}

function ResetPanel({
  login,
  onCancel,
  onReset,
}: {
  login: PartnerLogin;
  onCancel: () => void;
  /** Delivery goes to the email and mobile stored on the login. */
  onReset: (dispatch: { email: boolean; sms: boolean }) => Promise<void>;
}) {
  const [email, setEmail] = useState(true);
  const [sms, setSms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onReset({ email, sms: sms && !!login.phone });
    } catch (caught) {
      setError((caught as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-md border border-line bg-bg-elev p-4">
      <p className="text-sm text-ink">
        A new temporary password replaces the current one and signs <span className="font-mono">{login.userId}</span> out everywhere.
      </p>
      <div className="mt-3 space-y-1.5">
        <label className="flex items-center gap-2.5 text-sm text-ink">
          <input type="checkbox" checked={email} onChange={(event) => setEmail(event.target.checked)} className="h-4 w-4 accent-[var(--profile)]" />
          Email it to {login.email}
        </label>
        {login.phone ? (
          <label className="flex items-center gap-2.5 text-sm text-ink">
            <input type="checkbox" checked={sms} onChange={(event) => setSms(event.target.checked)} className="h-4 w-4 accent-[var(--profile)]" />
            Text it to {formatIndianMobile(login.phone)}
          </label>
        ) : (
          <p className="text-xs text-ink-muted">No mobile on file for this login, so it can’t be texted.</p>
        )}
      </div>
      {error ? <p role="alert" className="mt-2 text-sm text-down">{error}</p> : null}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={confirm} disabled={busy} className={adminPrimaryButton}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <KeyRound className="h-4 w-4" aria-hidden="true" />}
          Issue new password
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className={adminSecondaryButton}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function AddLoginForm({
  detail,
  actor,
  onCancel,
  onIssued,
}: {
  detail: AdminPartnerDetail;
  actor: string;
  onCancel: () => void;
  onIssued: (issued: Issued) => void;
}) {
  const { partner } = detail;
  const activeOutlets = detail.outlets.filter((outlet) => outlet.status === 'active');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<PartnerRole>('manager');
  const [outletId, setOutletId] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roles = rolesFor(partner.channels);
  const outlet = activeOutlets.find((candidate) => candidate.id === outletId);
  const preview = uniqueUserId(baseUserId(partner.handle, role, outlet?.name), new Set(detail.logins.map((login) => login.userId)));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (name.trim().length < 2) return setError('Add the person’s name.');
    if (!isValidEmail(email)) return setError('Enter a valid email address.');
    if (role === 'cashier' && !outlet) return setError('Pick the outlet this cashier works at.');
    if ((sendSms || phone.trim()) && !isValidIndianMobile(phone)) {
      return setError(sendSms ? 'Enter a 10-digit Indian mobile number to send the SMS.' : 'Enter a 10-digit Indian mobile number.');
    }
    setBusy(true);
    try {
      const { login, credential } = await addPartnerLogin(
        partner.id,
        { name, email, ...(phone.trim() ? { phone } : {}), role, ...(outlet ? { outletId: outlet.id } : {}), dispatch: { email: sendEmail, sms: sendSms } },
        { actor },
      );
      onIssued({ credential, name: login.name, email: login.email, title: `${ROLE_DETAILS[login.role].label} login issued` });
    } catch (caught) {
      setError((caught as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mb-5 rounded-md border border-line bg-bg-elev p-4">
      <fieldset>
        <legend className={adminLabel}>Role</legend>
        <div className={`grid gap-2 ${roles.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {roles.map((option) => (
            <label key={option} className={`flex cursor-pointer gap-2.5 rounded-md border px-3 py-2.5 ${role === option ? 'border-profile bg-profile-tint' : 'border-line bg-surface hover:bg-surface-2'}`}>
              <input type="radio" name="login-role" checked={role === option} onChange={() => setRole(option)} className="mt-0.5 h-4 w-4 accent-[var(--profile)]" />
              <span>
                <span className="block text-sm font-semibold text-ink">{ROLE_DETAILS[option].label}</span>
                <span className="block text-xs text-ink-muted">{ROLE_DETAILS[option].summary}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {role === 'cashier' ? (
        <div className="mt-4">
          <label htmlFor="login-outlet" className={adminLabel}>
            Outlet
          </label>
          {activeOutlets.length === 0 ? (
            <p className="text-sm text-ink-muted">This partner has no active outlets yet. They add outlets in their portal.</p>
          ) : (
            <select id="login-outlet" value={outletId} onChange={(event) => setOutletId(event.target.value)} className={adminInput}>
              <option value="">Choose…</option>
              {activeOutlets.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </select>
          )}
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="login-name" className={adminLabel}>
            Name
          </label>
          <input id="login-name" value={name} onChange={(event) => setName(event.target.value)} className={adminInput} />
        </div>
        <div>
          <label htmlFor="login-email" className={adminLabel}>
            Email
          </label>
          <input id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={adminInput} />
        </div>
        <div>
          <label htmlFor="login-phone" className={adminLabel}>
            Mobile <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <input id="login-phone" type="tel" inputMode="numeric" value={phone} onChange={(event) => setPhone(event.target.value)} className={adminInput} />
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <label className="flex items-center gap-2.5 text-sm text-ink">
          <input type="checkbox" checked={sendEmail} onChange={(event) => setSendEmail(event.target.checked)} className="h-4 w-4 accent-[var(--profile)]" />
          Email the sign-in details
        </label>
        <label className="flex items-center gap-2.5 text-sm text-ink">
          <input type="checkbox" checked={sendSms} onChange={(event) => setSendSms(event.target.checked)} className="h-4 w-4 accent-[var(--profile)]" />
          Text them to the mobile number
        </label>
      </div>

      <p className="mt-3 text-sm text-ink-muted">
        They’ll sign in as <span className="font-mono font-semibold text-ink">{preview}</span>.
      </p>
      {error ? <p role="alert" className="mt-2 text-sm font-medium text-down">{error}</p> : null}
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={busy} className={adminPrimaryButton}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <UserPlus className="h-4 w-4" aria-hidden="true" />}
          Issue login
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className={adminSecondaryButton}>
          Cancel
        </button>
      </div>
    </form>
  );
}

const ACTION_LABEL: Record<PartnerAuditEntry['action'], string> = {
  'partner.onboarded': 'Onboarded',
  'partner.activated': 'Activated',
  'partner.suspended': 'Suspended',
  'partner.reactivated': 'Reactivated',
  'login.issued': 'Login issued',
  'login.reset': 'Password reset',
  'login.disabled': 'Login turned off',
  'login.enabled': 'Login turned on',
  'login.password_set': 'Password set',
  'campaign.submitted': 'Campaign submitted',
  'campaign.approved': 'Campaign approved',
  'campaign.rejected': 'Changes requested',
  'partner.channels_changed': 'Channels changed',
  'integration.updated': 'Integration updated',
  'integration.tested': 'Integration tested',
  'integration.go_live_requested': 'Go-live requested',
  'integration.approved': 'Go-live approved',
  'integration.rolled_back': 'Integration sent back',
  'integration.credentials_rotated': 'Credentials rotated',
};

function ActivityList({ entries }: { entries: PartnerAuditEntry[] }) {
  if (entries.length === 0) return <p className="text-sm text-ink-muted">No activity yet.</p>;
  return (
    <ol className="space-y-3">
      {entries.map((entry) => (
        <li key={entry.id} className="border-l-2 border-line-strong pl-3">
          <p className="text-xs text-ink-muted" title={formatDateTime(entry.at)}>
            {formatRelative(entry.at)} · {entry.actor}
          </p>
          <p className="text-sm font-semibold text-ink">{ACTION_LABEL[entry.action]}</p>
          <p className="text-xs text-ink-muted">{entry.detail}</p>
        </li>
      ))}
    </ol>
  );
}
