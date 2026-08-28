import { NextResponse } from 'next/server';
import { normalisePhone } from '@web/lib/adminCredential';
import {
  createSessionToken,
  isAdminAuthConfigured,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  verifyCredential,
} from '@web/lib/adminSession.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WINDOW_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;
const CREDENTIAL_PATTERN = /^[0-9a-f]{64}$/;

// Per-instance throttle. Not a substitute for an edge rate limit, but it turns
// online password guessing from cheap into impractical.
const attempts = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    if (attempts.size > 5_000) {
      for (const [k, v] of attempts) if (now > v.resetAt) attempts.delete(k);
    }
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

function clientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for') ?? '';
  return forwarded.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}

export async function POST(req: Request) {
  if (!isAdminAuthConfigured()) {
    return json(
      { ok: false, message: 'Admin sign-in is not configured on this deployment.' },
      503,
    );
  }

  if (rateLimited(clientKey(req))) {
    return json({ ok: false, message: 'Too many attempts. Try again in a few minutes.' }, 429);
  }

  let body: { phone?: unknown; credential?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, message: 'Invalid request.' }, 400);
  }

  const phone = typeof body.phone === 'string' ? normalisePhone(body.phone) : '';
  const credential = typeof body.credential === 'string' ? body.credential : '';

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
