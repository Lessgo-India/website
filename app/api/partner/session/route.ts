import { partnerBff } from '@web/lib/partnerGateway.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The signed-in partner → gateway GET /partner-auth/session; a 401 clears the cookie. */
export const GET = partnerBff.session;
