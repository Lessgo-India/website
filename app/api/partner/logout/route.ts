import { partnerBff } from '@web/lib/partnerGateway.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Sign out → gateway POST /partner-auth/logout; always clears the cookie (204). */
export const POST = partnerBff.logout;
