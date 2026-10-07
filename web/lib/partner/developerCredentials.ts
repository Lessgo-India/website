/**
 * Developer credentials for online partners (offers-backend-spec §5.1): the
 * Partner API keys and the signing secret their servers use.
 *
 * Who gets what: the signing secret goes to every partner with an online
 * channel (online_code partners sign Partner API calls and webhooks,
 * api_booking partners sign their booking.* webhooks); the sandbox and live
 * API keys exist only for online_code (409 not_applicable otherwise).
 *
 * Self-contained (type-only imports) so node's test runner can load it — see
 * developerCredentials.test.mjs. The DUMMY branch of partnerApi.ts runs these
 * rules on the demo store; the offers service applies the same ones, generates
 * values with crypto.randomBytes and keeps only a hash (keys) or AES-GCM
 * ciphertext (secret).
 */
import type {
  DeveloperCredentials,
  DeveloperCredentialSummary,
  DeveloperCredentialType,
  PartnerAccount,
  PartnerRole,
  RevealedCredential,
} from './types';

export const DEVELOPER_CREDENTIAL_TYPES: readonly DeveloperCredentialType[] = ['test_key', 'live_key', 'signing_secret'];

export const DEVELOPER_CREDENTIAL_DETAILS: Record<
  DeveloperCredentialType,
  { label: string; prefix: string; summary: string }
> = {
  test_key: {
    label: 'Sandbox key',
    prefix: 'lgp_test_',
    summary: 'Partner API key for sandbox checks. Only works with test vouchers.',
  },
  live_key: {
    label: 'Live key',
    prefix: 'lgp_live_',
    summary: 'Partner API key for real Lessgo vouchers at your checkout.',
  },
  signing_secret: {
    label: 'Signing secret',
    prefix: 'whsec_',
    summary: 'Signs every Partner API call and webhook you send (HMAC-SHA256).',
  },
};

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
/** lgp_test_/lgp_live_ + 32 base62 characters. */
const KEY_BODY_LENGTH = 32;
/** whsec_ + 32 random bytes as base64url (43 characters). */
const SECRET_BYTES = 32;

const WELL_FORMED: Record<DeveloperCredentialType, RegExp> = {
  test_key: /^lgp_test_[0-9A-Za-z]{32}$/,
  live_key: /^lgp_live_[0-9A-Za-z]{32}$/,
  signing_secret: /^whsec_[A-Za-z0-9_-]{43}$/,
};

export type RandomBytes = (count: number) => Uint8Array;

/** DUMMY: when each credential was generated and its preview at the time, per partner. */
export type DeveloperCredentialRecords = Partial<Record<DeveloperCredentialType, DeveloperCredentialSummary>>;

export function isDeveloperCredentialType(value: unknown): value is DeveloperCredentialType {
  return typeof value === 'string' && (DEVELOPER_CREDENTIAL_TYPES as readonly string[]).includes(value);
}

/** `length` base62 characters; bytes ≥ 248 are rejected so every character is equally likely. */
export function randomBase62(length: number, randomBytes: RandomBytes): string {
  let out = '';
  while (out.length < length) {
    for (const byte of randomBytes(length * 2)) {
      if (byte < 248) out += BASE62[byte % 62];
      if (out.length === length) break;
    }
  }
  return out;
}

export function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function generateDeveloperCredential(type: DeveloperCredentialType, randomBytes: RandomBytes): string {
  if (type === 'signing_secret') return `whsec_${base64Url(randomBytes(SECRET_BYTES))}`;
  return `${DEVELOPER_CREDENTIAL_DETAILS[type].prefix}${randomBase62(KEY_BODY_LENGTH, randomBytes)}`;
}

export function isWellFormedDeveloperCredential(type: DeveloperCredentialType, value: string): boolean {
  return WELL_FORMED[type].test(value);
}

/** "lgp_live_••••9e20" — the only form ever shown again. */
export function developerCredentialPreview(type: DeveloperCredentialType, value: string): string {
  return `${DEVELOPER_CREDENTIAL_DETAILS[type].prefix}••••${value.slice(-4)}`;
}

function checkoutIsLive(partner: PartnerAccount): boolean {
  return partner.channels.includes('online_code') && partner.integration.checkout?.status === 'live';
}

/** API keys only exist for the online checkout channel. */
function hasCheckout(partner: PartnerAccount): boolean {
  return partner.channels.includes('online_code') && !!partner.integration.checkout;
}

/** Every online channel signs what it sends Lessgo, so each gets the signing secret. */
function hasOnlineChannel(partner: PartnerAccount): boolean {
  return partner.channels.includes('online_code') || partner.channels.includes('api_booking');
}

/** Where each credential's preview lives on the partner account. */
function currentPreview(partner: PartnerAccount, type: DeveloperCredentialType): string | undefined {
  if (type === 'signing_secret') return partner.integration.webhookSecretPreview;
  if (!hasCheckout(partner)) return undefined;
  const { checkout } = partner.integration;
  return type === 'test_key' ? checkout?.sandboxKeyPreview : checkout?.liveKeyPreview;
}

/**
 * Previews and dates for the Integrations page. A credential never generated
 * here dates from when Lessgo issued it: onboarding, or go-live for the first
 * live key. Booking-only partners have no API keys (testKey/liveKey null).
 */
export function developerCredentialsOf(
  partner: PartnerAccount,
  records: DeveloperCredentialRecords = {},
): DeveloperCredentials {
  const summary = (type: DeveloperCredentialType, issuedAt: string): DeveloperCredentialSummary | null => {
    const preview = currentPreview(partner, type);
    if (!preview) return null;
    const record = records[type];
    return { preview, createdAt: record?.preview === preview ? record.createdAt : issuedAt };
  };
  return {
    testKey: summary('test_key', partner.onboardedAt),
    liveKey: summary('live_key', partner.integration.checkout?.liveSince ?? partner.onboardedAt),
    signingSecret: summary('signing_secret', partner.onboardedAt),
    liveAvailable: checkoutIsLive(partner),
  };
}

export interface CredentialRefusal {
  status: number;
  code: string;
  message: string;
}

/** Who may see developer credentials at all: owners of partners with an online channel. */
export function developerCredentialAccessRefusal(partner: PartnerAccount, role: PartnerRole): CredentialRefusal | null {
  if (role !== 'owner') {
    return { status: 403, code: 'forbidden', message: 'Only the account owner can manage integrations.' };
  }
  if (!hasOnlineChannel(partner)) {
    return {
      status: 404,
      code: 'not_found',
      message: 'Developer credentials are for partners with online checkout or bookings. Ask Lessgo to add one.',
    };
  }
  return null;
}

export type DeveloperCredentialRotation =
  | { ok: true; revealed: RevealedCredential; replaced: boolean }
  | ({ ok: false } & CredentialRefusal);

/**
 * Replaces the credential of `type` with a new value: the old preview is
 * gone (that value stops working at once) and the new value is returned for
 * the one-time reveal. API keys need online checkout, and a live key needs
 * the checkout integration to be live.
 */
export function rotateDeveloperCredentialIn(
  partner: PartnerAccount,
  role: PartnerRole,
  records: DeveloperCredentialRecords,
  type: unknown,
  options: { now: number; randomBytes: RandomBytes },
): DeveloperCredentialRotation {
  if (!isDeveloperCredentialType(type)) {
    return { ok: false, status: 400, code: 'invalid_input', message: 'Pick a sandbox key, live key or signing secret.' };
  }
  const refusal = developerCredentialAccessRefusal(partner, role);
  if (refusal) return { ok: false, ...refusal };
  const checkout = hasCheckout(partner) ? partner.integration.checkout : undefined;
  if (type !== 'signing_secret' && !checkout) {
    return {
      ok: false,
      status: 409,
      code: 'not_applicable',
      message: 'API keys are only for online checkout. Your booking webhooks need just the signing secret.',
    };
  }
  if (type === 'live_key' && !checkoutIsLive(partner)) {
    return {
      ok: false,
      status: 409,
      code: 'integration_not_live',
      message: 'A live key can be generated once Lessgo approves your checkout for production.',
    };
  }

  const replaced = !!currentPreview(partner, type);
  const value = generateDeveloperCredential(type, options.randomBytes);
  const preview = developerCredentialPreview(type, value);
  const createdAt = new Date(options.now).toISOString();
  if (type === 'signing_secret') {
    partner.integration.webhookSecretPreview = preview;
  } else if (checkout) {
    if (type === 'test_key') {
      checkout.sandboxKeyPreview = preview;
    } else {
      checkout.liveKeyPreview = preview;
      partner.integration.apiKeyPreview = preview;
    }
  }
  records[type] = { preview, createdAt };
  return { ok: true, revealed: { type, value, preview, createdAt }, replaced };
}
