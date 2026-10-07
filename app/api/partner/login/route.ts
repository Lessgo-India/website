import { partnerBff } from '@web/lib/partnerGateway.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Partner sign-in → gateway POST /partner-auth/login. A signed-in response
 * sets the httpOnly `lessgo_partner_session` cookie; the token itself never
 * reaches the browser.
 */
export const POST = partnerBff.login;
