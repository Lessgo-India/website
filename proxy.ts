import { NextRequest, NextResponse } from 'next/server';
import { contentSecurityPolicyFor } from '@web/lib/contentSecurityPolicy';

/** Nonce-based CSP for the admin console and the partner portal (web/lib/contentSecurityPolicy.ts). */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const contentSecurityPolicy = contentSecurityPolicyFor(request.nextUrl.pathname, {
    nonce,
    development: process.env.NODE_ENV === 'development',
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/partner/:path*'],
};
