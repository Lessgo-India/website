import 'server-only';

import { randomUUID } from 'node:crypto';
import { readBoundedJson } from './boundedJsonBody';
import { PARTNER_PORTAL_CONFIG } from './partner/config';
import { createPartnerBffHandlers, createPartnerGatewayCaller } from './partner/partnerBff';

/**
 * SERVER ONLY — the browser never learns the gateway's partner-portal key or
 * the partner's session token.
 *
 * The portal talks to this app's own origin (app/api/partner/*); only this
 * module talks to the gateway, adding `x-partner-portal-key` from
 * PARTNER_GATEWAY_KEY and the session from the httpOnly
 * `lessgo_partner_session` cookie. The logic lives in partner/partnerBff.ts
 * (unit-tested); this file wires it to the environment.
 */
export const callPartnerGateway = createPartnerGatewayCaller({
  // Literal reads so NEXT_PUBLIC_BACKEND_API is inlined like everywhere else.
  env: () => ({
    PARTNER_GATEWAY_URL: process.env.PARTNER_GATEWAY_URL,
    ADMIN_GATEWAY_URL: process.env.ADMIN_GATEWAY_URL,
    NEXT_PUBLIC_BACKEND_API: process.env.NEXT_PUBLIC_BACKEND_API,
    PARTNER_GATEWAY_KEY: process.env.PARTNER_GATEWAY_KEY,
  }),
  fetch: (url, init) => fetch(url, init),
  requestId: () => randomUUID(),
});

export const partnerBff = createPartnerBffHandlers({
  enabled: () => PARTNER_PORTAL_CONFIG.enabled,
  callGateway: callPartnerGateway,
  readJson: readBoundedJson,
  secureCookies: () => process.env.NODE_ENV === 'production',
});
