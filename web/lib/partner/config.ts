/**
 * Partner (merchant) portal flags — also gate Admin → Partners.
 *
 * The portal and the admin console's Partners section run on dummy data
 * (web/lib/partner/demoStore.ts + dummyData.ts) unless
 * NEXT_PUBLIC_PARTNER_PORTAL_BACKEND=true, so the merchant and onboarding
 * flows can be reviewed before backend-offers-service is live.
 *
 * Backend mode (README → "Partner portal: backend mode"):
 *  - Portal: app/api/partner/* (web/lib/partner/partnerBff.ts) keeps the
 *    session in the httpOnly `lessgo_partner_session` cookie and forwards to
 *    the gateway's BFF-only /partner-auth/* and /partner/* routes with the
 *    server-only PARTNER_GATEWAY_KEY.
 *  - Admin → Partners: the admin BFF (app/api/admin/gateway/[...path])
 *    allowlists the gateway's /admin/partners routes
 *    (web/lib/adminGatewayPolicy.js).
 *
 * TODO(backend), in order:
 *  1. Implement the gateway's /admin/partners routes (stubbed in
 *     gateway-service/src/modules/admin/admin-partners.controller.ts) and its
 *     /partner-auth/* + /partner/* portal proxy.
 *  2. Set NEXT_PUBLIC_PARTNER_PORTAL_BACKEND=true (build time) with
 *     PARTNER_GATEWAY_URL / PARTNER_GATEWAY_KEY — partnerApi.ts and
 *     adminPartnersApi.ts then call those routes instead of the dummy store
 *     (see each function's contract).
 *  3. Serve the portal on a partners.* subdomain (rewrite to /partner in
 *     proxy.ts, set NEXT_PUBLIC_PARTNER_LOGIN_URL) and delete demoStore.ts
 *     and dummyData.ts.
 */
import { BACKEND_API } from '../config';

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

/**
 * Where partners' servers call Lessgo: the gateway's /partner-api/v1/* and
 * /webhooks/offers/:partnerId routes. Shown in the Integrations docs.
 * NEXT_PUBLIC_PARTNER_API_BASE_URL overrides the gateway URL if partner
 * traffic gets its own host (e.g. partners-api.lessgo.in).
 */
export function partnerApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_PARTNER_API_BASE_URL?.trim() || BACKEND_API;
  return configured ? configured.replace(/\/+$/, '') : 'https://<lessgo-gateway>';
}

// TODO: switch to a dedicated partner-support inbox once one exists.
export const PARTNER_SUPPORT_EMAIL = 'hello@lessgo.in';

/**
 * The sign-in page that goes into the credentials Lessgo sends partners.
 * Set NEXT_PUBLIC_PARTNER_LOGIN_URL once the portal has its partners.*
 * subdomain; until then it's this site's /partner/login.
 */
export function partnerLoginUrl(): string {
  const configured = process.env.NEXT_PUBLIC_PARTNER_LOGIN_URL?.trim();
  if (configured) return configured;
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origin}/partner/login`;
}
