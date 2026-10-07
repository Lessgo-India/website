'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  IndianRupee,
  Loader2,
  MapPin,
  Pause,
  Play,
  Ticket,
  TicketCheck,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import { eventTypeLabel } from '@web/lib/partner/eventTypes';
import { formatCount, formatDate, formatInr, formatInrCompact } from '@web/lib/partner/format';
import {
  getPartnerCampaign,
  listPartnerOutlets,
  listPartnerRedemptions,
  setCampaignPaused,
} from '@web/lib/partner/partnerApi';
import { can } from '@web/lib/partner/rules';
import { describeAges, describeGender, ruleNames } from '@web/lib/partner/targetingText';
import type { CampaignOffer } from '@web/lib/partner/types';
import CampaignPreview from './CampaignPreview';
import { useSignedInPartner } from './PartnerSessionProvider';
import { Funnel, RedemptionTable } from './PartnerOverview';
import { Card, ErrorNote, LoadingBlock, PageHeader, secondaryButtonClass, StatTile, StatusPill } from './ui';
import { usePartnerQuery } from './usePartnerQuery';

export function describeOffer(offer: CampaignOffer): string {
  switch (offer.type) {
    case 'flat':
      return `${formatInr(offer.valueMinor ?? 0)} off the bill`;
    case 'percent':
      return `${(offer.percentBp ?? 0) / 100}% off${offer.maxDiscountMinor ? `, up to ${formatInr(offer.maxDiscountMinor)}` : ''}`;
    case 'bogo':
      return `Buy one, get one free${offer.freebieItem ? ` (${offer.freebieItem})` : ''}`;
    case 'freebie':
      return `Free ${offer.freebieItem ?? 'item'}`;
  }
}

export default function CampaignDetail({ campaignId, justSubmitted }: { campaignId: string; justSubmitted: boolean }) {
  const session = useSignedInPartner();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const query = usePartnerQuery(async () => {
    const [campaign, outlets, redemptions] = await Promise.all([
      getPartnerCampaign(session, campaignId),
      listPartnerOutlets(session),
      listPartnerRedemptions(session, { campaignId, limit: 10 }),
    ]);
    return { campaign, outlets, redemptions };
  }, `${session.partner.id}:${campaignId}`);

  if (query.error && !query.data) {
    return (
      <>
        <BackLink />
        <ErrorNote message={query.error} onRetry={query.reload} />
      </>
    );
  }
  if (!query.data) return <LoadingBlock />;

  const { campaign, outlets, redemptions } = query.data;
  const canWrite = can(session.user.role, 'campaigns.write');
  const started = ['live', 'paused', 'ended'].includes(campaign.status);
  const campaignOutlets = outlets.filter((outlet) => campaign.outletIds.includes(outlet.id));

  async function togglePause() {
    setBusy(true);
    setActionError(null);
    try {
      const updated = await setCampaignPaused(session, campaign.id, campaign.status === 'live');
      query.setData((current) => (current ? { ...current, campaign: { ...updated } } : current));
    } catch (caught) {
      setActionError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <BackLink />
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <StatusPill status={campaign.status} />
            <span className="font-semibold text-ink">{campaign.offer.label}</span>
          </span>
        }
        title={campaign.headline}
        description={campaign.description}
        actions={
          canWrite ? (
            <>
              {campaign.status === 'live' || campaign.status === 'paused' ? (
                <button type="button" onClick={togglePause} disabled={busy} className={secondaryButtonClass}>
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : campaign.status === 'live' ? (
                    <Pause className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Play className="h-4 w-4" aria-hidden="true" />
                  )}
                  {campaign.status === 'live' ? 'Pause' : 'Resume'}
                </button>
              ) : null}
              <Link href={`/partner/campaigns/new?from=${encodeURIComponent(campaign.id)}`} className={secondaryButtonClass}>
                <Copy className="h-4 w-4" aria-hidden="true" />
                {campaign.status === 'rejected' ? 'Edit & resubmit' : 'Duplicate'}
              </Link>
            </>
          ) : null
        }
      />

      <div className="space-y-3">
        {actionError ? <ErrorNote message={actionError} /> : null}
        {justSubmitted && campaign.status === 'in_review' ? (
          <Banner tone="ok" icon={CheckCircle2} title="Submitted for review">
            Lessgo usually reviews new campaigns within one business day. We’ll email {session.partner.contactEmail} when it’s
            approved — it then goes live on the start date.
          </Banner>
        ) : null}
        {campaign.status === 'rejected' && campaign.reviewNote ? (
          <Banner tone="down" icon={XCircle} title="Lessgo asked for changes">
            {campaign.reviewNote}
          </Banner>
        ) : null}
        {campaign.status === 'paused' ? (
          <Banner tone="warn" icon={Pause} title="Paused">
            The offer is out of the Vibes tray. Codes people already claimed stay valid until they expire — keep honouring
            them at the counter.
          </Banner>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {started ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatTile label="Claimed" value={formatCount(campaign.stats.claims)} icon={Ticket} accent="text-events" />
                <StatTile
                  label="Redeemed"
                  value={formatCount(campaign.stats.redeemed)}
                  icon={TicketCheck}
                  accent="text-ok"
                  hint={
                    campaign.voucherPolicy.redemptionLimit
                      ? `of ${formatCount(campaign.voucherPolicy.redemptionLimit)} allowed`
                      : 'No limit'
                  }
                />
                <StatTile label="Discount given" value={formatInrCompact(campaign.stats.discountMinor)} icon={IndianRupee} accent="text-split" />
                <StatTile label="Sales via Lessgo" value={formatInrCompact(campaign.stats.gmvMinor)} icon={TrendingUp} accent="text-profile" />
              </div>
              <Card title="Funnel">
                <Funnel totals={campaign.stats} />
              </Card>
            </>
          ) : (
            <Card title="Audience reach">
              <p className="font-display text-3xl font-extrabold text-ink">≈ {formatCount(campaign.stats.reach)}</p>
              <p className="mt-1 text-sm text-ink-muted">
                people currently match this audience. Performance shows up here once the campaign is live.
              </p>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Offer">
              <dl className="space-y-3 text-sm">
                <Row label="Discount">{describeOffer(campaign.offer)}</Row>
                <Row label="Minimum bill">{campaign.offer.minBillMinor ? formatInr(campaign.offer.minBillMinor) : 'None'}</Row>
                <Row label="Group size">{campaign.offer.minGroupSize}+ people going (host included)</Row>
                <Row label="Event default">
                  {eventTypeLabel(campaign.eventDefaults.eventType)} · “{campaign.eventDefaults.name}”
                </Row>
              </dl>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-muted">Terms</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink">
                {campaign.terms.map((term) => (
                  <li key={term}>{term}</li>
                ))}
              </ul>
            </Card>

            <Card title="Vouchers & schedule">
              <dl className="space-y-3 text-sm">
                <Row label="Code format">
                  <span className="font-mono">{campaign.voucherPolicy.codePrefix}-XXXX-XXXX-X</span>
                </Row>
                <Row label="Valid for">{campaign.voucherPolicy.validityDays} days after claiming</Row>
                <Row label="Per person">{campaign.voucherPolicy.perUserLimit} voucher{campaign.voucherPolicy.perUserLimit > 1 ? 's' : ''}</Row>
                <Row label="Total limit">
                  {campaign.voucherPolicy.redemptionLimit ? `${formatCount(campaign.voucherPolicy.redemptionLimit)} redemptions` : 'Unlimited'}
                </Row>
                <Row label="Daily limit">
                  {campaign.voucherPolicy.dailyLimit ? `${formatCount(campaign.voucherPolicy.dailyLimit)} new vouchers a day` : 'Unlimited'}
                </Row>
                <Row label="Runs">
                  {formatDate(campaign.schedule.startAt)} – {formatDate(campaign.schedule.endAt)}
                </Row>
              </dl>
            </Card>

            <Card title="Audience">
              <dl className="space-y-3 text-sm">
                <Row label="People">
                  {describeAges(campaign.targeting)} · {describeGender(campaign.targeting)}
                </Row>
              </dl>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-muted">Shown in</p>
              <ChipList values={ruleNames(campaign.targeting.geo?.include)} empty="All of India" tone="include" />
              {ruleNames(campaign.targeting.geo?.exclude).length > 0 ? (
                <>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-muted">Not shown in</p>
                  <ChipList values={ruleNames(campaign.targeting.geo?.exclude)} empty="" tone="exclude" />
                </>
              ) : null}
              <p className="mt-4 text-xs text-ink-muted">
                Matched against each user’s home location, which only changes when they refresh it in the app.
              </p>
            </Card>

            <Card title="Where events can happen">
              {campaignOutlets.length === 0 ? (
                <p className="text-sm text-ink-muted">Anywhere — groups pick their own venue.</p>
              ) : (
                <ul className="space-y-3">
                  {campaignOutlets.map((outlet) => (
                    <li key={outlet.id} className="flex gap-2.5 text-sm">
                      <MapPin className="mt-0.5 h-4 w-4 flex-none text-events" aria-hidden="true" />
                      <span>
                        <span className="block font-semibold text-ink">{outlet.name}</span>
                        <span className="block text-xs text-ink-muted">
                          {outlet.address} · {outlet.pincode}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {started ? (
            <Card title="Latest redemptions">
              <RedemptionTable rows={redemptions} campaigns={[campaign]} outlets={outlets} showCampaign={false} />
            </Card>
          ) : null}
        </div>

        <aside className="xl:sticky xl:top-8 xl:self-start">
          <p className="mb-3 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <Users className="h-3.5 w-3.5" aria-hidden="true" /> In the app
          </p>
          <CampaignPreview
            partner={session.partner}
            headline={campaign.headline}
            description={campaign.description}
            offerLabel={campaign.offer.label}
            storyImageUrl={campaign.creative.storyImageUrl}
            terms={campaign.terms}
            minGroupSize={campaign.offer.minGroupSize}
          />
        </aside>
      </div>
    </>
  );
}

function BackLink() {
  return (
    <Link href="/partner/campaigns" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Campaigns
    </Link>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}

function ChipList({ values, empty, tone }: { values: string[]; empty: string; tone: 'include' | 'exclude' }) {
  if (values.length === 0) return <p className="mt-2 text-sm text-ink">{empty}</p>;
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {values.map((value) => (
        <li
          key={value}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            tone === 'include' ? 'bg-groups-tint text-groups' : 'bg-down-tint text-down'
          }`}
        >
          {value}
        </li>
      ))}
    </ul>
  );
}

function Banner({
  tone,
  icon: Icon,
  title,
  children,
}: {
  tone: 'ok' | 'warn' | 'down';
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  const styles = {
    ok: 'border-ok bg-ok-tint',
    warn: 'border-warn bg-warn-tint',
    down: 'border-down bg-down-tint',
  }[tone];
  const iconColor = { ok: 'text-ok', warn: 'text-warn', down: 'text-down' }[tone];
  return (
    <div role="status" className={`flex gap-3 rounded-md border px-4 py-3 text-sm text-ink ${styles}`}>
      <Icon className={`mt-0.5 h-4 w-4 flex-none ${iconColor}`} aria-hidden="true" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-ink-muted">{children}</p>
      </div>
    </div>
  );
}
