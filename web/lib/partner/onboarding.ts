/**
 * Pure rules for onboarding partners from the admin console: user-ID handles,
 * contact checks, GSTIN validation and temporary passwords.
 *
 * Self-contained (type-only imports) so node's test runner can load it — see
 * onboarding.test.mjs. The offers service re-validates everything server-side.
 */
import type {
  BookingProduct,
  PartnerOnboardingInput,
  PartnerPlan,
  PartnerRole,
  RedemptionChannel,
} from './types';

// ── Handles and user IDs ────────────────────────────────────────────────────

/** Partner handle: the shared user-ID prefix, e.g. "brewbros". */
export const HANDLE_PATTERN = /^[a-z][a-z0-9]{2,15}$/;
const USER_ID_PATTERN = /^[a-z][a-z0-9]{2,15}\.[a-z][a-z0-9]{1,23}$/;
const HANDLE_STOPWORDS = new Set(['the', 'and', 'co', 'pvt', 'private', 'ltd', 'limited', 'llp', 'inc', 'india']);

function asciiWords(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** "Brew Bros Café" → "brewbros", "99 Pancakes" → "pancakes". */
export function suggestHandle(brandName: string): string {
  const words = asciiWords(brandName).filter((word) => !HANDLE_STOPWORDS.has(word));
  let handle = words.slice(0, 2).join('');
  if (handle.length < 3) handle = words.join('');
  return handle.replace(/^[0-9]+/, '').slice(0, 16);
}

export function handleProblem(handle: string, taken: Iterable<string> = []): string | null {
  if (!HANDLE_PATTERN.test(handle)) return 'Use 3–16 lowercase letters or digits, starting with a letter.';
  for (const existing of taken) {
    if (existing === handle) return `“${handle}” is already used by another partner.`;
  }
  return null;
}

/** Outlet "Brew Bros – HSR Layout" → "hsrlayout" (the part after the last dash). */
function placeSlug(outletName: string): string {
  const tail = outletName.split(/[–—-]/).pop() ?? outletName;
  return asciiWords(tail).join('').replace(/^[0-9]+/, '').slice(0, 20);
}

/** owner → "<handle>.owner", manager → "<handle>.manager", cashier → "<handle>.<outlet>". */
export function baseUserId(handle: string, role: PartnerRole, outletName?: string): string {
  if (role !== 'cashier') return `${handle}.${role}`;
  return `${handle}.${placeSlug(outletName ?? '') || 'counter'}`;
}

/** Appends 2, 3… until the ID is free. */
export function uniqueUserId(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${base}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error(`No free user ID for ${base}`);
}

export function isValidUserId(userId: string): boolean {
  return USER_ID_PATTERN.test(userId);
}

// ── Contact details ─────────────────────────────────────────────────────────

/** "+91 98450-12345" / "098450 12345" → "9845012345". */
export function normaliseIndianMobile(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

export function isValidIndianMobile(input: string): boolean {
  return /^[6-9]\d{9}$/.test(normaliseIndianMobile(input));
}

/** "9845012345" → "+91 98450 12345". */
export function formatIndianMobile(input: string): string {
  const digits = normaliseIndianMobile(input);
  return digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : input;
}

export function isValidEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/.test(input.trim());
}

/** "rohan.mehta@brewbros.example" → "r••••••••a@brewbros.example". */
export function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!domain || name.length < 2) return email;
  return `${name[0]}${'•'.repeat(Math.max(2, name.length - 2))}${name[name.length - 1]}@${domain}`;
}

// ── GSTIN ───────────────────────────────────────────────────────────────────

/**
 * GST state codes (the first two digits of a GSTIN), keyed by the state codes
 * in indiaGeo.ts. The first code is current; AP's pre-2014 "28" and Daman &
 * Diu's pre-merger "25" are still on older registrations.
 */
export const GST_STATE_CODES: Readonly<Record<string, readonly string[]>> = {
  JK: ['01'], HP: ['02'], PB: ['03'], CH: ['04'], UK: ['05'], HR: ['06'], DL: ['07'], RJ: ['08'],
  UP: ['09'], BR: ['10'], SK: ['11'], AR: ['12'], NL: ['13'], MN: ['14'], MZ: ['15'], TR: ['16'],
  ML: ['17'], AS: ['18'], WB: ['19'], JH: ['20'], OD: ['21'], CG: ['22'], MP: ['23'], GJ: ['24'],
  DD: ['26', '25'], MH: ['27'], KA: ['29'], GA: ['30'], LD: ['31'], KL: ['32'], TN: ['33'],
  PY: ['34'], AN: ['35'], TG: ['36'], AP: ['37', '28'], LA: ['38'],
};

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const GSTIN_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** GSTN check character: mod-36 sum of the first 14 characters, weights 1,2,1,2… */
export function gstinCheckChar(first14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i += 1) {
    const value = GSTIN_CHARS.indexOf(first14[i] ?? '');
    if (value < 0) return '';
    const product = value * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return GSTIN_CHARS[(36 - (sum % 36)) % 36];
}

export function normaliseGstin(input: string): string {
  return input.replace(/\s/g, '').toUpperCase();
}

export interface GstinCheck {
  error?: string;
  warning?: string;
  /** State code (indiaGeo) the GSTIN is registered in. */
  registeredIn?: string;
}

/** Format, check character and state; a state mismatch only warns. */
export function checkGstin(input: string, stateCode?: string): GstinCheck {
  const gstin = normaliseGstin(input);
  if (!GSTIN_PATTERN.test(gstin)) return { error: 'A GSTIN has 15 characters, like 29ABCDE1234F1Z5.' };
  if (gstinCheckChar(gstin.slice(0, 14)) !== gstin[14]) {
    return { error: 'The last character doesn’t match the rest — check the GSTIN for a typo.' };
  }
  const prefix = gstin.slice(0, 2);
  const registeredIn = Object.keys(GST_STATE_CODES).find((code) => GST_STATE_CODES[code].includes(prefix));
  if (!registeredIn) return { error: `${prefix} isn’t an Indian GST state code.` };
  if (stateCode && registeredIn !== stateCode) {
    return {
      registeredIn,
      warning: 'This GSTIN is registered in a different state. That’s fine if it’s their registered office.',
    };
  }
  return { registeredIn };
}

// ── Temporary passwords ─────────────────────────────────────────────────────

/** No 0/O, 1/I/l, so it can be read out over the phone. */
const TEMPORARY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
export const TEMPORARY_PASSWORD_TTL_MS = 72 * 60 * 60 * 1000;
export const TEMPORARY_PASSWORD_PATTERN = /^[A-HJ-NP-Za-km-z2-9]{4}-[A-HJ-NP-Za-km-z2-9]{4}-[A-HJ-NP-Za-km-z2-9]{4}$/;

/**
 * "Kx7m-Q2pv-9Rbd": 12 characters from a 57-letter alphabet (~70 bits).
 * `randomBytes` must be a CSPRNG (crypto.getRandomValues); rejection sampling
 * keeps every character equally likely.
 */
export function generateTemporaryPassword(randomBytes: (count: number) => Uint8Array): string {
  const limit = 256 - (256 % TEMPORARY_ALPHABET.length);
  const chars: string[] = [];
  while (chars.length < 12) {
    for (const byte of randomBytes(16)) {
      if (byte < limit && chars.length < 12) chars.push(TEMPORARY_ALPHABET[byte % TEMPORARY_ALPHABET.length]);
    }
  }
  return `${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8).join('')}`;
}

export interface InviteMessageInput {
  brandName: string;
  recipientName: string;
  userId: string;
  temporaryPassword: string;
  loginUrl: string;
  /** Already formatted for the reader, e.g. "10 Oct, 7:30 pm IST". */
  expiresLabel: string;
}

/** The text an admin can paste into email or WhatsApp if dispatch is off. */
export function buildInviteMessage(input: InviteMessageInput): { subject: string; body: string } {
  const firstName = input.recipientName.trim().split(/\s+/)[0] || 'there';
  return {
    subject: `Your Lessgo Partners login for ${input.brandName}`,
    body: [
      `Hi ${firstName},`,
      '',
      `Your Lessgo Partners login for ${input.brandName} is ready.`,
      '',
      `Sign in: ${input.loginUrl}`,
      `User ID: ${input.userId}`,
      `Temporary password: ${input.temporaryPassword}`,
      '',
      `The temporary password works until ${input.expiresLabel}. You'll choose your own password the first time you sign in.`,
      '',
      '— Team Lessgo',
    ].join('\n'),
  };
}

// ── Onboarding form ─────────────────────────────────────────────────────────

export interface PartnerCategoryDetail {
  name: string;
  /** Redemption channels pre-selected for this category (the admin can change them). */
  channels: readonly RedemptionChannel[];
  /** api_booking products pre-selected. */
  bookingProducts?: readonly BookingProduct[];
  /** Shown under the picker, e.g. "Like BookMyShow or Paytm Insider". */
  hint: string;
}

/**
 * The category decides the partner type: which channels the portal, the
 * campaign wizard and the app's coupon flow use.
 */
export const PARTNER_CATEGORY_DETAILS: readonly PartnerCategoryDetail[] = [
  { name: 'Food & Drinks', channels: ['in_store'], hint: 'Restaurants, QSR and bars — groups redeem at the outlet.' },
  { name: 'Cafés', channels: ['in_store'], hint: 'Cafés and dessert places — groups redeem at the outlet.' },
  { name: 'Movies', channels: ['in_store'], hint: 'Cinema chains’ box offices. Add “Bookings via API” for online booking.' },
  { name: 'Games', channels: ['in_store'], hint: 'Bowling, arcades, gaming cafés.' },
  { name: 'Live music', channels: ['in_store'], hint: 'Venues and bars with gigs.' },
  { name: 'Outdoors', channels: ['in_store'], hint: 'Trek and adventure operators with base camps.' },
  { name: 'Fitness', channels: ['in_store'], hint: 'Gyms, studios, sports courts.' },
  {
    name: 'Shopping',
    channels: ['online_code'],
    hint: 'Online stores and D2C brands — groups apply the code at your checkout.',
  },
  {
    name: 'Tickets & events',
    channels: ['api_booking'],
    bookingProducts: ['movie_tickets', 'event_tickets'],
    hint: 'Ticketing platforms like BookMyShow — groups book through Lessgo.',
  },
  {
    name: 'Travel & stays',
    channels: ['api_booking'],
    bookingProducts: ['hotels', 'buses', 'flights'],
    hint: 'Travel platforms like MakeMyTrip — groups book through Lessgo.',
  },
  {
    name: 'Experiences',
    channels: ['in_store', 'api_booking'],
    bookingProducts: ['activities'],
    hint: 'Workshops and activities — at the venue or booked through Lessgo.',
  },
];

export const PARTNER_CATEGORIES: readonly string[] = PARTNER_CATEGORY_DETAILS.map((category) => category.name);

/** Channels and booking products to pre-select for `category`. */
export function categoryDefaults(category: string): {
  channels: RedemptionChannel[];
  bookingProducts: BookingProduct[];
} {
  const detail = PARTNER_CATEGORY_DETAILS.find((candidate) => candidate.name === category);
  return {
    channels: [...(detail?.channels ?? ['in_store'])],
    bookingProducts: [...(detail?.bookingProducts ?? [])],
  };
}

export const PLAN_DETAILS: Record<PartnerPlan, { label: string; summary: string }> = {
  pilot: { label: 'Pilot', summary: 'Trial partner: up to 2 live campaigns.' },
  standard: { label: 'Standard', summary: 'Self-serve campaigns on every channel the partner uses.' },
  enterprise: { label: 'Enterprise', summary: 'Adds POS/API redemption, signed webhooks and custom booking adapters.' },
};

export const ROLE_DETAILS: Record<PartnerRole, { label: string; summary: string }> = {
  owner: { label: 'Owner', summary: 'Everything, including integrations.' },
  manager: { label: 'Manager', summary: 'Campaigns, outlets and redemption; no integrations.' },
  cashier: { label: 'Cashier', summary: 'Redeems vouchers at one outlet only.' },
};

export type OnboardingField =
  | 'brandName'
  | 'legalName'
  | 'category'
  | 'channels'
  | 'website'
  | 'bookingProducts'
  | 'gstin'
  | 'stateCode'
  | 'city'
  | 'logoEmoji'
  | 'brandColor'
  | 'contactName'
  | 'contactEmail'
  | 'contactPhone'
  | 'handle'
  | 'ownerName'
  | 'ownerEmail'
  | 'ownerPhone'
  | 'dispatch';

export interface OnboardingCheck {
  errors: Partial<Record<OnboardingField, string>>;
  warnings: Partial<Record<OnboardingField, string>>;
}

const between = (value: string, min: number, max: number) => {
  const length = value.trim().length;
  return length >= min && length <= max;
};

const KNOWN_CHANNELS: readonly RedemptionChannel[] = ['in_store', 'online_code', 'api_booking'];
const KNOWN_PRODUCTS: readonly BookingProduct[] = ['movie_tickets', 'event_tickets', 'flights', 'hotels', 'buses', 'activities'];

/** https home page without credentials or a custom port, on a real-looking host. */
export function isHttpsWebsite(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(url.hostname)
    );
  } catch {
    return false;
  }
}

export function validateOnboarding(input: PartnerOnboardingInput, takenHandles: Iterable<string> = []): OnboardingCheck {
  const errors: OnboardingCheck['errors'] = {};
  const warnings: OnboardingCheck['warnings'] = {};

  if (!between(input.brandName, 2, 40)) errors.brandName = 'Brand name must be 2–40 characters.';
  if (!between(input.legalName, 3, 100)) errors.legalName = 'Add the registered business name.';
  if (!input.category) errors.category = 'Pick a category.';

  const channels = input.channels ?? [];
  if (channels.length === 0 || channels.some((channel) => !KNOWN_CHANNELS.includes(channel))) {
    errors.channels = 'Pick at least one way groups redeem with this partner.';
  } else if (input.category) {
    const usual = categoryDefaults(input.category).channels;
    if (!channels.some((channel) => usual.includes(channel))) {
      warnings.channels = `That isn’t the usual setup for ${input.category} — double-check before onboarding.`;
    }
  }
  const sellsOnline = channels.some((channel) => channel !== 'in_store');
  if (sellsOnline && !isHttpsWebsite(input.website ?? '')) {
    errors.website = 'Online partners need their https website, e.g. https://shop.example.com.';
  } else if (!sellsOnline && input.website?.trim() && !isHttpsWebsite(input.website)) {
    errors.website = 'Use an https address, e.g. https://brand.example.com.';
  }
  if (channels.includes('api_booking')) {
    const products = input.bookingProducts ?? [];
    if (products.length === 0 || products.some((product) => !KNOWN_PRODUCTS.includes(product))) {
      errors.bookingProducts = 'Pick what they sell through Lessgo.';
    } else if (input.bookingMethod !== 'lessgo_connect' && input.bookingMethod !== 'adapter') {
      errors.bookingProducts = 'Pick how the booking API connects.';
    }
  }
  if (!input.stateCode) errors.stateCode = 'Pick the state or union territory.';
  if (!between(input.city, 2, 40)) errors.city = 'Add the city.';
  if (!input.logoEmoji.trim() || input.logoEmoji.length > 8) errors.logoEmoji = 'Pick one emoji.';
  if (!/^#[0-9a-f]{6}$/i.test(input.brandColor)) errors.brandColor = 'Use a hex colour like #8D5524.';

  const gst = checkGstin(input.gstin, input.stateCode || undefined);
  if (gst.error) errors.gstin = gst.error;
  else if (gst.warning) warnings.gstin = gst.warning;

  if (!between(input.contactName, 2, 60)) errors.contactName = 'Add the contact person’s name.';
  if (!isValidEmail(input.contactEmail)) errors.contactEmail = 'Enter a valid email address.';
  if (!isValidIndianMobile(input.contactPhone)) errors.contactPhone = 'Enter a 10-digit Indian mobile number.';

  const handleIssue = handleProblem(input.handle, takenHandles);
  if (handleIssue) errors.handle = handleIssue;

  if (!between(input.owner.name, 2, 60)) errors.ownerName = 'Add the owner’s name.';
  if (!isValidEmail(input.owner.email)) errors.ownerEmail = 'Enter a valid email address.';
  if (input.owner.phone.trim() && !isValidIndianMobile(input.owner.phone)) {
    errors.ownerPhone = 'Enter a 10-digit Indian mobile number.';
  }
  if (!input.dispatch.email) {
    warnings.dispatch = 'Nothing will be sent. Share the credentials with the owner yourself.';
  }

  return { errors, warnings };
}

export function hasOnboardingErrors(check: OnboardingCheck): boolean {
  return Object.keys(check.errors).length > 0;
}
