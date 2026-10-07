/**
 * Redemption channels — in-store, online checkout code, booking via the
 * partner's API — and the pure rules both portals share about them.
 *
 * Self-contained on purpose (type-only imports) so the node test runner can
 * load it directly — see channels.test.mjs. The offers service enforces the
 * same rules (allowed domains, go-live) server-side.
 */
import type { DraftPartnerContext } from './rules';
import type {
  BookingConnectMethod,
  BookingProduct,
  CampaignStats,
  CheckoutPlatform,
  IntegrationStatus,
  OnlineCheckoutConfig,
  PartnerAccount,
  RedemptionChannel,
} from './types';

export const REDEMPTION_CHANNELS: readonly RedemptionChannel[] = ['in_store', 'online_code', 'api_booking'];

export type OnlineChannel = Exclude<RedemptionChannel, 'in_store'>;

export const ONLINE_CHANNELS: readonly OnlineChannel[] = ['online_code', 'api_booking'];

export function isOnlineChannel(channel: RedemptionChannel): channel is OnlineChannel {
  return channel !== 'in_store';
}

export const CHANNEL_DETAILS: Record<
  RedemptionChannel,
  {
    label: string;
    /** Mid-sentence name, e.g. "Reel House’s booking API connection isn’t live yet". */
    connection: string;
    emoji: string;
    summary: string;
    confirmation: string;
    examples: string;
  }
> = {
  in_store: {
    label: 'In-store',
    connection: 'in-store redemption',
    emoji: '📍',
    summary: 'Groups show a rotating Lessgo QR at your outlets; staff confirm it in the Redeem console or your POS.',
    confirmation: 'Redeem console, POS API or webhook',
    examples: 'Restaurants, cafés, bowling, cinema box offices',
  },
  online_code: {
    label: 'Online checkout',
    connection: 'online checkout connection',
    emoji: '🛒',
    summary: 'Groups apply a unique Lessgo code on your website or app; your checkout checks it with the Lessgo Partner API.',
    confirmation: 'Partner API: validate → redeem',
    examples: 'Fashion & lifestyle stores, D2C brands, food ordering',
  },
  api_booking: {
    label: 'Bookings via API',
    connection: 'booking API connection',
    emoji: '🎟️',
    summary: 'Groups book inside Lessgo; Lessgo calls your booking API with the coupon and they pay on your checkout.',
    confirmation: 'Booking webhook (booking.confirmed)',
    examples: 'Movie & event ticketing, hotels, buses, flights',
  },
};

export const BOOKING_PRODUCT_DETAILS: Record<
  BookingProduct,
  { label: string; unit: string; units: string; perPerson: boolean }
> = {
  movie_tickets: { label: 'Movie tickets', unit: 'ticket', units: 'tickets', perPerson: true },
  event_tickets: { label: 'Event tickets', unit: 'ticket', units: 'tickets', perPerson: true },
  flights: { label: 'Flights', unit: 'seat', units: 'seats', perPerson: true },
  hotels: { label: 'Hotels & stays', unit: 'room', units: 'rooms', perPerson: false },
  buses: { label: 'Bus tickets', unit: 'seat', units: 'seats', perPerson: true },
  activities: { label: 'Activities', unit: 'slot', units: 'slots', perPerson: true },
};

export const BOOKING_PRODUCTS = Object.keys(BOOKING_PRODUCT_DETAILS) as BookingProduct[];

export const BOOKING_METHOD_DETAILS: Record<BookingConnectMethod, { label: string; summary: string }> = {
  lessgo_connect: {
    label: 'Lessgo Connect',
    summary: 'The partner implements Lessgo’s booking API: inventory, quotes with the coupon, bookings, webhooks.',
  },
  adapter: {
    label: 'Lessgo-built adapter',
    summary: 'Lessgo maps the partner’s existing booking API. For large ticketing and travel platforms.',
  },
};

export const PLATFORM_LABEL: Record<CheckoutPlatform, string> = {
  web: 'Website',
  android: 'Android app',
  ios: 'iOS app',
};

export const CHECKOUT_PLATFORMS = Object.keys(PLATFORM_LABEL) as CheckoutPlatform[];

export const INTEGRATION_STATUS_DETAILS: Record<
  IntegrationStatus,
  { label: string; tone: 'neutral' | 'warn' | 'info' | 'ok'; summary: string }
> = {
  not_connected: { label: 'Not connected', tone: 'neutral', summary: 'Nothing configured yet.' },
  testing: { label: 'Testing', tone: 'warn', summary: 'Configured; sandbox checks not passed or go-live not requested.' },
  ready_for_review: { label: 'Awaiting go-live', tone: 'info', summary: 'Sandbox passed; waiting for Lessgo to approve production.' },
  live: { label: 'Live', tone: 'ok', summary: 'Approved for production; campaigns on this channel can run.' },
};

/** Navigation label for the page listing online orders and bookings. */
export function salesLabel(channels: readonly RedemptionChannel[]): string | null {
  const orders = channels.includes('online_code');
  const bookings = channels.includes('api_booking');
  if (orders && bookings) return 'Orders & bookings';
  if (orders) return 'Orders';
  if (bookings) return 'Bookings';
  return null;
}

/** "redemption", "order" or "booking" — what a confirmed coupon use is called. */
export function redeemedNoun(channel: RedemptionChannel, count = 1): string {
  const noun = channel === 'in_store' ? 'redemption' : channel === 'online_code' ? 'order' : 'booking';
  return count === 1 ? noun : `${noun}s`;
}

/** Funnel rows for a campaign on `channel`, top to bottom. */
export function funnelSteps(channel: RedemptionChannel): { key: keyof CampaignStats; label: string }[] {
  const top: { key: keyof CampaignStats; label: string }[] = [
    { key: 'impressions', label: 'Story views' },
    { key: 'opens', label: 'Opened the offer' },
    { key: 'claims', label: 'Claimed a code' },
    { key: 'eventsCreated', label: 'Created an event' },
    { key: 'applied', label: 'Applied the coupon' },
  ];
  if (channel === 'online_code') {
    return [...top, { key: 'checkouts', label: 'Opened your checkout' }, { key: 'redeemed', label: 'Ordered with the code' }];
  }
  if (channel === 'api_booking') {
    return [...top, { key: 'checkouts', label: 'Priced a booking' }, { key: 'redeemed', label: 'Booked through Lessgo' }];
  }
  return [...top, { key: 'redeemed', label: 'Redeemed with you' }];
}

// ── Partner domains ─────────────────────────────────────────────────────────

const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/** Two or more DNS labels, 253 characters at most (no lookbehind: older Safari can't parse it). */
function isHostname(host: string): boolean {
  const labels = host.split('.');
  return host.length <= 253 && labels.length >= 2 && labels.every((label) => LABEL.test(label));
}

/**
 * Characters `new URL` silently drops or rewrites (backslashes, whitespace,
 * control characters). Other parsers — e.g. Android's Uri — read such URLs
 * differently, so they're rejected rather than normalised.
 */
const UNSAFE_URL_CHARS = /[\\\s\u0000-\u001f\u007f]/;

/** The raw `user@host:port` part of a URL, before any parser normalises it. */
function rawAuthority(value: string): string | null {
  const match = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]*)/i.exec(value);
  return match ? match[1] : null;
}

/** "https://Shop.Example.com/x" or "shop.example.com" → "shop.example.com"; null if invalid. */
export function normaliseDomain(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed || UNSAFE_URL_CHARS.test(trimmed)) return null;
  let host = trimmed;
  if (/^[a-z][a-z0-9+.-]*:\/\//.test(trimmed)) {
    if (rawAuthority(trimmed)?.includes('@')) return null;
    try {
      const url = new URL(trimmed);
      if (url.username || url.password || url.port) return null;
      host = url.hostname;
    } catch {
      return null;
    }
  } else if (/[/?#@:]/.test(trimmed)) {
    return null;
  }
  host = host.replace(/\.$/, '');
  return isHostname(host) ? host : null;
}

/** Hostname of an https URL without credentials or a custom port, else null. */
export function httpsHostOf(value: string): string | null {
  const raw = value.trim();
  const authority = rawAuthority(raw);
  if (UNSAFE_URL_CHARS.test(raw) || !authority || authority.includes('@')) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    return url.hostname.toLowerCase().replace(/\.$/, '');
  } catch {
    return null;
  }
}

/** True for https URLs on one of `allowedDomains` (exact host or a subdomain of it). */
export function isAllowedPartnerUrl(value: string, allowedDomains: readonly string[]): boolean {
  const host = httpsHostOf(value);
  if (!host) return false;
  return allowedDomains.some((domain) => {
    const allowed = normaliseDomain(domain);
    return !!allowed && (host === allowed || host.endsWith(`.${allowed}`));
  });
}

/** The partner's website host plus its checkout domains. */
export function partnerAllowedDomains(partner: Pick<PartnerAccount, 'website' | 'integration'>): string[] {
  const domains = new Set<string>();
  const websiteHost = partner.website ? httpsHostOf(partner.website) : null;
  if (websiteHost) domains.add(websiteHost);
  for (const domain of partner.integration.checkout?.allowedDomains ?? []) {
    const normalised = normaliseDomain(domain);
    if (normalised) domains.add(normalised);
  }
  return [...domains];
}

/** `domain` is `base` or one of its subdomains ("www." on the base is ignored). */
export function isWithinDomain(domain: string, base: string): boolean {
  const root = base.replace(/^www\./, '');
  return domain === root || domain.endsWith(`.${root}`);
}

/** What the partner's campaign drafts may use; same checks as the offers service. */
export function draftContextFor(
  partner: Pick<PartnerAccount, 'channels' | 'website' | 'integration'>,
): DraftPartnerContext {
  const domains = partnerAllowedDomains(partner);
  return {
    channels: partner.channels,
    bookingProducts: partner.integration.booking?.products ?? [],
    isAllowedUrl: (url) => isAllowedPartnerUrl(url, domains),
  };
}

export const CODE_TOKEN = '{code}';

/**
 * The link "Shop on <brand>" opens: the apply template with the code filled
 * in (URL-encoded), else the landing page. Null unless it's on an allowed
 * domain — the offers service applies the same check before returning it.
 */
export function buildCheckoutLink(
  online: Pick<OnlineCheckoutConfig, 'landingUrl' | 'applyUrlTemplate'>,
  code: string,
  allowedDomains: readonly string[],
): string | null {
  const url = online.applyUrlTemplate?.includes(CODE_TOKEN)
    ? online.applyUrlTemplate.split(CODE_TOKEN).join(encodeURIComponent(code))
    : online.landingUrl;
  return isAllowedPartnerUrl(url, allowedDomains) ? url : null;
}

// ── Go-live ─────────────────────────────────────────────────────────────────

export function integrationStatus(
  partner: Pick<PartnerAccount, 'integration'>,
  channel: OnlineChannel,
): IntegrationStatus {
  const integration = channel === 'online_code' ? partner.integration.checkout : partner.integration.booking;
  return integration?.status ?? 'not_connected';
}

/** Whether campaigns on `channel` can run: in-store always, online channels once Lessgo approved them. */
export function channelIsLive(
  partner: Pick<PartnerAccount, 'channels' | 'integration'>,
  channel: RedemptionChannel,
): boolean {
  if (!partner.channels.includes(channel)) return false;
  return channel === 'in_store' || integrationStatus(partner, channel) === 'live';
}
