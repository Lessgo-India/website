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
  /** Bills logged at redemption (gross, before discount). */
  gmvMinor: number;
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
  /** When non-empty, the event location must be one of these outlets. */
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
  /** Cashier logins are scoped to one outlet. */
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
    | 'campaign.rejected';
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

export interface AdminReviewItem {
  campaign: PartnerCampaign;
  partner: Pick<PartnerAccount, 'id' | 'brandName' | 'logoEmoji' | 'brandColor' | 'plan' | 'status'>;
}

export interface AdminPartnersOverview {
  partners: AdminPartnerSummary[];
  reviewQueue: AdminReviewItem[];
}

export interface AdminPartnerDetail {
  partner: PartnerAccount;
  logins: PartnerLogin[];
  outlets: PartnerOutlet[];
  campaigns: PartnerCampaign[];
  activity: PartnerAuditEntry[];
}

export type CampaignReviewDecision = { decision: 'approve' } | { decision: 'reject'; note: string };

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

export type RedemptionSource = 'console' | 'webhook' | 'api';

export interface PartnerRedemption {
  id: string;
  voucherId: string;
  maskedCode: string;
  campaignId: string;
  outletId: string;
  staffUserId: string;
  holderDisplayName: string;
  groupSize: number;
  billMinor: number;
  discountMinor: number;
  redeemedAt: string;
  source: RedemptionSource;
}

export interface PartnerDailyPoint {
  /** YYYY-MM-DD (IST). */
  day: string;
  claims: number;
  redeemed: number;
}

export interface PartnerOverview {
  partner: PartnerAccount;
  totals: CampaignStats;
  liveCampaigns: number;
  daily: PartnerDailyPoint[];
  recentRedemptions: PartnerRedemption[];
  topDistricts: { districtId: string; redeemed: number }[];
}
