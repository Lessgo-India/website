/**
 * Pure rules for the partner portal: voucher codes, discount maths, audience
 * targeting and campaign validation.
 *
 * Self-contained on purpose (type-only imports) so the node test runner can
 * load it directly — see rules.test.mjs. The server re-validates everything;
 * these checks exist to give merchants instant feedback.
 */
import type {
  AgeBracket,
  BookingConfig,
  BookingProduct,
  CampaignOffer,
  OfferGender,
  OfferTargeting,
  OnlineCheckoutConfig,
  PartnerRole,
  RedemptionChannel,
  VoucherPolicy,
} from './types';

// ── Voucher codes ───────────────────────────────────────────────────────────
// Same format as the app (lessgo-react-native/utils/voucherCode.ts):
// PREFIX-XXXX-XXXX-C, Crockford base32 blocks plus a mod-32 check character.

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const VOUCHER_CODE = /^([A-Z]{2,5})-([0-9A-HJKMNP-TV-Z]{4})-([0-9A-HJKMNP-TV-Z]{4})-([0-9A-HJKMNP-TV-Z])$/;
const QR_PAYLOAD = /^LGV1:([A-Za-z0-9_-]{4,64}):(\d{6})$/;

export function voucherCheckChar(body: string): string {
  let sum = 0;
  for (let i = 0; i < body.length; i += 1) {
    const value = CROCKFORD.indexOf(body[i]);
    if (value < 0) return '';
    sum += value * (i + 1);
  }
  return CROCKFORD[sum % CROCKFORD.length];
}

/** Builds a well-formed code from a prefix and an 8-character Crockford body. */
export function buildVoucherCode(prefix: string, body: string): string {
  return `${prefix}-${body.slice(0, 4)}-${body.slice(4, 8)}-${voucherCheckChar(body)}`;
}

export function isWellFormedVoucherCode(code: string): boolean {
  const match = VOUCHER_CODE.exec(code);
  return !!match && voucherCheckChar(match[2] + match[3]) === match[4];
}

/** Keeps the prefix and first block: "BRB-7KQ4-••••-•". */
export function maskVoucherCode(code: string): string {
  const [prefix, first, ...rest] = code.split('-');
  if (!prefix || !first) return '••••';
  return [prefix, first, ...rest.map((block) => '•'.repeat(block.length))].join('-');
}

/**
 * Tolerant code entry: any case, spaces or missing dashes, and Crockford's
 * look-alikes (O→0, I/L→1) in the random blocks. The prefix length is
 * whatever is left after the fixed 9-character tail.
 */
export function normaliseVoucherCode(raw: string): string {
  const compact = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (compact.length < 11 || compact.length > 14) return compact;
  const prefixLength = compact.length - 9;
  const prefix = compact.slice(0, prefixLength);
  const tail = compact
    .slice(prefixLength)
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
  return `${prefix}-${tail.slice(0, 4)}-${tail.slice(4, 8)}-${tail.slice(8)}`;
}

export type RedemptionInput =
  | { kind: 'qr'; voucherId: string; rotatingCode: string }
  | { kind: 'code'; code: string }
  | { kind: 'invalid'; reason: string };

/**
 * What the counter typed or scanned. USB/Bluetooth scanners "type" the QR
 * payload (LGV1:<voucherId>:<6-digit live code>) followed by Enter.
 */
export function parseRedemptionInput(raw: string): RedemptionInput {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: 'invalid', reason: 'Scan the QR or type the voucher code.' };

  const qr = QR_PAYLOAD.exec(trimmed);
  if (qr) return { kind: 'qr', voucherId: qr[1], rotatingCode: qr[2] };
  if (/^LGV\d*:/i.test(trimmed)) {
    return { kind: 'invalid', reason: 'This QR is not a Lessgo voucher, or it is from an outdated app.' };
  }

  const code = normaliseVoucherCode(trimmed);
  if (!VOUCHER_CODE.test(code)) {
    return { kind: 'invalid', reason: 'Codes look like BRB-7KQ4-M2XD-R. Check for missing characters.' };
  }
  if (!isWellFormedVoucherCode(code)) {
    return { kind: 'invalid', reason: 'That code has a typo — re-check each character.' };
  }
  return { kind: 'code', code };
}

/** The 6-digit live code under the guest's QR (refreshes every 30 s). */
export function isRotatingCode(value: string): boolean {
  return /^\d{6}$/.test(value.replace(/\s/g, ''));
}

// ── Money ───────────────────────────────────────────────────────────────────

/** "1,250.5" → 125050 paise; null when it isn't a positive amount. */
export function rupeesToMinor(input: string): number | null {
  const cleaned = input.replace(/[₹,\s]/g, '');
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(cleaned)) return null;
  const minor = Math.round(Number(cleaned) * 100);
  return minor > 0 ? minor : null;
}

export function minorToRupeesInput(minor: number | undefined): string {
  if (minor === undefined) return '';
  return minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2);
}

const INR_WHOLE = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
const INR_PAISE = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 20000 → "₹200", 125050 → "₹1,250.50". */
export function formatInr(minor: number): string {
  return (minor % 100 === 0 ? INR_WHOLE : INR_PAISE).format(minor / 100);
}

/** Display label for the tray badge, e.g. "₹200 OFF", "25% OFF". */
export function offerLabel(offer: Omit<CampaignOffer, 'label'>): string {
  switch (offer.type) {
    case 'flat':
      return `${formatInr(offer.valueMinor ?? 0)} OFF`;
    case 'percent':
      return `${(offer.percentBp ?? 0) / 100}% OFF`;
    case 'bogo':
      return 'BUY 1 GET 1';
    case 'freebie': {
      const item = offer.freebieItem?.trim();
      return item ? `FREE ${item.toUpperCase()}` : 'FREEBIE';
    }
  }
}

export interface DiscountQuote {
  eligible: boolean;
  discountMinor: number;
  payableMinor: number;
  /** Why it isn't eligible, or what to hand over for bogo/freebie offers. */
  note?: string;
}

/** Discount for a bill at the counter (gross bill in, payable out). */
export function computeDiscount(offer: CampaignOffer, billMinor: number): DiscountQuote {
  if (!Number.isFinite(billMinor) || billMinor <= 0) {
    return { eligible: false, discountMinor: 0, payableMinor: 0, note: 'Enter the bill amount.' };
  }
  if (offer.minBillMinor && billMinor < offer.minBillMinor) {
    return {
      eligible: false,
      discountMinor: 0,
      payableMinor: billMinor,
      note: `Bill must be at least ${formatInr(offer.minBillMinor)} for this offer.`,
    };
  }

  let discountMinor = 0;
  let note: string | undefined;
  switch (offer.type) {
    case 'flat':
      discountMinor = Math.min(offer.valueMinor ?? 0, billMinor);
      break;
    case 'percent': {
      const raw = Math.floor((billMinor * (offer.percentBp ?? 0)) / 10_000);
      discountMinor = offer.maxDiscountMinor ? Math.min(raw, offer.maxDiscountMinor) : raw;
      break;
    }
    case 'bogo':
      note = 'Give the free item of equal or lesser value, then bill the rest as usual.';
      break;
    case 'freebie':
      note = `Hand over: ${offer.freebieItem?.trim() || 'the free item'}.`;
      break;
  }
  return { eligible: true, discountMinor, payableMinor: billMinor - discountMinor, note };
}

// ── Audience targeting ──────────────────────────────────────────────────────

export const AGE_BRACKETS: readonly AgeBracket[] = ['18-24', '25-34', '35-44', '45-54', '55+'];

export const GENDER_OPTIONS: readonly { value: OfferGender; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
];

/** "KA-bengaluru-urban" → "KA". */
export function districtState(districtId: string): string {
  return districtId.split('-')[0];
}

function uniqueSorted(values: readonly string[] | undefined): string[] | undefined {
  if (!values || values.length === 0) return undefined;
  return [...new Set(values)].sort();
}

/** Drops empty lists and duplicates so "no rule" is always `undefined`. */
export function normaliseTargeting(targeting: OfferTargeting): OfferTargeting {
  const ageBrackets = AGE_BRACKETS.filter((bracket) => targeting.ageBrackets?.includes(bracket));
  const include = {
    states: uniqueSorted(targeting.geo?.include?.states),
    districts: uniqueSorted(targeting.geo?.include?.districts),
  };
  const exclude = {
    states: uniqueSorted(targeting.geo?.exclude?.states),
    districts: uniqueSorted(targeting.geo?.exclude?.districts),
  };
  const hasInclude = !!(include.states || include.districts);
  const hasExclude = !!(exclude.states || exclude.districts);
  const out: OfferTargeting = {};
  if (ageBrackets.length > 0 && ageBrackets.length < AGE_BRACKETS.length) out.ageBrackets = ageBrackets;
  if (targeting.gender && targeting.gender !== 'all') out.gender = targeting.gender;
  if (hasInclude || hasExclude) {
    out.geo = {};
    if (hasInclude) out.geo.include = include;
    if (hasExclude) out.geo.exclude = exclude;
  }
  return out;
}

export interface TargetingIssue {
  level: 'error' | 'warning';
  message: string;
}

/**
 * Catches contradictory or no-op geo rules. `nameOf` turns a state code or
 * district id into a readable name for the message.
 */
export function validateTargeting(
  targeting: OfferTargeting,
  nameOf: (codeOrId: string) => string = (value) => value,
): TargetingIssue[] {
  const issues: TargetingIssue[] = [];
  const includeStates = new Set(targeting.geo?.include?.states ?? []);
  const includeDistricts = new Set(targeting.geo?.include?.districts ?? []);
  const excludeStates = new Set(targeting.geo?.exclude?.states ?? []);
  const excludeDistricts = new Set(targeting.geo?.exclude?.districts ?? []);
  const hasInclude = includeStates.size > 0 || includeDistricts.size > 0;

  for (const state of excludeStates) {
    if (includeStates.has(state)) {
      issues.push({ level: 'error', message: `${nameOf(state)} is both included and excluded.` });
    } else if (hasInclude) {
      const touchesInclude = [...includeDistricts].some((id) => districtState(id) === state);
      if (touchesInclude) {
        issues.push({
          level: 'error',
          message: `Excluding ${nameOf(state)} cancels the districts you included there.`,
        });
      } else {
        issues.push({
          level: 'warning',
          message: `Excluding ${nameOf(state)} has no effect — it is outside your included regions.`,
        });
      }
    }
  }

  for (const district of excludeDistricts) {
    const state = districtState(district);
    if (includeDistricts.has(district)) {
      issues.push({ level: 'error', message: `${nameOf(district)} is both included and excluded.` });
    } else if (excludeStates.has(state)) {
      issues.push({
        level: 'warning',
        message: `${nameOf(district)} is already excluded with ${nameOf(state)}.`,
      });
    } else if (hasInclude && !includeStates.has(state)) {
      issues.push({
        level: 'warning',
        message: `Excluding ${nameOf(district)} has no effect — it is outside your included regions.`,
      });
    }
  }

  for (const district of includeDistricts) {
    const state = districtState(district);
    if (includeStates.has(state)) {
      issues.push({
        level: 'warning',
        message: `${nameOf(district)} is already covered by ${nameOf(state)}.`,
      });
    }
  }

  return issues;
}

/** Dummy-model inputs; the real estimate comes from the offers service. */
export interface AudienceModel {
  usersByState: Record<string, number>;
  districtsByState: Record<string, readonly string[]>;
  /** Share of a state's users living in a district (metros); others split the rest evenly. */
  districtWeight: Record<string, number>;
}

/** Lessgo skews young: share of adult users per bracket. */
const AGE_SHARE: Record<AgeBracket, number> = {
  '18-24': 0.34,
  '25-34': 0.38,
  '35-44': 0.16,
  '45-54': 0.08,
  '55+': 0.04,
};

const GENDER_SHARE: Record<OfferGender, number> = { all: 1, M: 0.56, F: 0.44 };

function districtUsers(model: AudienceModel, districtId: string): number {
  const state = districtState(districtId);
  const stateUsers = model.usersByState[state] ?? 0;
  const districts = model.districtsByState[state] ?? [];
  if (!districts.includes(districtId)) return 0;
  const explicit = model.districtWeight[districtId];
  if (explicit !== undefined) return stateUsers * explicit;
  const weighted = districts.filter((id) => model.districtWeight[id] !== undefined);
  const weightedShare = weighted.reduce((sum, id) => sum + model.districtWeight[id], 0);
  const rest = districts.length - weighted.length;
  return rest > 0 ? (stateUsers * Math.max(0, 1 - weightedShare)) / rest : 0;
}

/** Users matching the targeting under `model`, before any rounding. */
export function estimateAudience(targeting: OfferTargeting, model: AudienceModel): number {
  const include = targeting.geo?.include;
  const exclude = targeting.geo?.exclude;
  const includeStates = new Set(include?.states ?? []);
  const hasInclude = includeStates.size > 0 || (include?.districts?.length ?? 0) > 0;

  const inBase = (districtId: string) =>
    !hasInclude ||
    includeStates.has(districtState(districtId)) ||
    (include?.districts ?? []).includes(districtId);

  let geo = 0;
  if (!hasInclude) {
    geo = Object.values(model.usersByState).reduce((sum, users) => sum + users, 0);
  } else {
    for (const state of includeStates) geo += model.usersByState[state] ?? 0;
    for (const district of new Set(include?.districts ?? [])) {
      if (!includeStates.has(districtState(district))) geo += districtUsers(model, district);
    }
  }

  const excludedStates = new Set(exclude?.states ?? []);
  for (const state of excludedStates) {
    for (const district of model.districtsByState[state] ?? []) {
      if (inBase(district)) geo -= districtUsers(model, district);
    }
  }
  for (const district of new Set(exclude?.districts ?? [])) {
    if (!excludedStates.has(districtState(district)) && inBase(district)) {
      geo -= districtUsers(model, district);
    }
  }

  const brackets = targeting.ageBrackets?.length ? targeting.ageBrackets : AGE_BRACKETS;
  const age = brackets.reduce((sum, bracket) => sum + AGE_SHARE[bracket], 0);
  const gender = GENDER_SHARE[targeting.gender ?? 'all'];
  return Math.max(0, Math.round(geo * age * gender));
}

/** Two significant figures — estimates should never look precise. */
export function roundEstimate(value: number): number {
  if (value <= 0) return 0;
  const magnitude = 10 ** Math.max(0, Math.floor(Math.log10(value)) - 1);
  return Math.round(value / magnitude) * magnitude;
}

// ── Campaign drafts ─────────────────────────────────────────────────────────

export interface CampaignDraft {
  headline: string;
  description: string;
  terms: string[];
  storyImageUrl: string;
  coverImageUrl: string;
  offer: Omit<CampaignOffer, 'label'>;
  voucherPolicy: VoucherPolicy;
  targeting: OfferTargeting;
  channel: RedemptionChannel;
  /** online_code only. */
  online?: OnlineCheckoutConfig;
  /** api_booking only. */
  booking?: BookingConfig;
  /** in_store only. */
  outletIds: string[];
  startAt: string;
  endAt: string;
  eventType: string;
  eventName: string;
}

/** What the partner's campaigns may use; the offers service checks the same. */
export interface DraftPartnerContext {
  channels: readonly RedemptionChannel[];
  bookingProducts: readonly BookingProduct[];
  /** https link on one of the partner's domains (channels.ts isAllowedPartnerUrl). */
  isAllowedUrl: (url: string) => boolean;
}

/** Products booked per person: one ticket/seat/slot each, so a booking must fit the group. */
export const PER_PERSON_PRODUCTS: readonly BookingProduct[] = [
  'movie_tickets',
  'event_tickets',
  'flights',
  'buses',
  'activities',
];

export type DraftStep = 'offer' | 'creative' | 'audience' | 'rules';

export type DraftErrors = Partial<Record<DraftStep, string[]>>;

const DAY_MS = 24 * 60 * 60 * 1000;

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/** Step-by-step errors for the campaign wizard; empty object = valid. */
export function validateCampaignDraft(
  draft: CampaignDraft,
  options: { now?: number; nameOf?: (codeOrId: string) => string; partner?: DraftPartnerContext } = {},
): DraftErrors {
  const now = options.now ?? Date.now();
  const errors: DraftErrors = {};
  const add = (step: DraftStep, message: string) => {
    (errors[step] ??= []).push(message);
  };
  const isWhole = (value: number) => Number.isInteger(value);
  const partner = options.partner;

  const headline = draft.headline.trim();
  if (headline.length < 8 || headline.length > 60) add('offer', 'Headline must be 8–60 characters.');
  if (draft.description.trim().length > 160) add('offer', 'Description must be 160 characters or fewer.');
  const terms = draft.terms.map((term) => term.trim()).filter(Boolean);
  if (terms.length === 0) add('offer', 'Add at least one term.');
  if (terms.some((term) => term.length > 120)) add('offer', 'Keep each term under 120 characters.');

  const { offer } = draft;
  if (!Number.isInteger(offer.minGroupSize) || offer.minGroupSize < 2 || offer.minGroupSize > 20) {
    add('offer', 'Minimum group size must be between 2 and 20.');
  }
  if (offer.type === 'flat') {
    const value = offer.valueMinor ?? 0;
    if (value < 1_000 || value > 1_000_000) add('offer', 'Flat discount must be between ₹10 and ₹10,000.');
    if (offer.minBillMinor && value >= offer.minBillMinor) {
      add('offer', 'The discount must be lower than the minimum bill.');
    }
  }
  if (offer.type === 'percent') {
    const bp = offer.percentBp ?? 0;
    if (bp < 500 || bp > 9_000) add('offer', 'Percentage must be between 5% and 90%.');
    if (!offer.maxDiscountMinor) add('offer', 'Percentage offers need a maximum discount.');
  }
  if ((offer.type === 'bogo' || offer.type === 'freebie') && !offer.freebieItem?.trim()) {
    add('offer', 'Say what the group gets for free.');
  }
  if (partner && !partner.channels.includes(draft.channel)) {
    add('offer', 'Pick one of your redemption channels.');
  }

  if (draft.channel === 'online_code') {
    const online = draft.online;
    if (!online) {
      add('rules', 'Add where the code is used online.');
    } else {
      if (!isHttpsUrl(online.landingUrl)) add('rules', 'The shop link must be an https URL.');
      else if (partner && !partner.isAllowedUrl(online.landingUrl)) add('rules', 'The shop link must be on your website’s domain.');
      const template = online.applyUrlTemplate?.trim();
      if (template) {
        const sample = template.split('{code}').join('CODE');
        if (!template.includes('{code}')) add('rules', 'The apply-code link must contain {code}.');
        else if (!isHttpsUrl(sample)) add('rules', 'The apply-code link must be an https URL.');
        else if (partner && !partner.isAllowedUrl(sample)) add('rules', 'The apply-code link must be on your website’s domain.');
      }
      if (online.platforms.length === 0) add('rules', 'Pick where the code works: website or apps.');
      const appliesTo = online.appliesTo.trim();
      if (appliesTo.length < 3 || appliesTo.length > 80) add('rules', 'Say what the code applies to (3–80 characters).');
    }
  }

  if (draft.channel === 'api_booking') {
    const booking = draft.booking;
    if (!booking) {
      add('rules', 'Add what can be booked.');
    } else {
      if (partner && !partner.bookingProducts.includes(booking.product)) {
        add('rules', 'Pick a product your booking connection supports.');
      }
      if (!isWhole(booking.minUnits) || booking.minUnits < 1 || booking.minUnits > 20) {
        add('rules', 'Minimum per booking must be 1–20.');
      }
      if (!isWhole(booking.maxUnits) || booking.maxUnits < booking.minUnits || booking.maxUnits > 20) {
        add('rules', 'Maximum per booking must be between the minimum and 20.');
      }
      if (PER_PERSON_PRODUCTS.includes(booking.product) && booking.maxUnits < offer.minGroupSize) {
        add('rules', `Allow at least ${offer.minGroupSize} per booking so the whole group fits.`);
      }
      const scope = booking.scope.trim();
      if (scope.length < 3 || scope.length > 80) add('rules', 'Describe what can be booked (3–80 characters).');
    }
  }

  if (!isHttpsUrl(draft.storyImageUrl)) add('creative', 'Add a story creative (https image URL).');
  if (!isHttpsUrl(draft.coverImageUrl)) add('creative', 'Add an event cover (https image URL).');
  const eventName = draft.eventName.trim();
  if (eventName.length < 3 || eventName.length > 60) add('creative', 'Default event name must be 3–60 characters.');

  for (const issue of validateTargeting(draft.targeting, options.nameOf)) {
    if (issue.level === 'error') add('audience', issue.message);
  }

  const policy = draft.voucherPolicy;
  if (!/^[A-Z]{2,5}$/.test(policy.codePrefix)) add('rules', 'Code prefix must be 2–5 capital letters.');
  if (!isWhole(policy.validityDays) || policy.validityDays < 1 || policy.validityDays > 90) {
    add('rules', 'Vouchers must be valid for 1–90 days.');
  }
  if (!isWhole(policy.perUserLimit) || policy.perUserLimit < 1 || policy.perUserLimit > 10) {
    add('rules', 'Per-user limit must be 1–10.');
  }
  if (policy.redemptionLimit !== null && (!isWhole(policy.redemptionLimit) || policy.redemptionLimit < 1)) {
    add('rules', 'Redemption limit must be at least 1, or unlimited.');
  }
  if (
    policy.dailyLimit !== null &&
    (!isWhole(policy.dailyLimit) ||
      policy.dailyLimit < 1 ||
      (policy.redemptionLimit !== null && policy.dailyLimit > policy.redemptionLimit))
  ) {
    add('rules', 'Daily limit must be at least 1 and no more than the total limit.');
  }
  const start = Date.parse(draft.startAt);
  const end = Date.parse(draft.endAt);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    add('rules', 'Pick a start and end date.');
  } else {
    if (start < now - DAY_MS) add('rules', 'Start date can’t be in the past.');
    if (end <= start) add('rules', 'End date must be after the start date.');
    if (end - start > 180 * DAY_MS) add('rules', 'Campaigns can run for at most 180 days.');
  }

  return errors;
}

export function hasDraftErrors(errors: DraftErrors): boolean {
  return Object.values(errors).some((list) => (list?.length ?? 0) > 0);
}

// ── Passwords ───────────────────────────────────────────────────────────────

/** First-login / change-password policy; null when acceptable. */
export function newPasswordProblem(
  password: string,
  context: { userId: string; previous?: string },
): string | null {
  if (password.length < 10) return 'Use at least 10 characters.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Mix letters and numbers.';
  const handle = context.userId.split('.')[0].toLowerCase();
  if (handle.length >= 3 && password.toLowerCase().includes(handle)) {
    return 'Don’t include your user ID.';
  }
  if (context.previous !== undefined && password === context.previous) {
    return 'Choose a password you haven’t used here before.';
  }
  return null;
}

// ── Roles ───────────────────────────────────────────────────────────────────

export type PartnerPermission =
  | 'overview'
  | 'campaigns'
  | 'campaigns.write'
  | 'outlets'
  | 'outlets.write'
  | 'redeem'
  | 'sales'
  | 'settings'
  | 'integrations';

const ROLE_PERMISSIONS: Record<PartnerRole, readonly PartnerPermission[]> = {
  owner: ['overview', 'campaigns', 'campaigns.write', 'outlets', 'outlets.write', 'redeem', 'sales', 'settings', 'integrations'],
  manager: ['overview', 'campaigns', 'campaigns.write', 'outlets', 'redeem', 'sales', 'settings'],
  cashier: ['redeem', 'settings'],
};

export function can(role: PartnerRole, permission: PartnerPermission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** Portal areas that only exist for some redemption channels. */
export type PartnerFeature = 'outlets' | 'redeem' | 'sales' | 'integrations';

const FEATURE_CHANNELS: Record<PartnerFeature, readonly RedemptionChannel[]> = {
  outlets: ['in_store'],
  redeem: ['in_store'],
  sales: ['online_code', 'api_booking'],
  integrations: ['online_code', 'api_booking'],
};

export function hasFeature(channels: readonly RedemptionChannel[], feature: PartnerFeature): boolean {
  return FEATURE_CHANNELS[feature].some((channel) => channels.includes(channel));
}

/** Roles a partner can issue: counter staff exist only where groups redeem in person. */
export function rolesFor(channels: readonly RedemptionChannel[]): PartnerRole[] {
  return channels.includes('in_store') ? ['owner', 'manager', 'cashier'] : ['owner', 'manager'];
}

export function homePathFor(role: PartnerRole): string {
  return can(role, 'overview') ? '/partner/dashboard' : '/partner/redeem';
}

/** Only same-portal paths are honoured after sign-in (no open redirects). */
export function safeNextPath(next: string | null | undefined, role: PartnerRole): string {
  if (
    next &&
    /^\/partner\/[A-Za-z0-9/_-]+$/.test(next) &&
    !next.startsWith('/partner/login') &&
    !next.startsWith('/partner/signup')
  ) {
    return next;
  }
  return homePathFor(role);
}

export function rate(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}
