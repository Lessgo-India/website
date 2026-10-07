'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AlertTriangle, Check, Copy, KeyRound, Loader2, PlayCircle, PlugZap, RefreshCw, Rocket, Save } from 'lucide-react';
import {
  BOOKING_METHOD_DETAILS,
  BOOKING_PRODUCT_DETAILS,
  CHANNEL_DETAILS,
  type OnlineChannel,
} from '@web/lib/partner/channels';
import { PARTNER_PORTAL_CONFIG, partnerApiBaseUrl } from '@web/lib/partner/config';
import { DEVELOPER_CREDENTIAL_DETAILS } from '@web/lib/partner/developerCredentials';
import { formatDate, formatRelative } from '@web/lib/partner/format';
import {
  getDeveloperCredentials,
  getPartnerIntegrations,
  requestIntegrationGoLive,
  rotateDeveloperCredential,
  runIntegrationTest,
  saveBookingIntegration,
  saveCheckoutIntegration,
} from '@web/lib/partner/partnerApi';
import type {
  BookingAuthType,
  BookingIntegration,
  CheckoutIntegration,
  DeveloperCredentials,
  DeveloperCredentialType,
  IntegrationStatus,
  IntegrationTestRun,
  RevealedCredential,
} from '@web/lib/partner/types';
import IntegrationTestResult from './IntegrationTestResult';
import { useSignedInPartner } from './PartnerSessionProvider';
import {
  Card,
  ConfirmDialog,
  DemoTag,
  ErrorNote,
  hintClass,
  inputClass,
  IntegrationStatusBadge,
  labelClass,
  LoadingBlock,
  PageHeader,
  primaryButtonClass,
  secondaryButtonClass,
} from './ui';
import { usePartnerQuery } from './usePartnerQuery';

/**
 * Online partners connect here: their checkout calls the Lessgo Partner API
 * (online checkout codes), or Lessgo calls their booking API (bookings).
 * Each connection passes sandbox checks, then Lessgo approves go-live.
 */
export default function PartnerIntegrations() {
  const session = useSignedInPartner();
  const query = usePartnerQuery(() => getPartnerIntegrations(session), `${session.partner.id}:integrations`);
  const data = query.data;

  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Connect your checkout or booking API so groups can use Lessgo coupons online. Lessgo approves each connection before real groups use it."
        actions={PARTNER_PORTAL_CONFIG.useDummyData ? <DemoTag /> : undefined}
      />
      {query.error ? <ErrorNote message={query.error} onRetry={query.reload} /> : null}
      {!data ? (
        query.loading ? <LoadingBlock /> : null
      ) : (
        <div className="space-y-6">
          {data.checkout ? <CheckoutPanel integration={data.checkout} website={data.website} onChanged={query.reload} /> : null}
          {data.booking ? <BookingPanel integration={data.booking} onChanged={query.reload} /> : null}
          {data.checkout || data.booking ? (
            <DeveloperCredentialsCard checkout={!!data.checkout} bookings={!!data.booking} />
          ) : null}
          <WebhookCard partnerId={session.partner.id} orders={!!data.checkout} bookings={!!data.booking} />
        </div>
      )}
    </div>
  );
}

// ── Shared pieces ───────────────────────────────────────────────────────────

function GoLiveSteps({ status, lastTest }: { status: IntegrationStatus; lastTest?: IntegrationTestRun }) {
  const steps = [
    { label: 'Connect', done: status !== 'not_connected' },
    { label: 'Pass sandbox checks', done: status === 'live' || status === 'ready_for_review' || !!lastTest?.ok },
    { label: 'Ask to go live', done: status === 'ready_for_review' || status === 'live' },
    { label: 'Lessgo approves', done: status === 'live' },
  ];
  return (
    <ol className="mb-5 grid gap-2 sm:grid-cols-4" aria-label="Go-live progress">
      {steps.map((step, index) => (
        <li
          key={step.label}
          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
            step.done ? 'border-ok bg-ok-tint text-ink' : 'border-line text-ink-muted'
          }`}
        >
          <span
            className={`flex h-5 w-5 flex-none items-center justify-center rounded-full text-[11px] font-bold ${
              step.done ? 'bg-ok text-white' : 'bg-surface-2 text-ink-muted'
            }`}
            aria-hidden="true"
          >
            {step.done ? <Check className="h-3 w-3" /> : index + 1}
          </span>
          <span className="font-semibold">{step.label}</span>
          <span className="sr-only">{step.done ? '(done)' : '(to do)'}</span>
        </li>
      ))}
    </ol>
  );
}

/** Sandbox run + go-live request, shared by both channels. */
function TestAndGoLive({
  channel,
  integration,
  onChanged,
}: {
  channel: OnlineChannel;
  integration: CheckoutIntegration | BookingIntegration;
  onChanged: () => void;
}) {
  const session = useSignedInPartner();
  const [busy, setBusy] = useState<'test' | 'go-live' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<IntegrationTestRun | null>(null);
  const shown = run ?? integration.lastTest ?? null;
  const canRequest =
    integration.status === 'testing' && !!shown?.ok && shown.environment === 'sandbox';

  async function test() {
    setBusy('test');
    setError(null);
    try {
      setRun(await runIntegrationTest(session, channel));
      onChanged();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function requestGoLive() {
    setBusy('go-live');
    setError(null);
    try {
      await requestIntegrationGoLive(session, channel);
      onChanged();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-md border border-line bg-bg-elev p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={test}
          disabled={busy !== null || integration.status === 'not_connected'}
          title={integration.status === 'not_connected' ? 'Save the connection first' : undefined}
          className={secondaryButtonClass}
        >
          {busy === 'test' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <PlayCircle className="h-4 w-4" aria-hidden="true" />}
          {integration.status === 'live' ? 'Run live health check' : 'Run sandbox checks'}
        </button>
        {integration.status !== 'live' && integration.status !== 'ready_for_review' ? (
          <button type="button" onClick={requestGoLive} disabled={busy !== null || !canRequest} className={primaryButtonClass}>
            {busy === 'go-live' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Rocket className="h-4 w-4" aria-hidden="true" />}
            Ask Lessgo to go live
          </button>
        ) : null}
      </div>
      {integration.status === 'ready_for_review' ? (
        <p className="mt-3 text-sm text-ink">
          Lessgo is reviewing your connection
          {integration.goLiveRequestedAt ? ` (asked ${formatRelative(integration.goLiveRequestedAt)})` : ''}. Campaigns on this channel can be
          approved once it’s live.
        </p>
      ) : null}
      {integration.status === 'live' && integration.liveSince ? (
        <p className="mt-3 text-sm text-ink">Live since {formatRelative(integration.liveSince)}. Changes to a live connection go through Lessgo.</p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-down">
          {error}
        </p>
      ) : null}
      {shown ? (
        <div className="mt-4" aria-live="polite">
          <IntegrationTestResult run={shown} />
        </div>
      ) : (
        <p className={`${hintClass} mt-3`}>No checks run yet.</p>
      )}
    </div>
  );
}

function Code({ children, wrap = false }: { children: ReactNode; wrap?: boolean }) {
  return (
    <pre
      className={`overflow-x-auto rounded-md bg-ink px-4 py-3 font-mono text-[12px] leading-relaxed text-bg ${
        wrap ? 'whitespace-pre-wrap [overflow-wrap:anywhere]' : ''
      }`}
    >
      <code>{children}</code>
    </pre>
  );
}

function SubHeading({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-ink-muted">{children}</h3>;
}

// ── Online checkout code ────────────────────────────────────────────────────

function CheckoutPanel({
  integration,
  website,
  onChanged,
}: {
  integration: CheckoutIntegration;
  website?: string;
  onChanged: () => void;
}) {
  const session = useSignedInPartner();
  const [domains, setDomains] = useState(integration.allowedDomains.join(', '));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const live = integration.status === 'live';
  const base = partnerApiBaseUrl();

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await saveCheckoutIntegration(session, {
        allowedDomains: domains.split(/[\s,]+/).filter(Boolean),
      });
      setSaved(true);
      onChanged();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true">{CHANNEL_DETAILS.online_code.emoji}</span> Online checkout
        </span>
      }
      action={<IntegrationStatusBadge status={integration.status} />}
    >
      <p className="mb-4 text-sm text-ink-muted">{CHANNEL_DETAILS.online_code.summary}</p>
      <GoLiveSteps status={integration.status} lastTest={integration.lastTest} />

      <form onSubmit={save} noValidate className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <label htmlFor="checkout-domains" className={labelClass}>
            Checkout domains
          </label>
          <input
            id="checkout-domains"
            value={domains}
            onChange={(event) => setDomains(event.target.value)}
            disabled={live}
            placeholder="shop.example.com, m.shop.example.com"
            className={inputClass}
          />
          <p className={hintClass}>
            On {website ?? 'your website'}. Lessgo only opens links on these domains, and your Partner API key only works for checkouts there.
          </p>
        </div>
        <button type="submit" disabled={busy || live} className={secondaryButtonClass}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
          Save domains
        </button>
      </form>
      {error ? (
        <p role="alert" className="mt-2 text-sm font-medium text-down">
          {error}
        </p>
      ) : saved ? (
        <p className="mt-2 text-sm text-ok">Saved. Run the sandbox checks next.</p>
      ) : null}

      <SubHeading>Partner API keys</SubHeading>
      <p className="text-sm text-ink-muted">
        Your sandbox and live keys and the signing secret are under <span className="font-semibold text-ink">Developer credentials</span>{' '}
        below. Keep them on your servers — never in your app or website code.
      </p>

      <SubHeading>What your checkout calls</SubHeading>
      <Code>
        {`POST ${base}/partner-api/v1/vouchers/validate
Authorization: Bearer lgp_test_…
X-Lessgo-Timestamp: 1767254400
X-Lessgo-Signature: v1=<hex HMAC-SHA256(secret, "<timestamp>.<raw body>")>

{ "code": "STC-7KQ4-M2XD-R", "order_value_minor": 364000,
  "currency": "INR", "platform": "web" }
→ 200 { "valid": true, "discount_minor": 50000,
        "reservation_id": "rsv_…", "expires_at": "…" }

POST ${base}/partner-api/v1/vouchers/redeem    (Idempotency-Key)
{ "reservation_id": "rsv_…", "order_ref": "STC-ORD-58213",
  "order_value_minor": 364000, "discount_minor": 50000 }

POST ${base}/partner-api/v1/vouchers/reverse   (cancellation / refund)
{ "order_ref": "STC-ORD-58213", "reason": "refund" }`}
      </Code>
      <p className={hintClass}>
        Validation holds the code for 15 minutes. Support <span className="font-mono">?coupon={'{code}'}</span> on your cart so “Shop” in the
        Lessgo app opens with the code already applied.
      </p>

      <SubHeading>Checks & go-live</SubHeading>
      {/* Remount when the stored run or status changes, so a run cleared by a save isn't shown from local state. */}
      <TestAndGoLive
        key={`${integration.status}:${integration.lastTest?.at ?? 'none'}`}
        channel="online_code"
        integration={integration}
        onChanged={onChanged}
      />
    </Card>
  );
}

// ── Developer credentials ───────────────────────────────────────────────────

const CREDENTIAL_ORDER: readonly DeveloperCredentialType[] = ['test_key', 'live_key', 'signing_secret'];

const CREDENTIAL_FIELD: Record<DeveloperCredentialType, 'testKey' | 'liveKey' | 'signingSecret'> = {
  test_key: 'testKey',
  live_key: 'liveKey',
  signing_secret: 'signingSecret',
};

function signingExample(base: string): string {
  return [
    `POST ${base}/partner-api/v1/vouchers/validate`,
    'Authorization: Bearer <your lgp_test_… or lgp_live_… key>',
    'Content-Type: application/json',
    'X-Lessgo-Timestamp: <unix seconds>',
    'X-Lessgo-Signature: v1=<hex HMAC_SHA256(signing secret, timestamp + "." + raw body)>',
    '',
    '// Node.js',
    "const body = JSON.stringify({ code, order_value_minor, currency: 'INR', platform: 'web' });",
    'const timestamp = Math.floor(Date.now() / 1000).toString();',
    'const signature = crypto',
    "  .createHmac('sha256', process.env.LESSGO_SIGNING_SECRET)",
    '  .update(`${timestamp}.${body}`)',
    "  .digest('hex');",
    '',
    `await fetch('${base}/partner-api/v1/vouchers/validate', {`,
    "  method: 'POST',",
    '  headers: {',
    '    Authorization: `Bearer ${process.env.LESSGO_API_KEY}`,',
    "    'Content-Type': 'application/json',",
    "    'X-Lessgo-Timestamp': timestamp,",
    "    'X-Lessgo-Signature': `v1=${signature}`,",
    '  },',
    '  body,',
    '});',
  ].join('\n');
}

/** How a booking partner signs the booking.* events it sends Lessgo. */
function bookingWebhookExample(base: string, partnerId: string): string {
  return [
    `POST ${base}/webhooks/offers/${partnerId}`,
    'Content-Type: application/json',
    'X-Lessgo-Timestamp: <unix seconds>',
    'X-Lessgo-Delivery-Id: <unique per event; reuse it when you retry>',
    'X-Lessgo-Signature: v1=<hex HMAC_SHA256(signing secret, timestamp + "." + raw body)>',
    '',
    '{ "type": "booking.confirmed", "booking_id": "bk_…", "quote_id": "qt_…",',
    '  "coupon_code": "SHW-7KQ4-M2XD-R", "units": 4, "subtotal_minor": 152000,',
    '  "fees_minor": 12000, "discount_minor": 30000, "paid_minor": 134000,',
    '  "occurred_at": "2026-10-08T18:30:00Z" }',
    '',
    '// Node.js',
    "const body = JSON.stringify({ type: 'booking.confirmed', booking_id, quote_id, coupon_code,",
    '  units, subtotal_minor, fees_minor, discount_minor, paid_minor, occurred_at });',
    'const timestamp = Math.floor(Date.now() / 1000).toString();',
    'const signature = crypto',
    "  .createHmac('sha256', process.env.LESSGO_SIGNING_SECRET)",
    '  .update(`${timestamp}.${body}`)',
    "  .digest('hex');",
    '',
    `await fetch('${base}/webhooks/offers/${partnerId}', {`,
    "  method: 'POST',",
    '  headers: {',
    "    'Content-Type': 'application/json',",
    "    'X-Lessgo-Timestamp': timestamp,",
    "    'X-Lessgo-Delivery-Id': deliveryId, // e.g. crypto.randomUUID(), stored with the event",
    "    'X-Lessgo-Signature': `v1=${signature}`,",
    '  },',
    '  body,',
    '});',
  ].join('\n');
}

/**
 * Owners of online partners generate their credentials here: the signing
 * secret for every online channel, plus the Partner API keys for online
 * checkout. Lessgo keeps only previews, so a new value is shown exactly once —
 * in this component's state, gone as soon as the page is left.
 */
function DeveloperCredentialsCard({ checkout, bookings }: { checkout: boolean; bookings: boolean }) {
  const session = useSignedInPartner();
  const query = usePartnerQuery(() => getDeveloperCredentials(session), `${session.partner.id}:developer-credentials`);
  const data = query.data;
  const [confirming, setConfirming] = useState<DeveloperCredentialType | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<{ credential: RevealedCredential; replaced: boolean } | null>(null);

  // Also forget the value if the browser keeps this page in its back/forward cache.
  useEffect(() => {
    const forget = () => setRevealed(null);
    window.addEventListener('pagehide', forget);
    return () => window.removeEventListener('pagehide', forget);
  }, []);

  const replacing = (type: DeveloperCredentialType | null, current: DeveloperCredentials | null) =>
    !!type && !!current?.[CREDENTIAL_FIELD[type]];

  async function generate(type: DeveloperCredentialType) {
    const replaced = replacing(type, data);
    setBusy(true);
    setError(null);
    setRevealed(null);
    try {
      setRevealed({ credential: await rotateDeveloperCredential(session, type), replaced });
      query.reload();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  }

  const confirmingLabel = confirming ? DEVELOPER_CREDENTIAL_DETAILS[confirming].label.toLowerCase() : '';
  const confirmingReplaces = replacing(confirming, data);
  // API keys exist only for online checkout; booking partners just sign their webhooks.
  const rows = CREDENTIAL_ORDER.filter((type) => checkout || type === 'signing_secret');
  const base = partnerApiBaseUrl();

  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-ink-muted" aria-hidden="true" /> Developer credentials
        </span>
      }
      action={PARTNER_PORTAL_CONFIG.useDummyData ? <DemoTag /> : undefined}
    >
      <p className="mb-4 text-sm text-ink-muted">
        {checkout && bookings
          ? 'Your servers use these to call the Partner API and to sign the booking webhooks they send Lessgo.'
          : checkout
            ? 'Your checkout’s servers use these to call the Partner API.'
            : 'Your servers sign the booking webhooks they send Lessgo with this secret.'}{' '}
        Lessgo stores only a fingerprint, so {checkout ? 'each value is' : 'it’s'} shown once — if {checkout ? 'one is' : 'it’s'}{' '}
        lost or exposed, generate a new one.
      </p>

      {revealed ? (
        <RevealedCredentialPanel
          credential={revealed.credential}
          replaced={revealed.replaced}
          onDone={() => setRevealed(null)}
        />
      ) : null}
      {query.error ? <ErrorNote message={query.error} onRetry={query.reload} /> : null}
      {!data ? (
        query.loading ? (
          <p className="flex items-center gap-2 text-sm text-ink-muted" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading credentials…
          </p>
        ) : null
      ) : (
        <ul className="divide-y divide-line rounded-md border border-line">
          {rows.map((type) => {
            const detail = DEVELOPER_CREDENTIAL_DETAILS[type];
            const summary = data[CREDENTIAL_FIELD[type]];
            const waitingForLive = type === 'live_key' && !data.liveAvailable;
            const purpose =
              type === 'signing_secret' && !checkout
                ? 'Signs the booking webhooks you send to Lessgo (HMAC-SHA256).'
                : detail.summary;
            return (
              <li key={type} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{detail.label}</p>
                  {summary ? (
                    <p className="mt-0.5 break-all font-mono text-[13px] text-ink">{summary.preview}</p>
                  ) : (
                    <p className="mt-0.5 text-sm text-ink-muted">Not generated yet</p>
                  )}
                  <p className={hintClass}>
                    {summary ? `Created ${formatDate(summary.createdAt)} · ` : ''}
                    {waitingForLive ? 'Live keys work once Lessgo approves your checkout for production.' : purpose}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirming(type)}
                  disabled={busy || waitingForLive}
                  className={`${secondaryButtonClass} flex-none self-start sm:self-auto`}
                >
                  {busy && confirming === type ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  )}
                  {summary ? 'Generate new' : 'Generate'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-down">
          {error}
        </p>
      ) : null}

      {checkout ? (
        <>
          <SubHeading>Signing a request</SubHeading>
          <Code wrap>{signingExample(base)}</Code>
          <p className={hintClass}>
            Sign the exact bytes you send, with the timestamp in seconds. Lessgo rejects signatures more than 5 minutes old. Webhooks
            you send to Lessgo are signed the same way.
          </p>
        </>
      ) : null}
      {bookings ? (
        <>
          <SubHeading>Signing a booking webhook</SubHeading>
          <Code wrap>{bookingWebhookExample(base, session.partner.id)}</Code>
          <p className={hintClass}>
            Sign the exact bytes you send, with the timestamp in seconds. Lessgo rejects signatures more than 5 minutes old and ignores
            a delivery ID it has already processed. booking.failed, booking.cancelled and booking.refunded are signed the same way.
          </p>
        </>
      ) : null}

      <ConfirmDialog
        open={confirming !== null}
        title={`Generate a new ${confirmingLabel}?`}
        body={
          confirmingReplaces
            ? 'The current value stops working immediately, so update your servers right away. The new value is shown only once.'
            : 'The new value is shown only once, so have your server configuration ready.'
        }
        confirmLabel={confirmingReplaces ? 'Generate new' : 'Generate'}
        cancelLabel={confirmingReplaces ? 'Keep the current one' : 'Cancel'}
        busy={busy}
        destructive={confirmingReplaces}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming) void generate(confirming);
        }}
      />
    </Card>
  );
}

function RevealedCredentialPanel({
  credential,
  replaced,
  onDone,
}: {
  credential: RevealedCredential;
  replaced: boolean;
  onDone: () => void;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const { label } = DEVELOPER_CREDENTIAL_DETAILS[credential.type];

  // Take keyboard and screen-reader users straight to the value.
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <section
      ref={panelRef}
      tabIndex={-1}
      aria-labelledby="revealed-credential-title"
      className="mb-5 rounded-md border border-warn bg-warn-tint p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-profile"
    >
      <h3 id="revealed-credential-title" className="flex items-start gap-2 text-sm font-bold text-ink">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-warn" aria-hidden="true" />
        Your new {label.toLowerCase()} — you won’t see this again
      </h3>
      <p className="mt-1 text-sm text-ink">
        Copy it into your server configuration now.{replaced ? ' The previous one has stopped working.' : ''} Lessgo keeps only{' '}
        <span className="break-all font-mono">{credential.preview}</span>.
      </p>
      <p className="mt-3 break-all rounded-md border border-line bg-surface px-3 py-2.5 font-mono text-[13px] leading-relaxed text-ink">
        {credential.value}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <CopyValueButton value={credential.value} />
        <button type="button" onClick={onDone} className={secondaryButtonClass}>
          I’ve saved it
        </button>
      </div>
    </section>
  );
}

function CopyValueButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // No async clipboard outside secure contexts (e.g. plain http on a LAN address).
      const area = document.createElement('textarea');
      area.value = value;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
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
    <button type="button" onClick={copy} className={primaryButtonClass}>
      {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}

// ── Booking API ─────────────────────────────────────────────────────────────

const CONNECT_ENDPOINTS: readonly { call: string; does: string }[] = [
  { call: 'GET /lessgo/v1/inventory?product=&city=&date=&quantity=', does: 'Shows/stays/seats for the group’s date and city, with unit prices.' },
  { call: 'POST /lessgo/v1/quotes', does: 'Prices the booking with the Lessgo coupon applied; holds it for 10 minutes.' },
  { call: 'POST /lessgo/v1/bookings', does: 'Creates the booking as pending_payment and returns your hosted checkout URL.' },
  { call: 'GET /lessgo/v1/bookings/:id', does: 'Booking status (Lessgo polls until confirmed, failed or cancelled).' },
  { call: 'POST /lessgo/v1/bookings/:id/cancel', does: 'Cancels a booking Lessgo made (e.g. the event was deleted before payment).' },
];

function BookingPanel({ integration, onChanged }: { integration: BookingIntegration; onChanged: () => void }) {
  const session = useSignedInPartner();
  const [sandboxBaseUrl, setSandboxBaseUrl] = useState(integration.sandboxBaseUrl ?? '');
  const [liveBaseUrl, setLiveBaseUrl] = useState(integration.liveBaseUrl ?? '');
  const [auth, setAuth] = useState<BookingAuthType>(integration.auth);
  const [clientId, setClientId] = useState(integration.clientId ?? '');
  const [clientSecret, setClientSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const live = integration.status === 'live';

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await saveBookingIntegration(session, {
        sandboxBaseUrl,
        ...(liveBaseUrl.trim() ? { liveBaseUrl } : {}),
        auth,
        clientId,
        ...(clientSecret.trim() ? { clientSecret } : {}),
      });
      setClientSecret('');
      setSaved(true);
      onChanged();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true">{CHANNEL_DETAILS.api_booking.emoji}</span> Bookings via API
        </span>
      }
      action={<IntegrationStatusBadge status={integration.status} />}
    >
      <p className="mb-1 text-sm text-ink-muted">{CHANNEL_DETAILS.api_booking.summary}</p>
      <p className="mb-4 text-sm text-ink">
        <span className="font-semibold">{BOOKING_METHOD_DETAILS[integration.method].label}</span> ·{' '}
        {integration.products.map((product) => BOOKING_PRODUCT_DETAILS[product].label).join(', ')}
      </p>
      <GoLiveSteps status={integration.status} lastTest={integration.lastTest} />

      <form onSubmit={save} noValidate className="grid gap-4 md:grid-cols-2">
        <Field id="booking-sandbox" label="Sandbox base URL">
          <input
            id="booking-sandbox"
            type="url"
            value={sandboxBaseUrl}
            onChange={(event) => setSandboxBaseUrl(event.target.value)}
            disabled={live}
            placeholder="https://sandbox.api.example.com/lessgo"
            className={inputClass}
          />
        </Field>
        <Field id="booking-live" label="Production base URL" hint="Lessgo switches to it only after go-live.">
          <input
            id="booking-live"
            type="url"
            value={liveBaseUrl}
            onChange={(event) => setLiveBaseUrl(event.target.value)}
            disabled={live}
            placeholder="https://api.example.com/lessgo"
            className={inputClass}
          />
        </Field>
        <fieldset className="md:col-span-2">
          <legend className={labelClass}>How Lessgo authenticates</legend>
          <div className="flex flex-wrap gap-4">
            {(['oauth2_client_credentials', 'api_key'] as const).map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="radio"
                  name="booking-auth"
                  checked={auth === option}
                  onChange={() => setAuth(option)}
                  disabled={live}
                  className="h-4 w-4 accent-[var(--profile)]"
                />
                {option === 'api_key' ? 'API key' : 'OAuth 2 client credentials'}
              </label>
            ))}
          </div>
        </fieldset>
        <Field id="booking-client" label={auth === 'api_key' ? 'Key ID' : 'Client ID'}>
          <input
            id="booking-client"
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
            disabled={live}
            autoComplete="off"
            className={`${inputClass} font-mono`}
          />
        </Field>
        <Field
          id="booking-secret"
          label={auth === 'api_key' ? 'API key' : 'Client secret'}
          hint={
            integration.secretPreview
              ? `Saved (${integration.secretPreview}). Leave blank to keep it.`
              : 'Stored encrypted; Lessgo never shows it again.'
          }
        >
          <input
            id="booking-secret"
            type="password"
            value={clientSecret}
            onChange={(event) => setClientSecret(event.target.value)}
            disabled={live}
            autoComplete="new-password"
            className={`${inputClass} font-mono`}
          />
        </Field>
        <div className="flex flex-wrap items-center gap-3 md:col-span-2">
          <button type="submit" disabled={busy || live} className={secondaryButtonClass}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <PlugZap className="h-4 w-4" aria-hidden="true" />}
            Save connection
          </button>
          {error ? (
            <p role="alert" className="text-sm font-medium text-down">
              {error}
            </p>
          ) : saved ? (
            <p className="text-sm text-ok">Saved. Run the sandbox checks next.</p>
          ) : null}
        </div>
      </form>

      <SubHeading>{integration.method === 'lessgo_connect' ? 'Endpoints you implement' : 'Your existing API'}</SubHeading>
      {integration.method === 'lessgo_connect' ? (
        <ul className="divide-y divide-line rounded-md border border-line">
          {CONNECT_ENDPOINTS.map((endpoint) => (
            <li key={endpoint.call} className="px-4 py-2.5 text-sm">
              <span className="block break-all font-mono text-[12px] font-semibold text-ink">{endpoint.call}</span>
              <span className="text-ink-muted">{endpoint.does}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-muted">
          Lessgo maintains an adapter to your existing booking API, so there’s nothing new to build. Your partner manager confirms the
          mapping; the sandbox checks below run through it.
        </p>
      )}
      <p className={hintClass}>
        Groups always pay on your hosted checkout — you stay the merchant of record and Lessgo never handles payments. Lessgo shares only
        the booker’s name and mobile, with their consent, to issue tickets.
      </p>

      <SubHeading>Checks & go-live</SubHeading>
      <TestAndGoLive
        key={`${integration.status}:${integration.lastTest?.at ?? 'none'}`}
        channel="api_booking"
        integration={integration}
        onChanged={onChanged}
      />
    </Card>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
      {hint ? <p className={hintClass}>{hint}</p> : null}
    </div>
  );
}

// ── Webhooks ────────────────────────────────────────────────────────────────

const ORDER_EVENTS = `order.placed       { code, order_ref, platform, order_value_minor, discount_minor, occurred_at }   (own code pools)
order.cancelled    { code, order_ref, reason, occurred_at }`;

const BOOKING_EVENTS = `booking.confirmed  { booking_id, quote_id, coupon_code, units, subtotal_minor, fees_minor,
                     discount_minor, paid_minor, occurred_at }
booking.failed     { booking_id, reason, occurred_at }
booking.cancelled  { booking_id, reason, occurred_at }
booking.refunded   { booking_id, refund_minor, occurred_at }`;

function WebhookCard({ partnerId, orders, bookings }: { partnerId: string; orders: boolean; bookings: boolean }) {
  const base = partnerApiBaseUrl();
  const events = [bookings ? BOOKING_EVENTS : null, orders ? ORDER_EVENTS : null].filter(Boolean).join('\n');
  return (
    <Card title="Events you send to Lessgo">
      <p className="mb-3 text-sm text-ink-muted">
        Sign each request with your signing secret (Developer credentials above). Lessgo rejects timestamps more than 5 minutes old and
        ignores repeated delivery IDs.
      </p>
      <Code>
        {`POST ${base}/webhooks/offers/${partnerId}
X-Lessgo-Timestamp · X-Lessgo-Delivery-Id · X-Lessgo-Signature: v1=…

${events}`}
      </Code>
    </Card>
  );
}
