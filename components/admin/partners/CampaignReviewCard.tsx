'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AlertTriangle, CalendarRange, CircleCheck, Globe, Loader2, MapPin, Ticket, Undo2, Users } from 'lucide-react';
import AdminConfirmDialog from '@ui/admin/AdminConfirmDialog';
import { BrandAvatar, ChannelBadge } from '@ui/partner/ui';
import { reviewPartnerCampaign } from '@web/lib/adminPartnersApi';
import {
  BOOKING_PRODUCT_DETAILS,
  CHANNEL_DETAILS,
  channelIsLive,
  httpsHostOf,
  INTEGRATION_STATUS_DETAILS,
  integrationStatus,
  isOnlineChannel,
  PLATFORM_LABEL,
  redeemedNoun,
} from '@web/lib/partner/channels';
import { formatCount, formatDate, formatRelative, isPast } from '@web/lib/partner/format';
import { summariseTargeting } from '@web/lib/partner/targetingText';
import type { AdminReviewItem, PartnerCampaign } from '@web/lib/partner/types';
import { adminCard, adminHint, adminInput, adminPrimaryButton, adminSecondaryButton, useAdminActor } from './partnerAdminUi';

export default function CampaignReviewCard({
  item,
  onReviewed,
  showPartner = true,
}: {
  item: AdminReviewItem;
  onReviewed: (campaign: PartnerCampaign) => void;
  showPartner?: boolean;
}) {
  const actor = useAdminActor();
  const { campaign, partner } = item;
  const [confirming, setConfirming] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const noteId = `review-note-${campaign.id}`;
  // Online campaigns can't run before Lessgo approves the partner's integration.
  const channelLive = channelIsLive(partner, campaign.channel);
  const blockedReason = channelLive
    ? null
    : !partner.channels.includes(campaign.channel) || !isOnlineChannel(campaign.channel)
      ? `${partner.brandName} no longer uses ${CHANNEL_DETAILS[campaign.channel].label} (${CHANNEL_DETAILS[campaign.channel].connection}). Send it back.`
      : `${partner.brandName}’s ${CHANNEL_DETAILS[campaign.channel].connection} is “${
          INTEGRATION_STATUS_DETAILS[integrationStatus(partner, campaign.channel)].label
        }”. Approve its go-live on the partner page first.`;

  async function decide(decision: 'approve' | 'reject') {
    setBusy(decision);
    setError(null);
    try {
      const updated = await reviewPartnerCampaign(
        campaign.id,
        decision === 'approve' ? { decision: 'approve' } : { decision: 'reject', note },
        { actor },
      );
      setConfirming(false);
      onReviewed(updated);
    } catch (caught) {
      setError((caught as Error).message);
      setConfirming(false);
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className={`${adminCard} flex flex-col gap-4 p-4 sm:flex-row`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={campaign.creative.storyImageUrl}
        alt={`Story creative for ${campaign.headline}`}
        className="h-44 w-full flex-none rounded-md object-cover sm:h-48 sm:w-28"
      />
      <div className="min-w-0 flex-1">
        {showPartner ? (
          <Link href={`/admin/partners/${partner.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-ink hover:text-profile">
            <BrandAvatar partner={partner} size={24} />
            {partner.brandName}
            <span className="text-xs font-normal text-ink-muted">· {partner.plan}</span>
          </Link>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-extrabold tracking-wide text-ink">{campaign.offer.label}</span>
          <ChannelBadge channel={campaign.channel} />
          <span className="text-xs text-ink-muted">
            Submitted {campaign.submittedAt ? formatRelative(campaign.submittedAt) : 'recently'}
          </span>
        </div>
        <h3 className="mt-1.5 font-display text-base font-bold leading-snug text-ink">{campaign.headline}</h3>
        {campaign.description ? <p className="mt-1 text-sm text-ink-muted">{campaign.description}</p> : null}
        <ul className="mt-2 space-y-1 text-xs text-ink-muted">
          <li className="flex gap-1.5">
            <MapPin className="mt-px h-3.5 w-3.5 flex-none" aria-hidden="true" />
            {summariseTargeting(campaign.targeting)} · ≈ {formatCount(campaign.stats.reach)} people
          </li>
          <li className="flex gap-1.5">
            <CalendarRange className="mt-px h-3.5 w-3.5 flex-none" aria-hidden="true" />
            {formatDate(campaign.schedule.startAt)} – {formatDate(campaign.schedule.endAt)} · code {campaign.voucherPolicy.codePrefix}-…
          </li>
          <li className="flex gap-1.5">
            <Users className="mt-px h-3.5 w-3.5 flex-none" aria-hidden="true" />
            Groups of {campaign.offer.minGroupSize}+ ·{' '}
            {campaign.voucherPolicy.redemptionLimit
              ? `${formatCount(campaign.voucherPolicy.redemptionLimit)} ${redeemedNoun(campaign.channel, campaign.voucherPolicy.redemptionLimit)}`
              : 'no total limit'}
            {campaign.channel === 'in_store'
              ? campaign.outletIds.length
                ? ` · ${campaign.outletIds.length} outlet${campaign.outletIds.length > 1 ? 's' : ''}`
                : ' · any venue'
              : ''}
          </li>
          {campaign.channel === 'online_code' && campaign.online ? (
            <li className="flex gap-1.5">
              <Globe className="mt-px h-3.5 w-3.5 flex-none" aria-hidden="true" />
              <span className="min-w-0">
                {campaign.online.platforms.map((platform) => PLATFORM_LABEL[platform]).join(', ')} · {campaign.online.appliesTo}
                {/* Full links, not just the host: the reviewer checks exactly where the app will send people. */}
                <span className="block break-all font-mono text-[11px] text-ink">
                  {campaign.online.landingUrl}
                  {httpsHostOf(campaign.online.landingUrl) ? '' : ' ⚠ not a valid https link'}
                </span>
                {campaign.online.applyUrlTemplate ? (
                  <span className="block break-all font-mono text-[11px] text-ink">{campaign.online.applyUrlTemplate}</span>
                ) : null}
              </span>
            </li>
          ) : null}
          {campaign.channel === 'api_booking' && campaign.booking ? (
            <li className="flex gap-1.5">
              <Ticket className="mt-px h-3.5 w-3.5 flex-none" aria-hidden="true" />
              {BOOKING_PRODUCT_DETAILS[campaign.booking.product].label} · {campaign.booking.minUnits}–{campaign.booking.maxUnits}{' '}
              {BOOKING_PRODUCT_DETAILS[campaign.booking.product].units} per booking · {campaign.booking.scope}
            </li>
          ) : null}
        </ul>
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-ink">
          {campaign.terms.map((term) => (
            <li key={term}>{term}</li>
          ))}
        </ul>

        {error ? (
          <p role="alert" className="mt-3 text-sm font-medium text-down">
            {error}
          </p>
        ) : null}

        {blockedReason ? (
          <p className="mt-3 flex gap-2 rounded-md border border-warn bg-warn-tint px-3 py-2 text-sm text-ink">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-warn" aria-hidden="true" />
            {blockedReason}
          </p>
        ) : null}

        {rejecting ? (
          <div className="mt-4">
            <label htmlFor={noteId} className="mb-1.5 block text-sm font-semibold text-ink">
              What should the partner change?
            </label>
            <textarea
              id={noteId}
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="e.g. Add the age-rating condition to the terms, then resubmit."
              className={`${adminInput} py-2`}
            />
            <p className={adminHint}>The partner sees this note on the campaign and can edit and resubmit it.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => decide('reject')} disabled={busy !== null || note.trim().length < 10} className={adminPrimaryButton}>
                {busy === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Undo2 className="h-4 w-4" aria-hidden="true" />}
                Send back to partner
              </button>
              <button type="button" onClick={() => setRejecting(false)} disabled={busy !== null} className={adminSecondaryButton}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={busy !== null || !channelLive}
              title={blockedReason ?? undefined}
              className={adminPrimaryButton}
            >
              {busy === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CircleCheck className="h-4 w-4" aria-hidden="true" />}
              Approve
            </button>
            <button type="button" onClick={() => setRejecting(true)} disabled={busy !== null} className={adminSecondaryButton}>
              <Undo2 className="h-4 w-4" aria-hidden="true" />
              Request changes
            </button>
          </div>
        )}
      </div>

      <AdminConfirmDialog
        open={confirming}
        title="Approve this campaign?"
        body={
          isPast(campaign.schedule.startAt)
            ? `“${campaign.headline}” goes live in the Vibes tray now for the people it targets.`
            : `“${campaign.headline}” is scheduled and goes live on ${formatDate(campaign.schedule.startAt)}.`
        }
        confirmLabel="Approve"
        busy={busy === 'approve'}
        onCancel={() => setConfirming(false)}
        onConfirm={() => decide('approve')}
      />
    </article>
  );
}
