import { partnerBff } from '@web/lib/partnerGateway.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Every other portal call: /api/partner/<path>?<query> → gateway
 * /partner/<path>?<query> with the session from the cookie (see
 * web/lib/partner/partnerBff.ts for the checks).
 */
export const GET = partnerBff.GET;
export const POST = partnerBff.POST;
export const PUT = partnerBff.PUT;
export const PATCH = partnerBff.PATCH;
export const DELETE = partnerBff.DELETE;
