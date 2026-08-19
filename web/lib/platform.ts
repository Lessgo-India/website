export type Platform = 'ios' | 'android' | 'other';

export function detectPlatformFromUA(userAgent: string): Platform {
  const ua = (userAgent || '').toLowerCase();
  // iPadOS 13+ reports as "macintosh" but includes touch; treat mobile Safari on
  // Apple hardware as iOS.
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/macintosh/.test(ua) && /mobile/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'other';
}

export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other';
  return detectPlatformFromUA(navigator.userAgent || '');
}
