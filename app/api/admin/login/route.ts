import { NextResponse } from 'next/server';
import { normalisePhone } from '@web/lib/adminCredential';
import {
  consumeAdminLoginAddressRateLimit,
  consumeAdminLoginPhoneRateLimit,
} from '@web/lib/adminLoginRateLimit.server';
import {
  createSessionToken,
  isAdminAuthConfigured,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  verifyCredential,
} from '@web/lib/adminSession.server';
import { readBoundedJson } from '@web/lib/boundedJsonBody';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CREDENTIAL_PATTERN = /^[0-9a-f]{64}$/;
const MAX_LOGIN_BODY_BYTES = 4_096;

export async function POST(req: Request) {
  if (!isAdminAuthConfigured()) {
    return json(
      { ok: false, message: 'Admin sign-in is not configured on this deployment.' },
      503,
    );
  }

  const addressLimit = await consumeAdminLoginAddressRateLimit(req);
  const limitedResponse = rateLimitResponse(addressLimit);
  if (limitedResponse) return limitedResponse;

  if (
    !(req.headers.get('content-type') ?? '').startsWith('application/json')
  ) {
    return json({ ok: false, message: 'Admin sign-in requires JSON.' }, 415);
  }
  const declaredLength = Number(req.headers.get('content-length') ?? 0);
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_LOGIN_BODY_BYTES
  ) {
    return json({ ok: false, message: 'Sign-in request is too large.' }, 413);
  }

  const parsed = await readBoundedJson<{
    phone?: unknown;
    credential?: unknown;
  }>(req.body, MAX_LOGIN_BODY_BYTES);
  if (!parsed.ok) {
    if (parsed.reason === 'too-large') {
      return json({ ok: false, message: 'Sign-in request is too large.' }, 413);
    }
    return json({ ok: false, message: 'Invalid request.' }, 400);
  }
  const body = parsed.value;

  const phone = typeof body.phone === 'string' ? normalisePhone(body.phone) : '';
  const credential = typeof body.credential === 'string' ? body.credential : '';

  const phoneLimit = await consumeAdminLoginPhoneRateLimit(req, phone);
  const phoneLimitedResponse = rateLimitResponse(phoneLimit);
  if (phoneLimitedResponse) return phoneLimitedResponse;

  // The client always sends a PBKDF2 digest, never a password. Anything else is
  // a malformed or hand-rolled request.
  if (phone.length !== 10 || !CREDENTIAL_PATTERN.test(credential)) {
    return json({ ok: false, message: 'Invalid phone number or password.' }, 401);
  }

  if (!(await verifyCredential(phone, credential))) {
    // Deliberately identical for a wrong password and an unknown number.
    return json({ ok: false, message: 'Invalid phone number or password.' }, 401);
  }

  const response = json({ ok: true, userId: phone }, 200);
  response.cookies.set({
    name: SESSION_COOKIE,
    value: createSessionToken(phone),
    // Unreadable to JavaScript, so an XSS bug can't lift the session.
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}

function json(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function rateLimitResponse(
  result:
    | { allowed: true }
    | { allowed: false; reason: 'limited' | 'unavailable' },
) {
  if (result.allowed) return null;
  return result.reason === 'unavailable'
    ? json(
        { ok: false, message: 'Admin sign-in is temporarily unavailable.' },
        503,
      )
    : json(
        { ok: false, message: 'Too many attempts. Try again in a few minutes.' },
        429,
      );
}
