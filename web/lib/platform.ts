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

// In-app browsers (WhatsApp/Instagram/Facebook/etc.) and Android/iOS WebViews
// block the third-party storage that Firebase phone-auth reCAPTCHA needs, so the
// OTP send fails there ("Verification failed"). Detect them so we can send users
// to a real browser instead.
export function detectInAppBrowserFromUA(userAgent: string): boolean {
  const ua = userAgent || '';
  if (!ua) return false;
  // Named in-app browsers.
  if (
    /FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp|Snapchat|Twitter|TikTok|musical_ly|Pinterest|LinkedInApp|MicroMessenger|GSA\//i.test(
      ua,
    )
  ) {
    return true;
  }
  // Android System WebView (e.g. "; wv)").
  if (/;\s?wv[;)]/i.test(ua)) return true;
  // iOS WKWebView in-app browser: WebKit on Apple mobile hardware but no
  // real-browser token (Safari / CriOS=Chrome / FxiOS=Firefox / EdgiOS / OPiOS).
  const isiOS = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile/i.test(ua));
  if (isiOS && /AppleWebKit/i.test(ua) && !/Safari|CriOS|FxiOS|EdgiOS|OPiOS|OPR\//i.test(ua)) {
    return true;
  }
  return false;
}

export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return detectInAppBrowserFromUA(navigator.userAgent || '');
}
