import { NextRequest, NextResponse } from 'next/server';
import {
  contentSecurityPolicyFor,
  requiresNonceContentSecurityPolicy,
} from '@web/lib/contentSecurityPolicy';

/** Nonce-based CSP for the admin console and the partner portal (web/lib/contentSecurityPolicy.ts). */
export function proxy(request: NextRequest) {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = (forwardedHost || request.headers.get('host') || '')
    .split(':')[0]
    .toLowerCase();

  if (request.nextUrl.pathname === '/' && host === 'design.lessgo.in') {
    const designUrl = request.nextUrl.clone();
    designUrl.pathname = '/design';
    return NextResponse.rewrite(designUrl);
  }

  if (!requiresNonceContentSecurityPolicy(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

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
  matcher: ['/', '/admin/:path*', '/partner/:path*'],
};
