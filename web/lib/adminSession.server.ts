import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { normalisePhone } from "./adminCredential";
import {
  createStoredSession,
  getCredentialOverride,
  isAdminAuthStorageConfigured,
  listStoredSessions,
  revokeOtherStoredSessions,
  revokeStoredSession,
  rotateCredentialWithOtp,
  validateStoredSession,
  type AdminSessionView,
} from "./adminAuthStore.server";

/**
 * SERVER ONLY — never import this from a `'use client'` module.
 *
 * Verifies admin credentials against `ADMIN_USERS` and mints the signed session
 * token that backs the httpOnly cookie. No password or password-equivalent is
 * ever stored here: `ADMIN_USERS` holds a scrypt hash of the value the browser
 * derives, so a leaked env file still can't be replayed without cracking it.
 */

export const SESSION_COOKIE = "lessgo_admin_session";
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
  sid: string;
  cv: number;
  iat: number;
  exp: number;
}

/**
 * `ADMIN_USERS` format: `phone:saltHex:hashHex`, comma-separated.
 * Generate entries with `node scripts/hash-admin-password.mjs`.
 */
function loadAdmins(): Map<string, AdminRecord> {
  const admins = new Map<string, AdminRecord>();

  for (const entry of (process.env.ADMIN_USERS ?? "").split(",")) {
    const [rawPhone, saltHex, hashHex] = entry.trim().split(":");
    if (!rawPhone || !saltHex || !hashHex) continue;

    const phone = normalisePhone(rawPhone);
    if (phone.length !== 10) continue;

    admins.set(phone, {
      phone,
      salt: Buffer.from(saltHex, "hex"),
      hash: Buffer.from(hashHex, "hex"),
    });
  }

  return admins;
}

export function isAdminAuthConfigured(): boolean {
  return (
    loadAdmins().size > 0 && !!sessionSecret() && isAdminAuthStorageConfigured()
  );
}

function sessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET?.trim() ?? "";
}

/**
 * Checks the browser-derived credential against the stored hash.
 *
 * An unknown phone still pays the full scrypt cost, so response time can't be
 * used to discover which numbers are operators.
 */
export async function verifyCredential(
  phone: string,
  credential: string,
): Promise<boolean> {
  return (await verifyCredentialGeneration(phone, credential)) !== null;
}

export async function verifyCredentialGeneration(
  phone: string,
  credential: string,
): Promise<number | null> {
  const normalizedPhone = normalisePhone(phone);
  const bootstrap = loadAdmins().get(normalizedPhone);
  const override = await getCredentialOverride(normalizedPhone);
  const record = bootstrap ? (override ?? bootstrap) : null;
  const salt = record?.salt ?? randomBytes(16);

  const derived = await scryptAsync(credential, salt);

  if (
    !record ||
    record.hash.length !== derived.length ||
    !timingSafeEqual(record.hash, derived)
  ) {
    return null;
  }
  return "generation" in record ? record.generation : 0;
}

export async function createAdminSession(
  phone: string,
  request: Request,
  credentialGeneration: number,
): Promise<{ token: string; payload: SessionPayload }> {
  const now = Math.floor(Date.now() / 1000);
  const normalizedPhone = normalisePhone(phone);
  const expiresAt = new Date((now + SESSION_TTL_SECONDS) * 1_000);
  const sessionId = await createStoredSession({
    phone: normalizedPhone,
    request,
    expiresAt,
    credentialGeneration,
  });
  const payload: SessionPayload = {
    sub: normalizedPhone,
    sid: sessionId,
    cv: credentialGeneration,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };

  return { token: tokenForPayload(payload), payload };
}

/** Returns the payload only when the signature is valid and unexpired. */
export function verifySessionToken(
  token: string | undefined,
): SessionPayload | null {
  if (!token || !sessionSecret()) return null;

  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = Buffer.from(sign(body));
  const provided = Buffer.from(signature);
  if (
    expected.length !== provided.length ||
    !timingSafeEqual(expected, provided)
  )
    return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString(),
    ) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now())
      return null;
    if (typeof payload.sid !== "string" || !payload.sid) return null;
    if (!Number.isInteger(payload.cv) || payload.cv < 0) return null;
    if (
      typeof payload.sub !== "string" ||
      !loadAdmins().has(normalisePhone(payload.sub))
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function verifyAdminSessionToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  const payload = verifySessionToken(token);
  if (!payload) return null;
  return (await validateStoredSession(payload.sub, payload.sid, payload.cv))
    ? payload
    : null;
}

export function getAdminSessionToken(request: Request): string | undefined {
  const header = request.headers.get("cookie") ?? "";
  const match = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  return match?.slice(SESSION_COOKIE.length + 1);
}

export async function listAdminSessions(
  session: SessionPayload,
): Promise<AdminSessionView[]> {
  return listStoredSessions(session.sub, session.sid);
}

export async function revokeAdminSession(
  session: SessionPayload,
  sessionId: string,
): Promise<boolean> {
  return revokeStoredSession(session.sub, sessionId);
}

export async function revokeOtherAdminSessions(
  session: SessionPayload,
): Promise<number> {
  return revokeOtherStoredSessions(session.sub, session.sid);
}

export async function rotateAdminCredential(
  session: SessionPayload,
  challengeId: string,
  code: string,
  credential: string,
  request: Request,
  resumeOnly = false,
): Promise<{ token: string; payload: SessionPayload } | null> {
  if (!loadAdmins().has(session.sub)) return null;
  const salt = randomBytes(16);
  const hash = await scryptAsync(credential, salt);
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = new Date((now + SESSION_TTL_SECONDS) * 1_000);
  const rotated = await rotateCredentialWithOtp({
    phone: session.sub,
    initiatingSessionId: session.sid,
    challengeId,
    code,
    salt,
    hash,
    request,
    expiresAt,
    resumeOnly,
  });
  if (!rotated) return null;
  const payload: SessionPayload = {
    sub: session.sub,
    sid: rotated.sessionId,
    cv: rotated.credentialGeneration,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  return { token: tokenForPayload(payload), payload };
}

function tokenForPayload(payload: SessionPayload): string {
  const body = base64url(Buffer.from(JSON.stringify(payload)));
  return `${body}.${sign(body)}`;
}

function sign(body: string): string {
  return base64url(createHmac("sha256", sessionSecret()).update(body).digest());
}

function base64url(buffer: Buffer): string {
  return buffer.toString("base64url");
}
