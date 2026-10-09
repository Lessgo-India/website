'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BadgeIndianRupee, Ban, IndianRupee, Receipt, Ticket } from 'lucide-react';
import { CHANNEL_DETAILS, isOnlineChannel, salesLabel, type OnlineChannel } from '@web/lib/partner/channels';
import { PARTNER_PORTAL_CONFIG } from '@web/lib/partner/config';
import { formatCount, formatDateTime, formatInr, formatRelative } from '@web/lib/partner/format';
import { listPartnerCampaigns, listPartnerRedemptions } from '@web/lib/partner/partnerApi';
import type { PartnerRedemption, RedemptionSource } from '@web/lib/partner/types';
import { useSignedInPartner } from './PartnerSessionProvider';
import { Card, ChannelBadge, DemoTag, EmptyState, ErrorNote, inputClass, LoadingBlock, PageHeader, StatTile } from './ui';
import { usePartnerQuery } from './usePartnerQuery';

const SOURCE_LABEL: Record<RedemptionSource, string> = {
  console: 'Redeem console',
  webhook: 'POS webhook',
  api: 'POS API',
  checkout_api: 'Checkout API',
  booking_webhook: 'Booking webhook',
};

/**
 * Orders (online checkout codes) and bookings (made through Lessgo) that the
 * partner confirmed — the online counterpart of the Redeem console.
 */
export default function PartnerSales() {
  const session = useSignedInPartner();
  const channels = session.partner.channels.filter(isOnlineChannel);
  const title = salesLabel(session.partner.channels) ?? 'Orders';
  const [channel, setChannel] = useState<'all' | OnlineChannel>('all');
  const [campaignId, setCampaignId] = useState('all');

  const query = usePartnerQuery(async () => {
    const [rows, campaigns] = await Promise.all([
      listPartnerRedemptions(session, { limit: 500 }),
      listPartnerCampaigns(session),
    ]);
    return {
      rows: rows.filter((row) => row.channel !== 'in_store'),
      campaigns: campaigns.filter((campaign) => campaign.channel !== 'in_store'),
    };
  }, `${session.partner.id}:sales`);

  const rows = useMemo(
    () =>
      (query.data?.rows ?? []).filter(
        (row) => (channel === 'all' || row.channel === channel) && (campaignId === 'all' || row.campaignId === campaignId),
      ),
    [campaignId, channel, query.data],
  );
  const confirmed = rows.filter((row) => !row.reversedAt);
  const value = confirmed.reduce((sum, row) => sum + row.billMinor, 0);
  const discount = confirmed.reduce((sum, row) => sum + row.discountMinor, 0);
  const units = confirmed.reduce((sum, row) => sum + (row.units ?? 0), 0);
  const onlyBookings = channel === 'api_booking' || (channel === 'all' && !channels.includes('online_code'));
  const onlyOrders = channel === 'online_code' || (channel === 'all' && !channels.includes('api_booking'));
  const noun = onlyBookings ? 'booking' : onlyOrders ? 'order' : 'order or booking';
  const campaignName = (id: string) => query.data?.campaigns.find((campaign) => campaign.id === id)?.headline ?? 'Campaign';

  return (
    <div>
      <PageHeader
        title={title}
        description={
          onlyBookings
            ? 'Bookings groups made through Lessgo with your coupon, as your booking API confirmed them.'
            : onlyOrders
              ? 'Orders placed on your checkout with a Lessgo code, as your checkout reported them.'
              : 'Orders placed on your checkout and bookings made through Lessgo with your coupons.'
        }
        actions={PARTNER_PORTAL_CONFIG.useDummyData ? <DemoTag /> : undefined}
      />

      {query.error ? <ErrorNote message={query.error} onRetry={query.reload} /> : null}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={`Confirmed ${noun}s`} value={formatCount(confirmed.length)} icon={Receipt} />
        <StatTile label="Value before discount" value={formatInr(value)} icon={IndianRupee} accent="text-ok" />
        <StatTile
          label="Discount given"
          value={formatInr(discount)}
          hint={confirmed.length ? `${formatInr(Math.round(discount / confirmed.length))} per ${noun}` : undefined}
          icon={BadgeIndianRupee}
          accent="text-vibes"
        />
        {onlyBookings ? (
          <StatTile
            label="Tickets / rooms"
            value={formatCount(units)}
            hint={confirmed.length ? `${(units / confirmed.length).toFixed(1)} per booking` : undefined}
            icon={Ticket}
          />
        ) : (
          <StatTile
            label="Cancelled or refunded"
            value={formatCount(rows.length - confirmed.length)}
            hint="Coupon reversed for the group"
            icon={Ban}
            accent="text-down"
          />
        )}
      </div>

      <Card
        title={`Recent ${noun}s`}
        action={
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            {channels.length > 1 ? (
              <select
                aria-label="Channel"
                value={channel}
                onChange={(event) => setChannel(event.target.value as 'all' | OnlineChannel)}
                className={`${inputClass} min-h-10 w-full py-1.5 sm:w-auto`}
              >
                <option value="all">All channels</option>
                {channels.map((option) => (
                  <option key={option} value={option}>
                    {CHANNEL_DETAILS[option].label}
                  </option>
                ))}
              </select>
            ) : null}
            <select
              aria-label="Campaign"
              value={campaignId}
              onChange={(event) => setCampaignId(event.target.value)}
              className={`${inputClass} min-h-10 w-full max-w-full py-1.5 sm:w-auto sm:max-w-[16rem]`}
            >
              <option value="all">All campaigns</option>
              {(query.data?.campaigns ?? []).map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.headline}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {query.loading && !query.data ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={`No ${noun}s yet`}
            body={
              onlyBookings
                ? 'When a group books through Lessgo and your API confirms it, it shows up here.'
                : 'When a group pays on your checkout with a Lessgo code, it shows up here.'
            }
            action={
              <Link href="/partner/campaigns" className="text-sm font-semibold text-profile hover:underline">
                See your campaigns
              </Link>
            }
          />
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-y border-line text-xs uppercase tracking-wide text-ink-muted">
                  <th className="px-5 py-2.5 font-semibold">When</th>
                  <th className="px-3 py-2.5 font-semibold">Reference</th>
                  <th className="px-3 py-2.5 font-semibold">What</th>
                  <th className="px-3 py-2.5 font-semibold">Group</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Value</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Discount</th>
                  <th className="px-5 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => (
                  <SaleRow key={row.id} row={row} campaignName={campaignName(row.campaignId)} showChannel={channels.length > 1} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-ink-muted">
          {onlyBookings
            ? 'Bookings appear when your API sends booking.confirmed; cancellations and refunds reverse the coupon for the group.'
            : 'Orders appear when your checkout calls the Partner API’s redeem; a reverse call (cancellation or refund) removes the coupon credit from the group.'}{' '}
          Lessgo never sees card details — groups always pay on your checkout.
        </p>
      </Card>
    </div>
  );
}

function SaleRow({ row, campaignName, showChannel }: { row: PartnerRedemption; campaignName: string; showChannel: boolean }) {
  return (
    <tr className={row.reversedAt ? 'text-ink-muted' : undefined}>
      <td className="whitespace-nowrap px-5 py-3" title={formatDateTime(row.redeemedAt)}>
        {formatRelative(row.redeemedAt)}
      </td>
      <td className="px-3 py-3">
        <span className="font-mono text-xs font-semibold text-ink">{row.orderRef ?? '—'}</span>
        <span className="block font-mono text-[11px] text-ink-muted">{row.maskedCode}</span>
      </td>
      <td className="max-w-[18rem] px-3 py-3">
        <span className="block truncate text-ink">{row.summary ?? campaignName}</span>
        <span className="flex items-center gap-1.5 text-xs text-ink-muted">
          {showChannel ? <ChannelBadge channel={row.channel} /> : null}
          <span className="truncate">{campaignName}</span>
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-3">
        {row.holderDisplayName}
        <span className="block text-xs text-ink-muted">group of {row.groupSize}</span>
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-ink">{formatInr(row.billMinor)}</td>
      <td className="whitespace-nowrap px-3 py-3 text-right text-ok">−{formatInr(row.discountMinor)}</td>
      <td className="whitespace-nowrap px-5 py-3">
        {row.reversedAt ? (
          <span className="inline-flex rounded-full bg-down-tint px-2.5 py-0.5 text-xs font-semibold text-down">
            {row.channel === 'api_booking' ? 'Cancelled' : 'Refunded'}
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-ok-tint px-2.5 py-0.5 text-xs font-semibold text-ok">Confirmed</span>
        )}
        <span className="block text-[11px] text-ink-muted">{SOURCE_LABEL[row.source]}</span>
      </td>
    </tr>
  );
}
