'use client';

import { useState, type FormEvent } from 'react';
import { CheckCircle2, KeyRound, Loader2, RotateCcw, Send, Webhook } from 'lucide-react';
import { PARTNER_PORTAL_CONFIG, PARTNER_SUPPORT_EMAIL } from '@web/lib/partner/config';
import { formatDate, formatDateTime, formatRelative } from '@web/lib/partner/format';
import { changePartnerPassword, listPartnerTeam, resetPartnerDemo, sendTestWebhook } from '@web/lib/partner/partnerApi';
import { CHANNEL_DETAILS } from '@web/lib/partner/channels';
import { can, newPasswordProblem } from '@web/lib/partner/rules';
import type { PartnerRole } from '@web/lib/partner/types';
import { useSignedInPartner } from './PartnerSessionProvider';
import {
  BrandAvatar,
  Card,
  ChannelBadge,
  DemoTag,
  ErrorNote,
  inputClass,
  labelClass,
  PageHeader,
  primaryButtonClass,
  secondaryButtonClass,
} from './ui';
import { usePartnerQuery } from './usePartnerQuery';

const ROLE_LABEL: Record<PartnerRole, string> = { owner: 'Owner', manager: 'Manager', cashier: 'Counter staff' };
const PLAN_LABEL = { pilot: 'Pilot', standard: 'Standard', enterprise: 'Enterprise' } as const;

const SAMPLE_WEBHOOK = `POST <your webhook URL>
X-Lessgo-Signature: t=1760000000,v1=<hex HMAC-SHA256>

{
  "type": "voucher.redeemed",
  "id": "evt_01J9Z…",
  "created_at": "2026-10-07T13:45:00Z",
  "data": {
    "voucher_code": "RLH-0GQ8-C6ZG-Y",
    "campaign_id": "cmp_reel_house_metro",
    "outlet_id": "out_rlh_koramangala",
    "bill_minor": 190000,
    "discount_minor": 15000,
    "group_size": 4
  }
}`;

export default function PartnerSettings() {
  const session = useSignedInPartner();
  const { partner, user } = session;
  const showTeam = user.role !== 'cashier';
  const team = usePartnerQuery(() => (showTeam ? listPartnerTeam(session) : Promise.resolve([])), `${partner.id}:${showTeam}`);

  return (
    <>
      <PageHeader title="Settings" description="Your business profile, login and integrations." />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Business profile">
          <div className="mb-4 flex items-center gap-3">
            <BrandAvatar partner={partner} size={48} />
            <div>
              <p className="font-display text-lg font-bold text-ink">{partner.brandName}</p>
              <p className="text-sm text-ink-muted">{partner.legalName}</p>
            </div>
          </div>
          <dl className="space-y-2.5 text-sm">
            <Row label="Partner ID">
              <span className="font-mono">{partner.id}</span>
            </Row>
            <Row label="Category">{partner.category}</Row>
            <Row label="Groups redeem">
              <span className="flex flex-wrap gap-1">
                {partner.channels.map((channel) => (
                  <ChannelBadge key={channel} channel={channel} />
                ))}
              </span>
              <span className="mt-1 block text-xs text-ink-muted">
                {partner.channels.map((channel) => CHANNEL_DETAILS[channel].confirmation).join(' · ')}. Lessgo sets this up; ask
                {` ${PARTNER_SUPPORT_EMAIL}`} to change it.
              </span>
            </Row>
            {partner.website ? (
              <Row label="Website">
                <span className="break-all">{partner.website}</span>
              </Row>
            ) : null}
            <Row label="GSTIN">
              <span className="font-mono">{partner.gstin}</span>
            </Row>
            <Row label="Contact">
              {partner.contactName}
              <span className="block text-xs text-ink-muted">{partner.contactEmail}</span>
            </Row>
            <Row label="City">{partner.city}</Row>
            <Row label="Plan">{PLAN_LABEL[partner.plan]}</Row>
            <Row label="Partner since">{formatDate(partner.onboardedAt)}</Row>
          </dl>
          <p className="mt-4 text-xs text-ink-muted">
            To change these details, email{' '}
            <a className="font-semibold text-ink hover:underline" href={`mailto:${PARTNER_SUPPORT_EMAIL}`}>
              {PARTNER_SUPPORT_EMAIL}
            </a>
            .
          </p>
        </Card>

        <Card title="Your login">
          <dl className="space-y-2.5 text-sm">
            <Row label="User ID">
              <span className="font-mono">{user.userId}</span>
            </Row>
            <Row label="Name">{user.name}</Row>
            <Row label="Role">{ROLE_LABEL[user.role]}</Row>
            <Row label="Signed in">{formatDateTime(session.signedInAt)}</Row>
            <Row label="Session ends">{formatDateTime(new Date(session.expiresAt).toISOString())}</Row>
          </dl>
          <ChangePassword />
        </Card>

        {showTeam ? (
          <Card title="Team logins">
            {team.error ? <ErrorNote message={team.error} onRetry={team.reload} /> : null}
            <ul className="divide-y divide-line">
              {(team.data ?? []).map((member) => (
                <li key={member.userId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink">
                      {member.name}
                      {member.userId === user.userId ? <span className="ml-2 text-xs font-normal text-ink-muted">(you)</span> : null}
                    </span>
                    <span className="block font-mono text-xs text-ink-muted">{member.userId}</span>
                  </span>
                  <span className="flex-none text-right">
                    <span className="block text-xs font-semibold text-ink">{ROLE_LABEL[member.role]}</span>
                    <span className="block text-xs text-ink-muted">
                      {member.status === 'disabled'
                        ? 'Turned off by Lessgo'
                        : member.mustChangePassword
                          ? 'Invite pending'
                          : member.lastSignInAt
                            ? `Active ${formatRelative(member.lastSignInAt)}`
                            : 'Never signed in'}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-ink-muted">
              New logins (for example a cashier for a new outlet) are issued by Lessgo — email {PARTNER_SUPPORT_EMAIL} with the name,
              role and outlet. {/* TODO(backend): self-serve invites via POST /api/partner/team. */}
            </p>
          </Card>
        ) : null}

        {/* POS redemption + webhooks are for in-store partners; online ones use the Integrations page. */}
        {can(user.role, 'integrations') && partner.channels.includes('in_store') ? <Integrations /> : null}

        {PARTNER_PORTAL_CONFIG.useDummyData ? <DemoReset /> : null}
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="min-w-0 break-words text-ink">{children}</dd>
    </div>
  );
}

function ChangePassword() {
  const session = useSignedInPartner();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const problem = newPasswordProblem(next, { userId: session.user.userId, previous: current });
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    try {
      await changePartnerPassword(session, current, next);
      setDone(true);
      setOpen(false);
      setCurrent('');
      setNext('');
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setOpen(true)} className={secondaryButtonClass}>
          <KeyRound className="h-4 w-4" aria-hidden="true" />
          Change password
        </button>
        {done ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-ok">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Password updated
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-3 border-t border-line pt-5">
      <div>
        <label htmlFor="current-password" className={labelClass}>
          Current password
        </label>
        <input id="current-password" type="password" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} className={inputClass} />
      </div>
      <div>
        <label htmlFor="next-password" className={labelClass}>
          New password
        </label>
        <input id="next-password" type="password" autoComplete="new-password" value={next} onChange={(event) => setNext(event.target.value)} className={inputClass} />
      </div>
      {error ? <p role="alert" className="text-sm font-medium text-down">{error}</p> : null}
      <div className="flex gap-3">
        <button type="submit" disabled={busy} className={primaryButtonClass}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Update password
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={busy} className={secondaryButtonClass}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Integrations() {
  const session = useSignedInPartner();
  const { integration } = session.partner;
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function test() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const response = await sendTestWebhook(session);
      setResult(`Delivered — HTTP ${response.status} in ${response.latencyMs} ms.`);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="POS & webhook integration" className="xl:col-span-2">
      <p className="text-sm text-ink-muted">
        Optional, for chains with their own billing system: redeem through the API from your POS and get a signed webhook for
        every redemption. The console above keeps working alongside it.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <dl className="space-y-2.5 text-sm">
          <Row label="API key">
            <span className="font-mono">{integration.apiKeyPreview}</span>
          </Row>
          <Row label="Webhook URL">
            {integration.webhookUrl ? <span className="font-mono text-xs">{integration.webhookUrl}</span> : <span className="text-ink-muted">Not set</span>}
          </Row>
          <Row label="Signing secret">
            {integration.webhookSecretPreview ? <span className="font-mono">{integration.webhookSecretPreview}</span> : <span className="text-ink-muted">—</span>}
          </Row>
          <div className="pt-2">
            <button type="button" onClick={test} disabled={busy} className={secondaryButtonClass}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
              Send test event
            </button>
            {result ? <p className="mt-2 text-sm text-ok">{result}</p> : null}
            {error ? <p className="mt-2 text-sm text-down">{error}</p> : null}
          </div>
          <p className="text-xs text-ink-muted">
            Keys and webhook URLs are issued by Lessgo for now. {/* TODO(backend): rotate key / edit webhook via /api/partner/integrations. */}
          </p>
        </dl>
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <Webhook className="h-3.5 w-3.5" aria-hidden="true" /> Example event
          </p>
          <pre className="overflow-x-auto rounded-md bg-brand-night p-4 font-mono text-[11px] leading-relaxed text-white/85">{SAMPLE_WEBHOOK}</pre>
        </div>
      </div>
    </Card>
  );
}

function DemoReset() {
  const [busy, setBusy] = useState(false);
  return (
    <Card title="Demo data" action={<DemoTag />}>
      <p className="text-sm text-ink-muted">
        Everything here is dummy data kept in your browser and shared with the admin console’s Partners section. Resetting puts
        every partner, login, campaign and redemption back to the demo start (partners onboarded in the admin console go too).
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await resetPartnerDemo();
          window.location.reload();
        }}
        className={`${secondaryButtonClass} mt-4`}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RotateCcw className="h-4 w-4" aria-hidden="true" />}
        Reset demo data
      </button>
    </Card>
  );
}
