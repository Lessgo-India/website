'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, PlugZap, Power, Settings2, Undo2 } from 'lucide-react';
import AdminConfirmDialog from '@ui/admin/AdminConfirmDialog';
import IntegrationTestResult from '@ui/partner/IntegrationTestResult';
import { ChannelBadge, IntegrationStatusBadge } from '@ui/partner/ui';
import { approveIntegrationGoLive, rollbackIntegration, setPartnerChannels } from '@web/lib/adminPartnersApi';
import {
  BOOKING_METHOD_DETAILS,
  BOOKING_PRODUCT_DETAILS,
  BOOKING_PRODUCTS,
  CHANNEL_DETAILS,
  REDEMPTION_CHANNELS,
  type OnlineChannel,
} from '@web/lib/partner/channels';
import { formatRelative } from '@web/lib/partner/format';
import type {
  AdminPartnerDetail,
  BookingConnectMethod,
  BookingIntegration,
  BookingProduct,
  CheckoutIntegration,
  RedemptionChannel,
} from '@web/lib/partner/types';
import {
  adminCard,
  adminDangerButton,
  adminHint,
  adminInput,
  adminLabel,
  adminPrimaryButton,
  adminSecondaryButton,
  adminSmallButton,
  SectionHeading,
} from './partnerAdminUi';

/**
 * How the partner's groups redeem, and — for online channels — where the
 * integration stands. Admins approve go-live here, send a request back, or
 * take a live channel offline (its live campaigns pause).
 */
export default function PartnerChannelsCard({
  detail,
  actor,
  onChanged,
}: {
  detail: AdminPartnerDetail;
  actor: string;
  onChanged: (message: string) => void;
}) {
  const { partner } = detail;
  const [editing, setEditing] = useState(false);

  return (
    <section aria-labelledby="partner-channels-heading" className={`${adminCard} p-5`}>
      <SectionHeading
        action={
          !editing ? (
            <button type="button" onClick={() => setEditing(true)} className={adminSmallButton}>
              <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
              Change channels
            </button>
          ) : null
        }
      >
        <span id="partner-channels-heading">Channels & integrations</span>
      </SectionHeading>

      {editing ? (
        <ChannelsEditor
          detail={detail}
          actor={actor}
          onCancel={() => setEditing(false)}
          onSaved={(message) => {
            setEditing(false);
            onChanged(message);
          }}
        />
      ) : null}

      <ul className="space-y-3">
        {partner.channels.map((channel) => (
          <li key={channel} className="rounded-md border border-line p-4">
            {channel === 'in_store' ? (
              <InStoreRow detail={detail} />
            ) : (
              <OnlineRow detail={detail} channel={channel} actor={actor} onChanged={onChanged} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function InStoreRow({ detail }: { detail: AdminPartnerDetail }) {
  const active = detail.outlets.filter((outlet) => outlet.status === 'active').length;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ChannelBadge channel="in_store" />
      <p className="min-w-0 flex-1 text-sm text-ink-muted">
        {active} active outlet{active === 1 ? '' : 's'} · Redeem console
        {detail.partner.integration.webhookUrl ? ' + POS webhook' : ''}. Always on.
      </p>
    </div>
  );
}

function OnlineRow({
  detail,
  channel,
  actor,
  onChanged,
}: {
  detail: AdminPartnerDetail;
  channel: OnlineChannel;
  actor: string;
  onChanged: (message: string) => void;
}) {
  const { partner } = detail;
  const integration = channel === 'online_code' ? partner.integration.checkout : partner.integration.booking;
  const [approving, setApproving] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connection = CHANNEL_DETAILS[channel].connection;
  const liveCampaigns = detail.campaigns.filter((campaign) => campaign.channel === channel && campaign.status === 'live').length;

  if (!integration) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <ChannelBadge channel={channel} />
        <IntegrationStatusBadge status="not_connected" />
      </div>
    );
  }

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      await approveIntegrationGoLive(partner.id, channel, { actor });
      setApproving(false);
      onChanged(`${partner.brandName}’s ${connection} is live. Its campaigns can now be approved.`);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function rollback() {
    // Read before the call: in dummy mode the store object behind `integration` changes in place.
    const takingOffline = integration?.status === 'live';
    setBusy(true);
    setError(null);
    try {
      await rollbackIntegration(partner.id, channel, reason, { actor });
      setRollingBack(false);
      setReason('');
      onChanged(
        takingOffline
          ? `${partner.brandName}’s ${connection} is offline and back in testing.`
          : `Sent ${partner.brandName}’s go-live request back.`,
      );
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const wasLive = integration.status === 'live';

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <ChannelBadge channel={channel} />
        <IntegrationStatusBadge status={integration.status} />
        <span className="ml-auto text-xs text-ink-muted">
          {integration.liveSince
            ? `Live since ${formatRelative(integration.liveSince)}`
            : integration.goLiveRequestedAt
              ? `Go-live requested ${formatRelative(integration.goLiveRequestedAt)}`
              : integration.status === 'not_connected'
                ? 'Owner hasn’t set it up yet'
                : 'Partner is testing'}
        </span>
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {channel === 'online_code' ? (
          <CheckoutDetails integration={integration as CheckoutIntegration} website={partner.website} />
        ) : (
          <BookingDetails integration={integration as BookingIntegration} />
        )}
      </dl>

      {integration.lastTest ? (
        <div className="mt-3 rounded-md bg-bg-elev px-3 py-2.5">
          <IntegrationTestResult run={integration.lastTest} compact />
        </div>
      ) : (
        <p className="mt-3 text-xs text-ink-muted">No sandbox run yet.</p>
      )}

      {error ? (
        <p role="alert" className="mt-3 text-sm text-down">
          {error}
        </p>
      ) : null}

      {rollingBack ? (
        <div className="mt-3 rounded-md border border-line bg-bg-elev p-3">
          <label htmlFor={`rollback-${channel}`} className={adminLabel}>
            {wasLive ? `Why take the ${connection} offline?` : 'What should the partner fix?'}
          </label>
          <textarea
            id={`rollback-${channel}`}
            rows={2}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={wasLive ? 'e.g. Bookings failing since 14:00 — partner investigating.' : 'e.g. Webhook signatures fail on cancellations.'}
            className={`${adminInput} py-2`}
          />
          <p className={adminHint}>
            {wasLive
              ? `The channel goes back to testing${liveCampaigns ? ` and its ${liveCampaigns} live campaign${liveCampaigns === 1 ? '' : 's'} pause` : ''}. The partner sees the reason.`
              : 'The partner sees the reason and can run the checks again.'}
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={rollback} disabled={busy || reason.trim().length < 5} className={wasLive ? adminDangerButton : adminPrimaryButton}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : wasLive ? <Power className="h-4 w-4" aria-hidden="true" /> : <Undo2 className="h-4 w-4" aria-hidden="true" />}
              {wasLive ? 'Take offline' : 'Send back'}
            </button>
            <button type="button" onClick={() => setRollingBack(false)} disabled={busy} className={adminSecondaryButton}>
              Cancel
            </button>
          </div>
        </div>
      ) : integration.status === 'ready_for_review' ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setApproving(true)}
            disabled={busy || partner.status === 'suspended' || !integration.lastTest?.ok}
            className={adminPrimaryButton}
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Approve go-live
          </button>
          <button type="button" onClick={() => setRollingBack(true)} disabled={busy} className={adminSecondaryButton}>
            <Undo2 className="h-4 w-4" aria-hidden="true" />
            Send back
          </button>
        </div>
      ) : integration.status === 'live' ? (
        <div className="mt-3">
          <button type="button" onClick={() => setRollingBack(true)} disabled={busy} className={adminSmallButton}>
            <Power className="h-3.5 w-3.5" aria-hidden="true" />
            Take offline
          </button>
        </div>
      ) : null}

      <AdminConfirmDialog
        open={approving}
        title={`Approve ${partner.brandName}’s ${connection}?`}
        body={
          channel === 'online_code'
            ? 'Their production Partner API key is issued and their checkout can redeem real Lessgo codes. Online campaigns can then be approved.'
            : 'Lessgo starts calling their production booking API for real groups. Booking campaigns can then be approved.'
        }
        confirmLabel="Approve go-live"
        busy={busy}
        onCancel={() => setApproving(false)}
        onConfirm={approve}
      />
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="break-words text-ink">{children}</dd>
    </div>
  );
}

function CheckoutDetails({ integration, website }: { integration: CheckoutIntegration; website?: string }) {
  return (
    <>
      <Detail label="Website">{website ?? '—'}</Detail>
      <Detail label="Checkout domains">
        {integration.allowedDomains.length ? (
          <span className="font-mono text-xs">{integration.allowedDomains.join(', ')}</span>
        ) : (
          'None yet'
        )}
      </Detail>
      <Detail label="Sandbox key">
        <span className="font-mono text-xs">{integration.sandboxKeyPreview}</span>
      </Detail>
      <Detail label="Live key">
        <span className="font-mono text-xs">{integration.liveKeyPreview ?? 'Issued on approval'}</span>
      </Detail>
    </>
  );
}

function BookingDetails({ integration }: { integration: BookingIntegration }) {
  return (
    <>
      <Detail label="Connection">{BOOKING_METHOD_DETAILS[integration.method].label}</Detail>
      <Detail label="Sells">
        {integration.products.map((product) => BOOKING_PRODUCT_DETAILS[product].label).join(', ') || '—'}
      </Detail>
      <Detail label="Sandbox API">
        <span className="break-all font-mono text-xs">{integration.sandboxBaseUrl ?? 'Not set'}</span>
      </Detail>
      <Detail label="Production API">
        <span className="break-all font-mono text-xs">{integration.liveBaseUrl ?? 'Not set'}</span>
      </Detail>
      <Detail label="Auth">
        {integration.auth === 'api_key' ? 'API key' : 'OAuth 2 client credentials'}
        {integration.clientId ? <span className="block font-mono text-xs text-ink-muted">{integration.clientId}</span> : null}
      </Detail>
      <Detail label="Secret">
        <span className="font-mono text-xs">{integration.secretPreview ?? 'Not set'}</span>
      </Detail>
    </>
  );
}

function ChannelsEditor({
  detail,
  actor,
  onCancel,
  onSaved,
}: {
  detail: AdminPartnerDetail;
  actor: string;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const { partner } = detail;
  const [channels, setChannels] = useState<RedemptionChannel[]>(partner.channels);
  const [website, setWebsite] = useState(partner.website ?? '');
  const [products, setProducts] = useState<BookingProduct[]>(partner.integration.booking?.products ?? []);
  const [method, setMethod] = useState<BookingConnectMethod>(partner.integration.booking?.method ?? 'lessgo_connect');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const online = channels.some((channel) => channel !== 'in_store');

  const toggle = <T,>(list: readonly T[], value: T, order: readonly T[]) =>
    list.includes(value) ? list.filter((item) => item !== value) : order.filter((item) => item === value || list.includes(item));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const updated = await setPartnerChannels(
        partner.id,
        {
          channels,
          ...(website.trim() ? { website: website.trim() } : {}),
          ...(channels.includes('api_booking') ? { bookingProducts: products, bookingMethod: method } : {}),
        },
        { actor },
      );
      onSaved(`${partner.brandName} now redeems via ${updated.channels.map((channel) => CHANNEL_DETAILS[channel].label).join(' + ')}.`);
    } catch (caught) {
      setError((caught as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} noValidate className="mb-4 rounded-md border border-line bg-bg-elev p-4">
      <fieldset>
        <legend className={adminLabel}>Channels</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {REDEMPTION_CHANNELS.map((channel) => (
            <label
              key={channel}
              className={`flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2.5 text-sm font-semibold text-ink ${
                channels.includes(channel) ? 'border-profile bg-profile-tint' : 'border-line bg-surface hover:bg-surface-2'
              }`}
            >
              <input
                type="checkbox"
                checked={channels.includes(channel)}
                onChange={() => setChannels((current) => toggle(current, channel, REDEMPTION_CHANNELS))}
                className="h-4 w-4 accent-[var(--profile)]"
              />
              <span aria-hidden="true">{CHANNEL_DETAILS[channel].emoji}</span> {CHANNEL_DETAILS[channel].label}
            </label>
          ))}
        </div>
        <p className={adminHint}>Removing a channel needs its campaigns ended first. New online channels start unconnected.</p>
      </fieldset>

      {online ? (
        <div className="mt-4 max-w-md">
          <label htmlFor="channels-website" className={adminLabel}>
            Website
          </label>
          <input
            id="channels-website"
            type="url"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            placeholder="https://brand.example.com"
            className={adminInput}
          />
        </div>
      ) : null}

      {channels.includes('api_booking') ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <fieldset>
            <legend className={adminLabel}>Sold through Lessgo</legend>
            <div className="flex flex-wrap gap-1.5">
              {BOOKING_PRODUCTS.map((product) => (
                <button
                  key={product}
                  type="button"
                  aria-pressed={products.includes(product)}
                  onClick={() => setProducts((current) => toggle(current, product, BOOKING_PRODUCTS))}
                  className={`min-h-9 rounded-full border px-3 text-sm font-semibold ${
                    products.includes(product) ? 'border-profile bg-profile-tint text-ink' : 'border-line text-ink-muted hover:bg-surface-2'
                  }`}
                >
                  {BOOKING_PRODUCT_DETAILS[product].label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className={adminLabel}>Booking connection</legend>
            {(Object.keys(BOOKING_METHOD_DETAILS) as BookingConnectMethod[]).map((option) => (
              <label key={option} className="flex items-center gap-2.5 py-1 text-sm text-ink">
                <input
                  type="radio"
                  name="channels-booking-method"
                  checked={method === option}
                  onChange={() => setMethod(option)}
                  className="h-4 w-4 accent-[var(--profile)]"
                />
                {BOOKING_METHOD_DETAILS[option].label}
              </label>
            ))}
          </fieldset>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-down">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={busy || channels.length === 0} className={adminPrimaryButton}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <PlugZap className="h-4 w-4" aria-hidden="true" />}
          Save channels
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className={adminSecondaryButton}>
          Cancel
        </button>
      </div>
    </form>
  );
}
