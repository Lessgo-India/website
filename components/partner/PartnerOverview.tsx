'use client';

import Link from 'next/link';
import {
  ArrowRight,
  CalendarPlus,
  Eye,
  IndianRupee,
  Megaphone,
  PlugZap,
  Plus,
  Receipt,
  ScanLine,
  Ticket,
  TicketCheck,
  TrendingUp,
} from 'lucide-react';
import {
  formatCompact,
  formatCount,
  formatDateTime,
  formatInr,
  formatInrCompact,
  formatPercent,
  formatShortDay,
  greeting,
} from '@web/lib/partner/format';
import { describeDistrict } from '@web/lib/partner/indiaGeo';
import { getPartnerOverview, listPartnerCampaigns, listPartnerOutlets } from '@web/lib/partner/partnerApi';
import {
  CHANNEL_DETAILS,
  funnelSteps,
  integrationStatus,
  isOnlineChannel,
  redeemedNoun,
  salesLabel,
} from '@web/lib/partner/channels';
import { can, hasFeature, rate } from '@web/lib/partner/rules';
import type {
  CampaignStats,
  PartnerAccount,
  PartnerCampaign,
  PartnerChannelTotals,
  PartnerOutlet,
  PartnerRedemption,
  RedemptionChannel,
} from '@web/lib/partner/types';
import IntegrationTestResult from './IntegrationTestResult';
import { useSignedInPartner } from './PartnerSessionProvider';
import {
  Card,
  ChannelBadge,
  EmptyState,
  ErrorNote,
  LoadingBlock,
  PageHeader,
  primaryButtonClass,
  secondaryButtonClass,
  IntegrationStatusBadge,
  StatTile,
  StatusPill,
} from './ui';
import { usePartnerQuery } from './usePartnerQuery';

export default function PartnerOverview() {
  const session = useSignedInPartner();
  const query = usePartnerQuery(
    async () => {
      const [overview, campaigns, outlets] = await Promise.all([
        getPartnerOverview(session),
        listPartnerCampaigns(session),
        listPartnerOutlets(session),
      ]);
      return { overview, campaigns, outlets };
    },
    session.partner.id,
  );

  const firstName = session.user.name.split(' ')[0];
  const canWrite = can(session.user.role, 'campaigns.write');
  const channels = session.partner.channels;
  const sales = salesLabel(channels);

  return (
    <>
      <PageHeader
        eyebrow={`${greeting()}, ${firstName}`}
        title={session.partner.brandName}
        description="Your Lessgo offers over the last 30 days."
        actions={
          <>
            {hasFeature(channels, 'redeem') && can(session.user.role, 'redeem') ? (
              <Link href="/partner/redeem" className={secondaryButtonClass}>
                <ScanLine className="h-4 w-4" aria-hidden="true" />
                Redeem
              </Link>
            ) : null}
            {sales && can(session.user.role, 'sales') ? (
              <Link href="/partner/sales" className={secondaryButtonClass}>
                <Receipt className="h-4 w-4" aria-hidden="true" />
                {sales}
              </Link>
            ) : null}
            {canWrite ? (
              <Link href="/partner/campaigns/new" className={primaryButtonClass}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                New campaign
              </Link>
            ) : null}
          </>
        }
      />

      {query.error ? <ErrorNote message={query.error} onRetry={query.reload} /> : null}
      {!query.data ? (
        query.loading ? <LoadingBlock /> : null
      ) : (
        <OverviewBody
          partner={query.data.overview.partner}
          totals={query.data.overview.totals}
          byChannel={query.data.overview.byChannel}
          daily={query.data.overview.daily}
          campaigns={query.data.campaigns}
          outlets={query.data.outlets}
          recent={query.data.overview.recentRedemptions}
          topDistricts={query.data.overview.topDistricts}
          canWrite={canWrite}
          canIntegrate={can(session.user.role, 'integrations')}
        />
      )}
    </>
  );
}

const DISCOUNT_HINT: Record<RedemptionChannel, string> = {
  in_store: 'Funded by you at the counter',
  online_code: 'Funded by you at checkout',
  api_booking: 'Funded by you in your quotes',
};

function OverviewBody({
  partner,
  totals,
  byChannel,
  daily,
  campaigns,
  outlets,
  recent,
  topDistricts,
  canWrite,
  canIntegrate,
}: {
  partner: PartnerAccount;
  totals: CampaignStats;
  byChannel: PartnerChannelTotals[];
  daily: { day: string; claims: number; redeemed: number }[];
  campaigns: PartnerCampaign[];
  outlets: PartnerOutlet[];
  recent: PartnerRedemption[];
  topDistricts: { districtId: string; redeemed: number }[];
  canWrite: boolean;
  canIntegrate: boolean;
}) {
  const active = campaigns.filter((campaign) => ['live', 'paused', 'scheduled', 'in_review', 'rejected'].includes(campaign.status));
  const roi = totals.discountMinor > 0 ? totals.gmvMinor / totals.discountMinor : null;
  // One channel: its own words (orders, bookings); several: neutral totals plus a per-channel card.
  const only = partner.channels.length === 1 ? partner.channels[0] : undefined;
  const redeemedLabel = only && only !== 'in_store' ? `${redeemedNoun(only, 2)[0].toUpperCase()}${redeemedNoun(only, 2).slice(1)}` : 'Redeemed';
  const inStore = partner.channels.includes('in_store');
  const onlineChannels = partner.channels.filter(isOnlineChannel);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Story views" value={formatCompact(totals.impressions)} icon={Eye} accent="text-vibes" hint={`${formatCompact(totals.reach)} people in reach`} />
        <StatTile label="Claimed" value={formatCompact(totals.claims)} icon={Ticket} accent="text-events" hint={`${formatPercent(rate(totals.claims, totals.opens))} of opens`} />
        <StatTile label="Events created" value={formatCompact(totals.eventsCreated)} icon={CalendarPlus} accent="text-groups" hint={`${formatPercent(rate(totals.eventsCreated, totals.claims))} of claims`} />
        <StatTile label={redeemedLabel} value={formatCompact(totals.redeemed)} icon={TicketCheck} accent="text-ok" hint={`${formatPercent(rate(totals.redeemed, totals.eventsCreated))} of events`} />
        <StatTile
          label="Discount given"
          value={formatInrCompact(totals.discountMinor)}
          icon={IndianRupee}
          accent="text-split"
          hint={only ? DISCOUNT_HINT[only] : 'Funded by you'}
        />
        <StatTile
          label="Sales via Lessgo"
          value={formatInrCompact(totals.gmvMinor)}
          icon={TrendingUp}
          accent="text-profile"
          hint={roi ? `${roi.toFixed(1)}× your discount` : 'Gross value from Lessgo groups'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card
          title={only && only !== 'in_store' ? `Claims and ${redeemedNoun(only, 2)}` : 'Claims and redemptions'}
          action={<span className="text-xs text-ink-muted">Last 14 days</span>}
        >
          <DailyChart daily={daily} redeemedLabel={redeemedLabel} />
        </Card>
        <Card title="Funnel">
          <Funnel totals={totals} channel={only} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card
          title="Your campaigns"
          action={
            <Link href="/partner/campaigns" className="inline-flex items-center gap-1 text-sm font-semibold text-profile hover:underline">
              All campaigns <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          }
        >
          {active.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="No active campaigns"
              body="Create an offer and it appears in the Vibes tray of the people you target."
              action={
                canWrite ? (
                  <Link href="/partner/campaigns/new" className={primaryButtonClass}>
                    New campaign
                  </Link>
                ) : null
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {active.slice(0, 5).map((campaign) => (
                <li key={campaign.id}>
                  <Link href={`/partner/campaigns/${campaign.id}`} className="flex items-center gap-3 py-3 hover:opacity-90">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={campaign.creative.storyImageUrl} alt="" className="h-14 w-10 flex-none rounded-sm object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{campaign.headline}</p>
                      <p className="mt-0.5 truncate text-xs text-ink-muted">
                        {campaign.offer.label} · {campaignProgress(campaign)}
                      </p>
                    </div>
                    <StatusPill status={campaign.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
        {partner.channels.length > 1 ? <ChannelBreakdown rows={byChannel} /> : null}
        {onlineChannels.length > 0 && !inStore ? (
          <ConnectionCard partner={partner} canIntegrate={canIntegrate} />
        ) : null}
        {inStore ? (
        <Card title="Where groups redeem">
          {topDistricts.length === 0 ? (
            <p className="text-sm text-ink-muted">No redemptions yet.</p>
          ) : (
            <ul className="space-y-3">
              {topDistricts.map((row) => (
                <li key={row.districtId}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate text-ink">{describeDistrict(row.districtId)}</span>
                    <span className="font-mono text-xs text-ink-muted">{row.redeemed}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-surface-2">
                    <div
                      className="gradient-brand h-2 rounded-full"
                      style={{ width: `${(row.redeemed / topDistricts[0].redeemed) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-ink-muted">
            {outlets.filter((outlet) => outlet.status === 'active').length} active outlets ·{' '}
            <Link href="/partner/outlets" className="font-semibold text-profile hover:underline">
              Manage outlets
            </Link>
          </p>
        </Card>
        ) : null}
        </div>
      </div>

      <Card title={only === 'online_code' ? 'Recent orders' : only === 'api_booking' ? 'Recent bookings' : 'Recent activity'}>
        <RedemptionTable rows={recent} campaigns={campaigns} outlets={outlets} />
      </Card>
    </div>
  );
}

function campaignProgress(campaign: PartnerCampaign): string {
  switch (campaign.status) {
    case 'in_review':
      return 'Awaiting Lessgo review';
    case 'rejected':
      return 'Changes requested';
    case 'scheduled':
      return `Starts ${formatShortDay(campaign.schedule.startAt)}`;
    default: {
      const limit = campaign.voucherPolicy.redemptionLimit;
      const noun = campaign.channel === 'in_store' ? 'redeemed' : redeemedNoun(campaign.channel, campaign.stats.redeemed);
      return `${formatCount(campaign.stats.redeemed)} ${noun}${limit ? ` of ${formatCount(limit)}` : ''}`;
    }
  }
}

function ChannelBreakdown({ rows }: { rows: PartnerChannelTotals[] }) {
  return (
    <Card title="By channel">
      <ul className="divide-y divide-line">
        {rows.map((row) => (
          <li key={row.channel} className="flex flex-wrap items-center gap-3 py-3 text-sm">
            <ChannelBadge channel={row.channel} />
            <span className="text-xs text-ink-muted">
              {row.liveCampaigns} live of {row.campaigns}
            </span>
            <span className="ml-auto text-right">
              <span className="block font-semibold text-ink">
                {formatCount(row.totals.redeemed)} {redeemedNoun(row.channel, row.totals.redeemed)}
              </span>
              <span className="block text-xs text-ink-muted">
                {formatInrCompact(row.totals.gmvMinor)} · −{formatInrCompact(row.totals.discountMinor)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Online-only partners: where their integration stands (owners can fix it). */
function ConnectionCard({ partner, canIntegrate }: { partner: PartnerAccount; canIntegrate: boolean }) {
  const channels = partner.channels.filter(isOnlineChannel);
  return (
    <Card
      title="Your connection"
      action={
        canIntegrate ? (
          <Link href="/partner/integrations" className="inline-flex items-center gap-1 text-sm font-semibold text-profile hover:underline">
            Integrations <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ) : null
      }
    >
      <ul className="space-y-4">
        {channels.map((channel) => {
          const integration = channel === 'online_code' ? partner.integration.checkout : partner.integration.booking;
          return (
            <li key={channel}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-ink">
                  <span aria-hidden="true">{CHANNEL_DETAILS[channel].emoji}</span> {CHANNEL_DETAILS[channel].label}
                </span>
                <IntegrationStatusBadge status={integrationStatus(partner, channel)} />
              </div>
              {integration?.lastTest ? (
                <div className="mt-2">
                  <IntegrationTestResult run={integration.lastTest} compact />
                </div>
              ) : (
                <p className="mt-1 text-xs text-ink-muted">
                  <PlugZap className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                  Not connected yet{canIntegrate ? ' — set it up under Integrations.' : '. Ask your account owner.'}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function DailyChart({
  daily,
  redeemedLabel = 'Redeemed',
}: {
  daily: { day: string; claims: number; redeemed: number }[];
  redeemedLabel?: string;
}) {
  if (daily.length === 0) return <p className="text-sm text-ink-muted">No activity yet.</p>;
  const max = Math.max(1, ...daily.map((point) => point.claims));
  return (
    <div>
      <div className="flex h-48 items-end gap-1.5" role="img" aria-label={`Daily claims and ${redeemedLabel.toLowerCase()}, last 14 days`}>
        {daily.map((point) => (
          <div key={point.day} className="group relative flex h-full flex-1 flex-col justify-end">
            <div className="relative w-full rounded-t-sm bg-events-tint" style={{ height: `${(point.claims / max) * 100}%` }}>
              <div
                className="absolute inset-x-0 bottom-0 rounded-t-sm bg-ok"
                style={{ height: `${point.claims ? (point.redeemed / point.claims) * 100 : 0}%` }}
              />
            </div>
            <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-sm bg-ink px-2 py-1 text-[11px] text-bg group-hover:block">
              {point.claims} claimed · {point.redeemed} redeemed
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-ink-muted">
        <span>{formatShortDay(`${daily[0].day}T12:00:00+05:30`)}</span>
        <span>Today</span>
      </div>
      <div className="mt-3 flex gap-4 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-events-tint ring-1 ring-line" aria-hidden="true" /> Claimed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-ok" aria-hidden="true" /> {redeemedLabel}
        </span>
      </div>
    </div>
  );
}

/** `channel` picks the last steps (outlet / checkout / booking); omit it for mixed totals. */
export function Funnel({ totals, channel }: { totals: CampaignStats; channel?: RedemptionChannel }) {
  const steps = funnelSteps(channel ?? 'in_store').map((step, index, all) => ({
    label: !channel && index === all.length - 1 ? 'Redeemed, ordered or booked' : step.label,
    value: totals[step.key],
  }));
  const top = Math.max(1, steps[0].value);
  return (
    <ol className="space-y-3">
      {steps.map((step, index) => (
        <li key={step.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-ink">{step.label}</span>
            <span className="font-mono text-xs text-ink-muted">
              {formatCount(step.value)}
              {index > 0 ? ` · ${formatPercent(rate(step.value, steps[index - 1].value))}` : ''}
            </span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-surface-2">
            <div className="gradient-brand h-2 rounded-full" style={{ width: `${Math.max(1.5, (step.value / top) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

const SOURCE_TAG: Partial<Record<PartnerRedemption['source'], string>> = {
  webhook: 'POS',
  api: 'POS',
  checkout_api: 'Online',
  booking_webhook: 'Booked',
};

export function RedemptionTable({
  rows,
  campaigns,
  outlets,
  showCampaign = true,
}: {
  rows: PartnerRedemption[];
  campaigns: PartnerCampaign[];
  outlets: PartnerOutlet[];
  showCampaign?: boolean;
}) {
  if (rows.length === 0) return <p className="text-sm text-ink-muted">Nothing yet.</p>;
  const online = rows.some((row) => row.channel !== 'in_store');
  const inStore = rows.some((row) => row.channel === 'in_store');
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
            <th className="px-5 py-2 font-semibold">When</th>
            <th className="px-3 py-2 font-semibold">{online ? (inStore ? 'Outlet / order' : 'Order / booking') : 'Outlet'}</th>
            {showCampaign ? <th className="px-3 py-2 font-semibold">Offer</th> : null}
            <th className="px-3 py-2 font-semibold">Code</th>
            <th className="px-3 py-2 text-right font-semibold">Group</th>
            <th className="px-3 py-2 text-right font-semibold">{online ? 'Value' : 'Bill'}</th>
            <th className="px-5 py-2 text-right font-semibold">Discount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="whitespace-nowrap px-5 py-2.5 text-ink-muted">{formatDateTime(row.redeemedAt)}</td>
              <td className="max-w-[240px] px-3 py-2.5 text-ink">
                {row.channel === 'in_store' ? (
                  outlets.find((outlet) => outlet.id === row.outletId)?.name.split(' – ').pop() ?? '—'
                ) : (
                  <>
                    <span className="font-mono text-xs font-semibold">{row.orderRef ?? '—'}</span>
                    {row.summary ? <span className="block truncate text-xs text-ink-muted">{row.summary}</span> : null}
                  </>
                )}
                {SOURCE_TAG[row.source] && (row.channel === 'in_store' || (online && inStore)) ? (
                  <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase text-ink-muted">
                    {SOURCE_TAG[row.source]}
                  </span>
                ) : null}
                {row.reversedAt ? (
                  <span className="ml-2 rounded-full bg-down-tint px-2 py-0.5 text-[10px] font-semibold uppercase text-down">Cancelled</span>
                ) : null}
              </td>
              {showCampaign ? (
                <td className="max-w-[220px] truncate px-3 py-2.5 text-ink-muted">
                  {campaigns.find((campaign) => campaign.id === row.campaignId)?.offer.label ?? '—'}
                </td>
              ) : null}
              <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-ink-muted">{row.maskedCode}</td>
              <td className="px-3 py-2.5 text-right text-ink">{row.groupSize}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right text-ink">{formatInr(row.billMinor)}</td>
              <td className="whitespace-nowrap px-5 py-2.5 text-right font-semibold text-ok">
                {row.discountMinor > 0 ? `−${formatInr(row.discountMinor)}` : 'Freebie'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
