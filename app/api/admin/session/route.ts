import { NextResponse } from 'next/server';
import { callGateway, readSession } from '@web/lib/adminGateway.server';
import { isAdminAuthConfigured } from '@web/lib/adminSession.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Whether the caller holds a valid admin session, plus whether stats are live. */
export async function GET(req: Request) {
  const session = readSession(req);

  if (!session) {
    return NextResponse.json(
      { admin: false, configured: isAdminAuthConfigured() },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  // Surfaced so the dashboard can warn when the gateway has no database rather
  // than rendering a page of dashes with no explanation.
  const gateway = await callGateway('session', '', session);
  const statsAvailable =
    gateway.status === 200 && (gateway.body as { statsAvailable?: boolean })?.statsAvailable === true;

  return NextResponse.json(
    {
      admin: true,
      configured: true,
      userId: session.sub,
      expiresAt: session.exp * 1000,
      statsAvailable,
      gatewayReachable: gateway.status === 200,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
