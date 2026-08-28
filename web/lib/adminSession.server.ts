import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { normalisePhone } from './adminCredential';

/**
 * SERVER ONLY — never import this from a `'use client'` module.
 *
 * Verifies admin credentials against `ADMIN_USERS` and mints the signed session
 * token that backs the httpOnly cookie. No password or password-equivalent is
 * ever stored here: `ADMIN_USERS` holds a scrypt hash of the value the browser
 * derives, so a leaked env file still can't be replayed without cracking it.
 */

export const SESSION_COOKIE = 'lessgo_admin_session';
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

const SCRYPT_KEYLEN = 64;
const SCRYPT_OPTIONS = { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

// Hand-rolled rather than promisify()'d: TypeScript resolves promisify to
// scrypt's 3-argument overload, which can't carry the cost parameters.
function scryptAsync(secret: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(secret, salt, SCRYPT_KEYLEN, SCRYPT_OPTIONS, (error, derived) =>
      error ? reject(error) : resolve(derived),
    );
  });
}

interface AdminRecord {
  phone: string;
  salt: Buffer;
  hash: Buffer;
}

export interface SessionPayload {
  sub: string;
  iat: number;
  exp: number;
}

/**
 * `ADMIN_USERS` format: `phone:saltHex:hashHex`, comma-separated.
 * Generate entries with `node scripts/hash-admin-password.mjs`.
 */
function loadAdmins(): Map<string, AdminRecord> {
  const admins = new Map<string, AdminRecord>();

  for (const entry of (process.env.ADMIN_USERS ?? '').split(',')) {
    const [rawPhone, saltHex, hashHex] = entry.trim().split(':');
    if (!rawPhone || !saltHex || !hashHex) continue;

    const phone = normalisePhone(rawPhone);
    if (phone.length !== 10) continue;

    admins.set(phone, {
      phone,
      salt: Buffer.from(saltHex, 'hex'),
      hash: Buffer.from(hashHex, 'hex'),
    });
  }

  return admins;
}

export function isAdminAuthConfigured(): boolean {
  return loadAdmins().size > 0 && !!sessionSecret();
}

function sessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET?.trim() ?? '';
}

/**
 * Checks the browser-derived credential against the stored hash.
 *
 * An unknown phone still pays the full scrypt cost, so response time can't be
 * used to discover which numbers are operators.
 */
export async function verifyCredential(phone: string, credential: string): Promise<boolean> {
  const record = loadAdmins().get(normalisePhone(phone));
  const salt = record?.salt ?? randomBytes(16);

  const derived = await scryptAsync(credential, salt);

  if (!record || record.hash.length !== derived.length) return false;
  return timingSafeEqual(record.hash, derived);
}

export function createSessionToken(phone: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub: normalisePhone(phone),
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };

  const body = base64url(Buffer.from(JSON.stringify(payload)));
  return `${body}.${sign(body)}`;
}

/** Returns the payload only when the signature is valid and unexpired. */
export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token || !sessionSecret()) return null;

  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  const expected = Buffer.from(sign(body));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload;
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function sign(body: string): string {
  return base64url(createHmac('sha256', sessionSecret()).update(body).digest());
}

function base64url(buffer: Buffer): string {
  return buffer.toString('base64url');
}
