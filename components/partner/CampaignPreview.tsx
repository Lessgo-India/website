'use client';

import { Plus, Ticket, Users } from 'lucide-react';
import type { PartnerAccount, RedemptionChannel } from '@web/lib/partner/types';

export interface CampaignPreviewProps {
  partner: Pick<PartnerAccount, 'brandName' | 'logoEmoji' | 'brandColor'>;
  headline: string;
  description: string;
  offerLabel: string;
  storyImageUrl: string;
  terms: string[];
  minGroupSize: number;
  /** Defaults to in-store. */
  channel?: RedemptionChannel;
  /** Name on the partner's checkout ("Book on ShowSpot"). */
  checkoutName?: string;
}

/** The chip the app's offer story shows under the badge (lessgo-react-native utils/onlineOffers.ts). */
function channelChip(channel: RedemptionChannel, name: string): string {
  if (channel === 'online_code') return `🛒 Use the code online at ${name}`;
  if (channel === 'api_booking') return `🎟️ Book in Lessgo · ${name}`;
  return '📍 Redeem at the outlet';
}

const OTHER_BRANDS = [
  { emoji: '🍕', name: 'Slice' },
  { emoji: '🎬', name: 'Reel House' },
];

/**
 * How the campaign looks in the app: the Vibes stories tray (your circle sits
 * after "+ New") and the full-screen offer story with the
 * "Create Event with Code" CTA (lessgo-react-native/app/offers/[campaignId]).
 */
export default function CampaignPreview(props: CampaignPreviewProps) {
  const { partner } = props;
  const terms = props.terms.map((term) => term.trim()).filter(Boolean);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-full max-w-[300px] rounded-lg border border-line bg-surface p-3 shadow-soft">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Vibes tray</p>
        <div className="mt-2 flex items-start gap-3 overflow-hidden">
          <TrayCircle label="New">
            <span className="flex h-full w-full items-center justify-center rounded-full border-2 border-dashed border-line-strong">
              <Plus className="h-5 w-5 text-ink-muted" aria-hidden="true" />
            </span>
          </TrayCircle>
          <TrayCircle label={partner.brandName} highlight>
            <span className="gradient-brand flex h-full w-full items-center justify-center rounded-full p-[2.5px]">
              <span className="flex h-full w-full items-center justify-center rounded-full bg-surface text-2xl">
                {partner.logoEmoji}
              </span>
            </span>
          </TrayCircle>
          {OTHER_BRANDS.filter((brand) => brand.emoji !== partner.logoEmoji).map((brand) => (
            <TrayCircle key={brand.name} label={brand.name} muted>
              <span className="flex h-full w-full items-center justify-center rounded-full border-2 border-line bg-surface-2 text-2xl">
                {brand.emoji}
              </span>
            </TrayCircle>
          ))}
        </div>
      </div>

      <div className="relative h-[560px] w-[280px] overflow-hidden rounded-[38px] border-[9px] border-brand-night bg-brand-night shadow-phone">
        {props.storyImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={props.storyImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-brand-dusk to-brand-night" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/10 to-black/85" aria-hidden="true" />

        <div className="relative flex h-full flex-col p-4 text-white">
          <div className="flex gap-1" aria-hidden="true">
            <span className="h-[3px] flex-1 rounded-full bg-white" />
            <span className="h-[3px] flex-1 rounded-full bg-white/35" />
            <span className="h-[3px] flex-1 rounded-full bg-white/35" />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-base"
              style={{ boxShadow: `0 0 0 2px ${partner.brandColor}` }}
              aria-hidden="true"
            >
              {partner.logoEmoji}
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold">{partner.brandName}</p>
              <p className="text-[11px] text-white/75">Sponsored offer</p>
            </div>
          </div>

          <div className="mt-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-extrabold tracking-wide text-brand-night">
              <Ticket className="h-3.5 w-3.5" aria-hidden="true" />
              {props.offerLabel || 'YOUR OFFER'}
            </span>
            <p className="mt-3 font-display text-xl font-extrabold leading-snug">
              {props.headline || 'Your headline appears here'}
            </p>
            {props.description ? <p className="mt-1.5 text-[13px] text-white/85">{props.description}</p> : null}
            <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-white/80">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              For groups of {props.minGroupSize}+ on Lessgo
            </p>
            <p className="mt-1 text-[12px] font-semibold text-white/90">
              {channelChip(props.channel ?? 'in_store', props.checkoutName ?? partner.brandName)}
            </p>
            {terms.length > 0 ? (
              <ul className="mt-2 space-y-0.5 text-[11px] text-white/70">
                {terms.slice(0, 3).map((term) => (
                  <li key={term} className="line-clamp-1">
                    • {term}
                  </li>
                ))}
              </ul>
            ) : null}
            <span className="gradient-brand mt-4 flex min-h-11 items-center justify-center rounded-full text-sm font-bold">
              Create Event with Code
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrayCircle({
  label,
  children,
  highlight = false,
  muted = false,
}: {
  label: string;
  children: React.ReactNode;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <span className={`flex w-[60px] flex-none flex-col items-center gap-1 ${muted ? 'opacity-45' : ''}`}>
      <span className={`h-14 w-14 ${highlight ? 'drop-shadow-md' : ''}`}>{children}</span>
      <span className={`w-full truncate text-center text-[11px] ${highlight ? 'font-semibold text-ink' : 'text-ink-muted'}`}>
        {label}
      </span>
    </span>
  );
}
