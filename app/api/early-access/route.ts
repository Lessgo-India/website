import { NextResponse } from 'next/server';
import {
  isEarlyAccessStorageConfigured,
  saveInterestSignup,
} from '@web/lib/earlyAccess.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Early-access capture.
 *
 * Signups are stored in MongoDB by the website service. Email is normalized
 * and uniquely indexed so retries never create duplicate contacts.
 */

const CONTACT_EMAIL = 'hello@lessgo.com';
const MAX_BODY_BYTES = 2_000;
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

// Best-effort per-instance throttle. Not a substitute for an edge rate limit,
// but it blunts casual abuse of the endpoint.
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    if (hits.size > 5_000) {
      for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
    }
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

function clientKey(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') ?? '';
  return fwd.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}

// Deliberately conservative: one @, a dot in the domain, no whitespace.
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export async function POST(req: Request) {
  if (rateLimited(clientKey(req))) {
    return NextResponse.json(
      { ok: false, message: 'Too many attempts. Please try again in a minute.' },
      { status: 429 },
    );
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, message: 'Request too large.' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid request.' }, { status: 400 });
  }

  const { email, source } = (body ?? {}) as { email?: unknown; source?: unknown };

  if (typeof email !== 'string' || email.length > 254 || !EMAIL.test(email.trim())) {
    return NextResponse.json(
      { ok: false, message: 'That email address does not look right.' },
      { status: 400 },
    );
  }

  const normalized = email.trim().toLowerCase();
  const origin =
    typeof source === 'string' && source.trim() ? source.trim().slice(0, 40) : 'unknown';

  if (!isEarlyAccessStorageConfigured()) {
    console.warn('[early-access] MONGODB_URL is not set; signup not stored.');
    return NextResponse.json(
      {
        ok: false,
        message: `Our signup form is not connected yet — email us at ${CONTACT_EMAIL} and we'll add you.`,
      },
      { status: 503 },
    );
  }

  try {
    await saveInterestSignup(normalized, origin);
  } catch (err) {
    const mongoError = err as { name?: unknown; code?: unknown };
    // Never log the address or a connection string.
    console.error('[early-access] MongoDB write failed', {
      name: typeof mongoError?.name === 'string' ? mongoError.name : 'UnknownError',
      code: typeof mongoError?.code === 'number' ? mongoError.code : undefined,
    });
    return NextResponse.json(
      { ok: false, message: `Could not save that just now. Try again, or email ${CONTACT_EMAIL}.` },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "You're on the list. We'll email you the moment Lessgo opens up.",
  });
}
