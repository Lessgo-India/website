import { NextResponse } from 'next/server';
import { callGateway, readSession } from '@web/lib/adminGateway.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Read-only pass-through to the gateway's `/admin/*` API. GET only, by design. */
export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const session = readSession(req);
  if (!session) {
    return NextResponse.json(
      { message: 'Your session has expired. Please sign in again.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const { path } = await params;
  const segments = (path ?? []).filter((segment) => /^[a-z0-9-]+$/i.test(segment));
  if (segments.length === 0) {
    return NextResponse.json({ message: 'Unknown admin endpoint.' }, { status: 404 });
  }

  const { status, body } = await callGateway(
    segments.join('/'),
    new URL(req.url).search,
    session,
  );

  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}
