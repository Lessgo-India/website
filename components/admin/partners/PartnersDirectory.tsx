'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, ChevronRight, ClipboardCheck, Handshake, PlugZap, Plus, RefreshCw, Search, ShieldOff, Sparkles } from 'lucide-react';
import IntegrationTestResult from '@ui/partner/IntegrationTestResult';
import { BrandAvatar, ChannelBadge, DemoTag } from '@ui/partner/ui';
import { usePartnerQuery } from '@ui/partner/usePartnerQuery';
import { getAdminPartnersOverview, resetPartnersDemo } from '@web/lib/adminPartnersApi';
import { CHANNEL_DETAILS, REDEMPTION_CHANNELS } from '@web/lib/partner/channels';
import { PARTNER_PORTAL_CONFIG } from '@web/lib/partner/config';
import { formatDate, formatRelative } from '@web/lib/partner/format';
import { stateName } from '@web/lib/partner/indiaGeo';
import { PLAN_DETAILS } from '@web/lib/partner/onboarding';
import type { AdminGoLiveRequest, AdminPartnerSummary, PartnerStatus, RedemptionChannel } from '@web/lib/partner/types';
import CampaignReviewCard from './CampaignReviewCard';
import { adminCard, adminInput, adminPrimaryButton, adminSecondaryButton, PartnerStatusBadge, SectionHeading } from './partnerAdminUi';

const FILTERS: { value: 'all' | PartnerStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'invited', label: 'Invited' },
  { value: 'suspended', label: 'Suspended' },
];

export default function PartnersDirectory() {
  const query = usePartnerQuery(getAdminPartnersOverview, 'admin-partners');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('all');
  const [channel, setChannel] = useState<'all' | RedemptionChannel>('all');
  const [resetting, setResetting] = useState(false);

  const partners = useMemo(() => query.data?.partners ?? [], [query.data]);
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return partners.filter(
      (row) =>
        (filter === 'all' || row.partner.status === filter) &&
        (channel === 'all' || row.partner.channels.includes(channel)) &&
        (!term ||
          [
            row.partner.brandName,
            row.partner.handle,
            row.partner.city,
            row.partner.legalName,
            row.partner.contactName,
            row.partner.category,
          ].some((value) => value.toLowerCase().includes(term))),
    );
  }, [channel, filter, partners, search]);

  const count = (status: PartnerStatus) => partners.filter((row) => row.partner.status === status).length;
  const reviewQueue = query.data?.reviewQueue ?? [];
  const goLiveQueue = query.data?.goLiveQueue ?? [];

  return (
    <div className="space-y-8">
      {query.error ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-down bg-down-tint px-4 py-3 text-sm text-ink">
          {query.error}
          <button type="button" onClick={query.reload} className={adminSecondaryButton}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Partners" value={partners.length} icon={Handshake} />
        <Kpi label="Active" value={count('active')} icon={Sparkles} tone="text-ok" />
        <Kpi label="Awaiting first sign-in" value={count('invited')} icon={Plus} tone="text-warn" />
        <Kpi label="Suspended" value={count('suspended')} icon={ShieldOff} tone="text-down" />
        <Kpi label="Go-live requests" value={goLiveQueue.length} icon={PlugZap} tone="text-profile" />
        <Kpi label="Campaigns to review" value={reviewQueue.length} icon={ClipboardCheck} tone="text-profile" />
      </div>

      {goLiveQueue.length > 0 ? (
        <section aria-labelledby="go-live-heading">
          <SectionHeading>
            <span id="go-live-heading">Integrations waiting for go-live</span>
          </SectionHeading>
          <ul className="grid gap-4 xl:grid-cols-2">
            {goLiveQueue.map((request) => (
              <GoLiveCard key={`${request.partner.id}:${request.channel}`} request={request} />
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="review-queue-heading">
        <SectionHeading>
          <span id="review-queue-heading">Campaigns waiting for review</span>
        </SectionHeading>
        {query.loading && !query.data ? (
          <p className="text-sm text-ink-muted">Loading…</p>
        ) : reviewQueue.length === 0 ? (
          <p className={`${adminCard} px-4 py-6 text-center text-sm text-ink-muted`}>
            Nothing to review. New and resubmitted campaigns from partners land here.
          </p>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {reviewQueue.map((item) => (
              <CampaignReviewCard key={item.campaign.id} item={item} onReviewed={() => query.reload()} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="partners-heading">
        <SectionHeading
          action={
            <Link href="/admin/partners/new" className={adminPrimaryButton}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Onboard partner
            </Link>
          }
        >
          <span id="partners-heading">All partners</span>
        </SectionHeading>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search brand, user-ID prefix, city or contact"
              aria-label="Search partners"
              className={`${adminInput} pl-9`}
            />
          </div>
          <label className="sr-only" htmlFor="partner-type-filter">
            Filter by partner type
          </label>
          <select
            id="partner-type-filter"
            value={channel}
            onChange={(event) => setChannel(event.target.value as 'all' | RedemptionChannel)}
            className={`${adminInput} sm:w-48`}
          >
            <option value="all">All partner types</option>
            {REDEMPTION_CHANNELS.map((option) => (
              <option key={option} value={option}>
                {CHANNEL_DETAILS[option].label}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Filter by status">
            {FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={filter === option.value}
                onClick={() => setFilter(option.value)}
                className={`min-h-11 rounded-md border px-3 text-sm font-semibold ${
                  filter === option.value ? 'border-profile bg-profile-tint text-ink' : 'border-line text-ink-muted hover:bg-surface-2'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className={`${adminCard} overflow-x-auto`}>
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-3 font-semibold">Partner</th>
                <th className="px-3 py-3 font-semibold">Type</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Plan</th>
                <th className="px-3 py-3 font-semibold">Location</th>
                <th className="px-3 py-3 font-semibold">Logins</th>
                <th className="px-3 py-3 font-semibold">Campaigns</th>
                <th className="px-3 py-3 font-semibold">Since</th>
                <th className="px-4 py-3" aria-label="Open" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visible.map((row) => (
                <PartnerRow key={row.partner.id} row={row} />
              ))}
              {query.data && visible.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-ink-muted">
                    No partners match.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {PARTNER_PORTAL_CONFIG.useDummyData ? (
        <p className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <DemoTag /> Partners, logins and reviews here are dummy data shared with the partner portal in this browser.
          <button
            type="button"
            disabled={resetting}
            onClick={async () => {
              setResetting(true);
              await resetPartnersDemo();
              setResetting(false);
              query.reload();
            }}
            className="font-semibold text-profile hover:underline disabled:opacity-50"
          >
            Reset demo data
          </button>
        </p>
      ) : null}
    </div>
  );
}

function PartnerRow({ row }: { row: AdminPartnerSummary }) {
  const { partner } = row;
  const href = `/admin/partners/${partner.id}`;
  return (
    <tr className="hover:bg-surface-2">
      <td className="px-4 py-3">
        <Link href={href} className="flex items-center gap-3">
          <BrandAvatar partner={partner} size={34} />
          <span className="min-w-0">
            <span className="block font-semibold text-ink">{partner.brandName}</span>
            <span className="block font-mono text-xs text-ink-muted">{partner.handle}.*</span>
          </span>
        </Link>
      </td>
      <td className="px-3 py-3">
        <span className="flex flex-col items-start gap-1">
          {partner.channels.map((channel) => (
            <ChannelBadge key={channel} channel={channel} />
          ))}
        </span>
        <span className="mt-1 block text-xs text-ink-muted">{partner.category}</span>
      </td>
      <td className="px-3 py-3">
        <PartnerStatusBadge status={partner.status} />
      </td>
      <td className="px-3 py-3 text-ink">{PLAN_DETAILS[partner.plan].label}</td>
      <td className="px-3 py-3 text-ink-muted">
        {partner.city}, {stateName(partner.stateCode)}
      </td>
      <td className="px-3 py-3 text-ink">
        {row.logins}
        {row.pendingLogins ? <span className="ml-1.5 text-xs text-warn">({row.pendingLogins} pending)</span> : null}
        <span className="block text-xs text-ink-muted">
          {row.lastSignInAt ? `Last sign-in ${formatRelative(row.lastSignInAt)}` : 'Never signed in'}
        </span>
      </td>
      <td className="px-3 py-3 text-ink">
        {row.liveCampaigns} live
        {row.inReview ? <span className="ml-1.5 text-xs font-semibold text-profile">· {row.inReview} to review</span> : null}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-ink-muted">{formatDate(partner.onboardedAt)}</td>
      <td className="px-4 py-3 text-right">
        <Link href={href} aria-label={`Open ${partner.brandName}`} className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:bg-surface hover:text-ink">
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </td>
    </tr>
  );
}

function GoLiveCard({ request }: { request: AdminGoLiveRequest }) {
  const { partner, channel } = request;
  return (
    <li className={`${adminCard} p-4`}>
      <div className="flex flex-wrap items-center gap-3">
        <BrandAvatar partner={partner} size={34} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{partner.brandName}</p>
          <p className="text-xs text-ink-muted">Asked {formatRelative(request.requestedAt)} to go live</p>
        </div>
        <ChannelBadge channel={channel} />
      </div>
      {request.lastTest ? (
        <div className="mt-3 rounded-md bg-bg-elev px-3 py-2.5">
          <IntegrationTestResult run={request.lastTest} compact />
        </div>
      ) : null}
      <Link
        href={`/admin/partners/${partner.id}`}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-profile hover:underline"
      >
        Review the connection <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </li>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone = 'text-ink-muted',
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: string;
}) {
  return (
    <div className={`${adminCard} p-4`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
        <Icon className={`h-4 w-4 ${tone}`} aria-hidden="true" />
      </div>
      <p className="mt-2 font-display text-2xl font-extrabold text-ink">{value}</p>
    </div>
  );
}
