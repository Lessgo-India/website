/**
 * Partner (merchant) portal flags — also gate Admin → Partners.
 *
 * The portal and the admin console's Partners section currently run on dummy
 * data (web/lib/partner/demoStore.ts + dummyData.ts) so the merchant and
 * onboarding flows can be reviewed before backend-offers-service exists.
 *
 * TODO(backend), in order:
 *  1. Add the BFF routes app/api/partner/* mirroring app/api/admin/*: login
 *     sets an httpOnly `lessgo_partner_session` cookie, every other route
 *     forwards to the gateway's /partners/* proxy with the partner's identity.
 *  2. Implement the gateway's /admin/partners routes (stubbed in
 *     gateway-service/src/modules/admin/admin-partners.controller.ts) and
 *     allowlist them for the admin BFF (see web/lib/adminPartnersApi.ts).
 *  3. Set NEXT_PUBLIC_PARTNER_PORTAL_BACKEND=true — partnerApi.ts and
 *     adminPartnersApi.ts then call those routes instead of the dummy store
 *     (see each function's contract).
 *  4. Serve the portal on a partners.* subdomain (rewrite to /partner in
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
