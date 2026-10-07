'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CalendarRange, MapPin, Megaphone, Plus, Users } from 'lucide-react';
import { redeemedNoun } from '@web/lib/partner/channels';
import { formatCount, formatDate } from '@web/lib/partner/format';
import { listPartnerCampaigns } from '@web/lib/partner/partnerApi';
import { can } from '@web/lib/partner/rules';
import { summariseTargeting } from '@web/lib/partner/targetingText';
import type { CampaignStatus, PartnerCampaign } from '@web/lib/partner/types';
import { useSignedInPartner } from './PartnerSessionProvider';
import { ChannelBadge, EmptyState, ErrorNote, LoadingBlock, PageHeader, primaryButtonClass, StatusPill } from './ui';
import { usePartnerQuery } from './usePartnerQuery';

const FILTERS: { key: 'all' | CampaignStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'in_review', label: 'In review' },
  { key: 'rejected', label: 'Changes needed' },
  { key: 'paused', label: 'Paused' },
  { key: 'ended', label: 'Ended' },
];

export default function CampaignList() {
  const session = useSignedInPartner();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all');
  const query = usePartnerQuery(() => listPartnerCampaigns(session), session.partner.id);
  const campaigns = query.data ?? [];
  const visible = filter === 'all' ? campaigns : campaigns.filter((campaign) => campaign.status === filter);
  const canWrite = can(session.user.role, 'campaigns.write');

  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Offers you run in the Lessgo Vibes tray. New campaigns go live after a quick review by Lessgo."
        actions={
          canWrite ? (
            <Link href="/partner/campaigns/new" className={primaryButtonClass}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New campaign
            </Link>
          ) : null
        }
      />

      {query.error ? <ErrorNote message={query.error} onRetry={query.reload} /> : null}
      {!query.data && query.loading ? <LoadingBlock /> : null}

      {query.data ? (
        <>
          <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Filter campaigns">
            {FILTERS.map((option) => {
              const count =
                option.key === 'all' ? campaigns.length : campaigns.filter((campaign) => campaign.status === option.key).length;
              if (option.key !== 'all' && count === 0) return null;
              const selected = filter === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setFilter(option.key)}
                  className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition-colors ${
                    selected ? 'border-ink bg-ink text-bg' : 'border-line-strong text-ink-muted hover:text-ink'
                  }`}
                >
                  {option.label}
                  <span className={`text-xs ${selected ? 'text-bg/70' : 'text-ink-faint'}`}>{count}</span>
                </button>
              );
            })}
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="No campaigns here"
              body="Campaigns you create show up here with their review status."
              action={
                canWrite ? (
                  <Link href="/partner/campaigns/new" className={primaryButtonClass}>
                    New campaign
                  </Link>
                ) : null
              }
            />
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2">
              {visible.map((campaign) => (
                <li key={campaign.id}>
                  <CampaignCard campaign={campaign} />
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </>
  );
}

function CampaignCard({ campaign }: { campaign: PartnerCampaign }) {
  const limit = campaign.voucherPolicy.redemptionLimit;
  const progress = limit ? Math.min(1, campaign.stats.redeemed / limit) : null;
  return (
    <Link
      href={`/partner/campaigns/${campaign.id}`}
      className="flex h-full gap-4 rounded-lg border border-line bg-surface p-4 shadow-soft transition-shadow hover:shadow-lift"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={campaign.creative.storyImageUrl} alt="" className="h-36 w-24 flex-none rounded-md object-cover" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-extrabold tracking-wide text-ink">
            {campaign.offer.label}
          </span>
          <StatusPill status={campaign.status} />
        </div>
        <p className="mt-2 line-clamp-2 font-display text-base font-bold leading-snug text-ink">{campaign.headline}</p>
        <ChannelBadge channel={campaign.channel} className="mt-1.5 self-start" />
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-ink-muted">
          <MapPin className="mt-px h-3.5 w-3.5 flex-none" aria-hidden="true" />
          <span className="line-clamp-2">{summariseTargeting(campaign.targeting)}</span>
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
          <CalendarRange className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
          {formatDate(campaign.schedule.startAt)} – {formatDate(campaign.schedule.endAt)}
        </p>
        <div className="mt-auto pt-3">
          {campaign.status === 'live' || campaign.status === 'paused' || campaign.status === 'ended' ? (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 text-ink-muted">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  {formatCount(campaign.stats.claims)} claimed
                </span>
                <span className="font-semibold text-ink">
                  {formatCount(campaign.stats.redeemed)} {campaign.channel === 'in_store' ? 'redeemed' : redeemedNoun(campaign.channel, campaign.stats.redeemed)}
                  {limit ? ` / ${formatCount(limit)}` : ''}
                </span>
              </div>
              {progress !== null ? (
                <div className="mt-1.5 h-1.5 rounded-full bg-surface-2">
                  <div className="gradient-brand h-1.5 rounded-full" style={{ width: `${Math.max(2, progress * 100)}%` }} />
                </div>
              ) : null}
            </>
          ) : campaign.status === 'rejected' ? (
            <p className="line-clamp-2 text-xs text-down">{campaign.reviewNote}</p>
          ) : (
            <p className="text-xs text-ink-muted">≈ {formatCount(campaign.stats.reach)} people match the audience</p>
          )}
        </div>
      </div>
    </Link>
  );
}
