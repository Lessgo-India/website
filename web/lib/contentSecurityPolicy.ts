/**
 * The nonce-based Content-Security-Policy proxy.ts sets on the internal
 * tools: the admin console and the partner portal (/partner: merchant
 * sign-in, passwords and one-time API secrets). Both load no marketing
 * analytics and only call their own origin (/api/admin/*, /api/partner/*).
 *
 * Self-contained so node's test runner can load it (contentSecurityPolicy.test.mjs).
 */

const ASSET_BUCKET = 'https://lessgo-asset.s3.ap-south-1.amazonaws.com';
const TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com';

const isUnder = (pathname: string, root: string) => pathname === root || pathname.startsWith(`${root}/`);

export function contentSecurityPolicyFor(pathname: string, options: { nonce: string; development: boolean }): string {
  const partnerPortal = isUnder(pathname, '/partner');
  // Campaign creatives are whatever https URL the partner pasted into the
  // campaign wizard (TODO(backend): direct uploads to the asset bucket), so
  // the portal and Admin → Partners, where campaigns are reviewed, show any
  // https image. The rest of the admin console only shows the asset bucket's.
  const campaignCreatives = partnerPortal || isUnder(pathname, '/admin/partners');
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${options.nonce}'${partnerPortal ? ` ${TURNSTILE_ORIGIN}` : ''}${options.development ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    campaignCreatives ? "img-src 'self' data: blob: https:" : `img-src 'self' data: blob: ${ASSET_BUCKET}`,
    "font-src 'self' data:",
    partnerPortal ? `connect-src 'self' ${TURNSTILE_ORIGIN}` : "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "media-src 'none'",
    // Outlets show their map pin in an OpenStreetMap embed; partner signup
    // renders Cloudflare Turnstile. Keep both exact origins across /partner
    // because client-side navigation preserves the document's original CSP.
    partnerPortal
      ? `frame-src https://www.openstreetmap.org ${TURNSTILE_ORIGIN}`
      : "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

/**
 * Whether two internal paths share one policy. A document keeps the CSP it
 * was loaded with through client-side navigations, so a link between paths
 * that don't must load a new document (a plain <a>, not next/link): moving
 * between Admin → Partners and the rest of the admin console.
 */
export function sameContentSecurityPolicy(from: string, to: string): boolean {
  const options = { nonce: '', development: false };
  return contentSecurityPolicyFor(from, options) === contentSecurityPolicyFor(to, options);
}
