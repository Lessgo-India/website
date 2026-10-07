/**
 * Partner (merchant) portal contracts.
 *
 * The campaign/targeting shapes mirror the mobile client contracts
 * (lessgo-react-native/types/offers.ts) because the portal is where those
 * campaigns are authored: whatever a merchant saves here is what the Vibes
 * offers tray renders. Money is always in paise (`…Minor`), percentages in
 * basis points, dates as ISO strings.
 *
 * TODO(backend): these become the backend-offers-service partner API DTOs
 * (snake_case on the wire, mapped in partnerApi.ts).
 */

export type OfferDiscountType = 'flat' | 'percent' | 'bogo' | 'freebie';

export type AgeBracket = '18-24' | '25-34' | '35-44' | '45-54' | '55+';

export type OfferGender = 'all' | 'M' | 'F';

/** State codes / district ids from web/lib/partner/indiaGeo.ts. */
export interface OfferGeoRule {
  states?: string[];
  districts?: string[];
}

export interface OfferTargeting {
  /** Empty/undefined = every adult (18+). Under-18s never see offers. */
  ageBrackets?: AgeBracket[];
  gender?: OfferGender;
  /** Undefined = All India. Most specific rule wins (district beats state). */
  geo?: { include?: OfferGeoRule; exclude?: OfferGeoRule };
}

/**
 * How a group uses a Lessgo coupon with a partner. Partners get their
 * channels at onboarding (see PARTNER_CATEGORY_DETAILS in onboarding.ts);
 * every campaign has exactly one, so each voucher has one redemption path:
 * - in_store:    the host shows the rotating QR/code at an outlet
 * - online_code: the host applies the unique code at the partner's own
 *                checkout, which checks it with the Lessgo Partner API
 * - api_booking: the host books inside Lessgo; Lessgo calls the partner's
 *                booking API with the coupon ("Lessgo Connect")
 */
export type RedemptionChannel = 'in_store' | 'online_code' | 'api_booking';

/** What an api_booking partner sells through Lessgo. */
export type BookingProduct = 'movie_tickets' | 'event_tickets' | 'flights' | 'hotels' | 'buses' | 'activities';

export type CheckoutPlatform = 'web' | 'android' | 'ios';

/** online_code campaigns: where and how the code is used. */
export interface OnlineCheckoutConfig {
  /** https page "Shop on <brand>" opens; must be on the partner's allowed domains. */
  landingUrl: string;
  /** Optional link that pre-applies the code; contains the literal token {code}. */
  applyUrlTemplate?: string;
  platforms: CheckoutPlatform[];
  /** Shown with the terms, e.g. "Fashion & footwear, except gift cards". */
  appliesTo: string;
  /**
   * lessgo:       unique Lessgo codes the partner's checkout checks through
   *               POST /partner-api/v1/vouchers/{validate,redeem,reverse}
   * partner_pool: codes the partner uploaded; orders reported by webhook
   */
  codeSource: 'lessgo' | 'partner_pool';
}

/** api_booking campaigns: what the group can book through Lessgo. */
export interface BookingConfig {
  product: BookingProduct;
  /** Tickets / rooms / seats in one booking. */
  minUnits: number;
  maxUnits: number;
  /** Shown with the terms, e.g. "All 2D & 3D shows at partner cinemas". */
  scope: string;
}

export interface CampaignOffer {
  type: OfferDiscountType;
  /** Flat discount in paise (type "flat"). */
  valueMinor?: number;
  /** Percentage in basis points (type "percent"). */
  percentBp?: number;
  maxDiscountMinor?: number;
  minBillMinor?: number;
  /** Accepted members (host included) needed before the coupon can be applied. */
  minGroupSize: number;
  /** What a "bogo"/"freebie" coupon gets the group, e.g. "Dessert platter". */
  freebieItem?: string;
  /** Short display label, e.g. "₹200 OFF". */
  label: string;
}

export interface VoucherPolicy {
  /** 2–5 uppercase letters, e.g. "BRB" → BRB-7KQ4-M2XD-R. */
  codePrefix: string;
  /** Days a claimed voucher stays valid (capped by the campaign end). */
  validityDays: number;
  /** Total redemptions across all users; null = unlimited. */
  redemptionLimit: number | null;
  /** New vouchers issued per day; null = unlimited. */
  dailyLimit: number | null;
  /** Vouchers one user can claim over the campaign. */
  perUserLimit: number;
}

export type CampaignStatus =
  | 'draft'
  | 'in_review'
  | 'scheduled'
  | 'live'
  | 'paused'
  | 'ended'
  | 'rejected';

export interface CampaignStats {
  /** Users currently matching the audience (eligible to see the story). */
  reach: number;
  impressions: number;
  opens: number;
  claims: number;
  eventsCreated: number;
  applied: number;
  redeemed: number;
  discountMinor: number;
  /** Gross value before the discount: outlet bills, online orders or bookings. */
  gmvMinor: number;
  /** online_code: "Shop" taps that opened the partner's checkout; api_booking: priced booking quotes. */
  checkouts: number;
  /** api_booking: tickets / rooms / seats booked. */
  units: number;
  /** Orders or bookings the partner cancelled or refunded afterwards (coupon reversed). */
  reversed: number;
}

export interface PartnerCampaign {
  id: string;
  partnerId: string;
  status: CampaignStatus;
  headline: string;
  description: string;
  terms: string[];
  creative: {
    /** 9:16 story creative shown in the Vibes viewer. */
    storyImageUrl: string;
    /** Event cover used when a user creates an event from the offer. */
    coverImageUrl: string;
  };
  offer: CampaignOffer;
  voucherPolicy: VoucherPolicy;
  targeting: OfferTargeting;
  /** How the coupon is redeemed — one of the partner's channels. */
  channel: RedemptionChannel;
  /** online_code campaigns only. */
  online?: OnlineCheckoutConfig;
  /** api_booking campaigns only. */
  booking?: BookingConfig;
  /** in_store only: when non-empty, the event location must be one of these outlets. */
  outletIds: string[];
  schedule: { startAt: string; endAt: string };
  eventDefaults: { eventType: string; name: string };
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  /** Lessgo review feedback (rejections, requested edits). */
  reviewNote?: string;
  /** When a Lessgo admin last approved or sent back the campaign. */
  reviewedAt?: string;
  stats: CampaignStats;
}

export type PartnerRole = 'owner' | 'manager' | 'cashier';

export type PartnerPlan = 'pilot' | 'standard' | 'enterprise';

/**
 * invited   — onboarded by Lessgo; the owner hasn't set their own password yet
 * active    — the owner has signed in at least once
 * suspended — logins are blocked and offers are hidden from the Vibes tray
 */
export type PartnerStatus = 'invited' | 'active' | 'suspended';

/**
 * Online integration lifecycle (one per online channel):
 * not_connected → testing (configured, sandbox checks running)
 * → ready_for_review (sandbox passed, partner asked for go-live)
 * → live (a Lessgo admin approved production). Admins can roll a live
 * channel back to testing, which pauses its live campaigns.
 */
export type IntegrationStatus = 'not_connected' | 'testing' | 'ready_for_review' | 'live';

export interface IntegrationTestStep {
  label: string;
  /** e.g. "POST /lessgo/v1/quotes". */
  request: string;
  ok: boolean;
  latencyMs: number;
  /** Response summary or the failure reason. */
  detail: string;
}

export interface IntegrationTestRun {
  at: string;
  ok: boolean;
  /** Sandbox or live endpoint the run used. */
  environment: 'sandbox' | 'live';
  steps: IntegrationTestStep[];
}

/** online_code: the partner's checkout checks Lessgo codes through the Partner API. */
export interface CheckoutIntegration {
  status: IntegrationStatus;
  /** Hosts the partner's checkout runs on; every link Lessgo opens must be on one. */
  allowedDomains: string[];
  /** Partner API keys (lgp_test_… / lgp_live_…); only previews are ever shown again. */
  sandboxKeyPreview: string;
  liveKeyPreview?: string;
  lastTest?: IntegrationTestRun;
  goLiveRequestedAt?: string;
  liveSince?: string;
}

/**
 * lessgo_connect: the partner implements Lessgo's booking API spec.
 * adapter:        Lessgo maintains a connector to the partner's existing API
 *                 (large ticketing/travel aggregators).
 */
export type BookingConnectMethod = 'lessgo_connect' | 'adapter';

export type BookingAuthType = 'oauth2_client_credentials' | 'api_key';

/** api_booking: how Lessgo reaches the partner's booking API. */
export interface BookingIntegration {
  status: IntegrationStatus;
  method: BookingConnectMethod;
  products: BookingProduct[];
  sandboxBaseUrl?: string;
  liveBaseUrl?: string;
  auth: BookingAuthType;
  clientId?: string;
  /** The secret is write-only; only its last characters are shown. */
  secretPreview?: string;
  lastTest?: IntegrationTestRun;
  goLiveRequestedAt?: string;
  liveSince?: string;
}

export interface PartnerAccount {
  id: string;
  /** User-ID prefix every login of this partner shares, e.g. "brewbros". */
  handle: string;
  status: PartnerStatus;
  brandName: string;
  legalName: string;
  logoEmoji: string;
  brandColor: string;
  category: string;
  /** Redemption channels decided at onboarding; at least one. */
  channels: RedemptionChannel[];
  /** https home page; required for online channels. */
  website?: string;
  gstin: string;
  contactName: string;
  contactEmail: string;
  /** 10-digit Indian mobile number. */
  contactPhone: string;
  city: string;
  /** State/UT code from indiaGeo.ts, e.g. "KA". */
  stateCode: string;
  plan: PartnerPlan;
  onboardedAt: string;
  /** When the owner first signed in. */
  activatedAt?: string;
  suspendedAt?: string;
  suspendedReason?: string;
  integration: {
    /** Only the last characters are ever shown after creation. */
    apiKeyPreview: string;
    /** Enterprise POS/back-office webhook for redemption confirmations. */
    webhookUrl?: string;
    webhookSecretPreview?: string;
    /** online_code partners. */
    checkout?: CheckoutIntegration;
    /** api_booking partners. */
    booking?: BookingIntegration;
  };
}

export interface PartnerUser {
  /** The user ID Lessgo issues at onboarding, e.g. "brewbros.owner". */
  userId: string;
  partnerId: string;
  name: string;
  email: string;
  /** The login holder's 10-digit mobile, for SMS invites and resets. */
  phone?: string;
  role: PartnerRole;
  /** Cashier logins (in-store partners only) are scoped to one outlet. */
  outletId?: string;
  lastActiveAt?: string;
}

export type PartnerLoginStatus = 'active' | 'disabled';

/** A login as Lessgo admins and the partner's own team page see it. */
export interface PartnerLogin extends PartnerUser {
  status: PartnerLoginStatus;
  /** A temporary password is outstanding (never signed in, or just reset). */
  mustChangePassword: boolean;
  credentialIssuedAt: string;
  /** When the outstanding temporary password stops working. */
  temporaryExpiresAt?: string;
  lastSignInAt?: string;
}

export type CredentialChannel = 'email' | 'sms';

export interface CredentialDispatch {
  channel: CredentialChannel;
  /** Email address or 10-digit mobile number. */
  to: string;
  /** The offers service hands delivery to backend-notification-service. */
  status: 'queued' | 'failed';
}

/**
 * Returned exactly once when Lessgo issues or resets a login. The temporary
 * password is never stored in plain text and can't be fetched again — a lost
 * one is replaced with "Reset password".
 */
export interface IssuedCredential {
  userId: string;
  temporaryPassword: string;
  expiresAt: string;
  loginUrl: string;
  dispatch: CredentialDispatch[];
}

export interface PartnerOnboardingInput {
  brandName: string;
  legalName: string;
  category: string;
  /** Defaults from the category; at least one. */
  channels: RedemptionChannel[];
  /** https home page; required when an online channel is picked. */
  website: string;
  /** api_booking: what the partner sells through Lessgo. */
  bookingProducts: BookingProduct[];
  /** api_booking: who builds the connection. */
  bookingMethod: BookingConnectMethod;
  gstin: string;
  city: string;
  stateCode: string;
  logoEmoji: string;
  brandColor: string;
  plan: PartnerPlan;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  /** Becomes `<handle>.owner` and the prefix of every later login. */
  handle: string;
  owner: { name: string; email: string; phone: string };
  dispatch: { email: boolean; sms: boolean };
}

export interface NewPartnerLoginInput {
  name: string;
  email: string;
  /** Stored on the login; SMS invites and resets go to it. */
  phone?: string;
  role: PartnerRole;
  /** Required for cashiers. */
  outletId?: string;
  dispatch: { email: boolean; sms: boolean };
}

export interface PartnerAuditEntry {
  id: string;
  partnerId: string;
  at: string;
  /** Admin phone/ID, a partner user ID, or "system". */
  actor: string;
  action:
    | 'partner.onboarded'
    | 'partner.activated'
    | 'partner.suspended'
    | 'partner.reactivated'
    | 'login.issued'
    | 'login.reset'
    | 'login.disabled'
    | 'login.enabled'
    | 'login.password_set'
    | 'campaign.submitted'
    | 'campaign.approved'
    | 'campaign.rejected'
    | 'partner.channels_changed'
    | 'integration.updated'
    | 'integration.tested'
    | 'integration.go_live_requested'
    | 'integration.approved'
    | 'integration.rolled_back';
  detail: string;
}

export interface AdminPartnerSummary {
  partner: PartnerAccount;
  logins: number;
  /** Logins with an outstanding temporary password. */
  pendingLogins: number;
  outlets: number;
  liveCampaigns: number;
  inReview: number;
  lastSignInAt?: string;
}

export type AdminPartnerBadge = Pick<
  PartnerAccount,
  'id' | 'brandName' | 'logoEmoji' | 'brandColor' | 'plan' | 'status' | 'channels' | 'integration'
>;

export interface AdminReviewItem {
  campaign: PartnerCampaign;
  partner: AdminPartnerBadge;
}

/** An online channel whose owner asked Lessgo to approve production. */
export interface AdminGoLiveRequest {
  partner: AdminPartnerBadge;
  channel: Exclude<RedemptionChannel, 'in_store'>;
  requestedAt: string;
  lastTest?: IntegrationTestRun;
}

export interface AdminPartnersOverview {
  partners: AdminPartnerSummary[];
  reviewQueue: AdminReviewItem[];
  goLiveQueue: AdminGoLiveRequest[];
}

/** Admin → partner channels (PATCH /admin/partners/:id/channels). */
export interface PartnerChannelsInput {
  channels: RedemptionChannel[];
  website?: string;
  bookingProducts?: BookingProduct[];
  bookingMethod?: BookingConnectMethod;
}

export interface AdminPartnerDetail {
  partner: PartnerAccount;
  logins: PartnerLogin[];
  outlets: PartnerOutlet[];
  campaigns: PartnerCampaign[];
  activity: PartnerAuditEntry[];
}

export type CampaignReviewDecision = { decision: 'approve' } | { decision: 'reject'; note: string };

/** Partner → checkout integration settings (PUT /api/partner/integrations/checkout). */
export interface CheckoutIntegrationInput {
  allowedDomains: string[];
}

/** Partner → booking API connection (PUT /api/partner/integrations/booking). */
export interface BookingIntegrationInput {
  sandboxBaseUrl: string;
  liveBaseUrl?: string;
  auth: BookingAuthType;
  clientId: string;
  /** Write-only. Omit to keep the stored secret. */
  clientSecret?: string;
}

export interface PartnerSession {
  /** DUMMY opaque token. The real session is an httpOnly cookie. */
  token: string;
  user: PartnerUser;
  partner: PartnerAccount;
  signedInAt: string;
  expiresAt: number;
}

export interface PartnerOutlet {
  id: string;
  partnerId: string;
  name: string;
  address: string;
  pincode: string;
  stateCode: string;
  districtId: string;
  /** [latitude, longitude] */
  coordinates: [number, number];
  status: 'active' | 'paused';
}

export type PartnerVoucherStatus = 'claimed' | 'attached' | 'applied' | 'redeemed' | 'expired';

/** What the redeem console sees after looking a code up. */
export interface PartnerVoucherLookup {
  voucherId: string;
  code: string;
  maskedCode: string;
  campaignId: string;
  campaignHeadline: string;
  offer: CampaignOffer;
  status: PartnerVoucherStatus;
  /** First name + initial only; merchants never see phone numbers. */
  holderDisplayName: string;
  eventName: string;
  eventStartAt: string;
  acceptedCount: number;
  /** Outlet picked for the event when the campaign restricts outlets. */
  outletId?: string;
  validUntil: string;
  redeemedAt?: string;
  redemptionId?: string;
}

/**
 * console:         staff confirmed it in the Redeem console
 * api / webhook:   the partner's POS reported it
 * checkout_api:    the partner's online checkout redeemed the code (Partner API)
 * booking_webhook: the partner confirmed a booking made through Lessgo
 */
export type RedemptionSource = 'console' | 'webhook' | 'api' | 'checkout_api' | 'booking_webhook';

export interface PartnerRedemption {
  id: string;
  voucherId: string;
  maskedCode: string;
  campaignId: string;
  channel: RedemptionChannel;
  /** in_store only. */
  outletId?: string;
  /** Console redemptions; empty for automated sources. */
  staffUserId: string;
  holderDisplayName: string;
  groupSize: number;
  /** Gross before the discount: outlet bill, order value, or booking subtotal + fees. */
  billMinor: number;
  discountMinor: number;
  redeemedAt: string;
  source: RedemptionSource;
  /** Partner order / booking reference (online channels). */
  orderRef?: string;
  /** e.g. "4 × The Monsoon Heist · Orion Cinemas, Andheri". */
  summary?: string;
  /** api_booking: tickets / rooms / seats. */
  units?: number;
  /** Set when the partner cancelled or refunded the order/booking. */
  reversedAt?: string;
}

export interface PartnerDailyPoint {
  /** YYYY-MM-DD (IST). */
  day: string;
  claims: number;
  redeemed: number;
}

export interface PartnerChannelTotals {
  channel: RedemptionChannel;
  campaigns: number;
  liveCampaigns: number;
  totals: CampaignStats;
}

export interface PartnerOverview {
  partner: PartnerAccount;
  totals: CampaignStats;
  liveCampaigns: number;
  /** One entry per partner channel, in the partner's channel order. */
  byChannel: PartnerChannelTotals[];
  daily: PartnerDailyPoint[];
  recentRedemptions: PartnerRedemption[];
  /** In-store redemptions by outlet district (empty for online-only partners). */
  topDistricts: { districtId: string; redeemed: number }[];
}
