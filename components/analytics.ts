/**
 * Consent-gated analytics.
 *
 * PostHog is only loaded after the visitor opts in, and events raised before
 * that are dropped rather than queued, so nothing is tracked without consent.
 * Implemented with PostHog's own snippet so the site keeps zero npm analytics
 * dependencies.
 */

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

export const CONSENT_STORAGE_KEY = 'lessgo.consent.analytics';
export type Consent = 'granted' | 'denied';

type PostHog = {
  init: (key: string, config: Record<string, unknown>) => void;
  capture: (event: string, props?: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    posthog?: PostHog;
  }
}

export function readConsent(): Consent | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

export function writeConsent(value: Consent): void {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, value);
  } catch {
    // Storage unavailable — the choice simply won't persist.
  }
}

let loading = false;

export function loadAnalytics(): void {
  if (typeof window === 'undefined') return;
  if (!KEY || loading || window.posthog) return;
  if (readConsent() !== 'granted') return;

  loading = true;

  const script = document.createElement('script');
  script.src = `${HOST.replace('.i.posthog.com', '-assets.i.posthog.com')}/static/array.js`;
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.onload = () => {
    window.posthog?.init(KEY, {
      api_host: HOST,
      // No cross-site cookies, no session recording, no autocapture of inputs.
      persistence: 'localStorage',
      autocapture: false,
      disable_session_recording: true,
      capture_pageview: false,
      mask_all_text: true,
      respect_dnt: true,
    });
    window.posthog?.capture('page_view', { path: window.location.pathname });
  };

  document.head.appendChild(script);
}

/** Fire an event. Silently no-ops without consent or configuration. */
export function track(event: string, props: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  if (readConsent() !== 'granted') return;
  window.posthog?.capture(event, props);
}
