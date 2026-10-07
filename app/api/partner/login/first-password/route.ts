import { partnerBff } from '@web/lib/partnerGateway.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** First sign-in: replace the temporary password → gateway POST /partner-auth/first-password (sets the cookie). */
export const POST = partnerBff.firstPassword;
