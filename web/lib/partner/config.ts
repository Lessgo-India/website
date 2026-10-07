/**
 * Partner (merchant) portal flags.
 *
 * The portal currently runs on dummy data (web/lib/partner/dummyData.ts) so
 * the merchant flows can be reviewed before backend-offers-service exists.
 *
 * TODO(backend), in order:
 *  1. Add the BFF routes app/api/partner/* mirroring app/api/admin/*: login
 *     sets an httpOnly `lessgo_partner_session` cookie, every other route
 *     forwards to the gateway's /partners/* proxy with the partner's identity.
 *  2. Set NEXT_PUBLIC_PARTNER_PORTAL_BACKEND=true — partnerApi.ts then calls
 *     those routes instead of the dummy store (see each function's contract).
 *  3. Serve the portal on a partners.* subdomain (rewrite to /partner in
 *     proxy.ts) and delete the demo accounts in dummyData.ts.
 */
export const PARTNER_PORTAL_CONFIG = {
  /** Hidden in production builds until the backend is live. */
  enabled:
    process.env.NODE_ENV !== 'production' ||
    process.env.NEXT_PUBLIC_PARTNER_PORTAL_ENABLED === 'true',
  useDummyData: process.env.NEXT_PUBLIC_PARTNER_PORTAL_BACKEND !== 'true',
  /** Mirrors the admin console's 8-hour session. */
  sessionTtlMs: 8 * 60 * 60 * 1000,
  /** Smallest audience a campaign may target (k-anonymity floor). */
  minAudience: 1_000,
} as const;

// TODO: switch to a dedicated partner-support inbox once one exists.
export const PARTNER_SUPPORT_EMAIL = 'hello@lessgo.in';
