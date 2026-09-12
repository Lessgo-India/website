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

export function isAnalyticsSuppressedPath(pathname: string): boolean {
  return pathname === '/delete-account' || pathname.startsWith('/delete-account/');
}

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
let initialized = false;

/**
 * Events raised while the PostHog script is still downloading. Without this,
 * anything fired from a mount effect on a fresh page load — the 404 report,
 * for one — would be dropped before `window.posthog` exists.
 */
let pending: Array<[string, Record<string, unknown>]> = [];

function initializeAnalytics(): void {
  if (typeof window === 'undefined') return;
  if (isAnalyticsSuppressedPath(window.location.pathname)) {
    pending = [];
    return;
  }
  if (initialized || readConsent() !== 'granted' || !window.posthog) return;

  window.posthog.init(KEY!, {
    api_host: HOST,
    // No cross-site cookies, session recording, page-leave events, or input capture.
    persistence: 'localStorage',
    autocapture: false,
    disable_session_recording: true,
    capture_pageview: false,
    capture_pageleave: false,
    mask_all_text: true,
    respect_dnt: true,
  });
  initialized = true;
  const currentPath = window.location.pathname;
  const currentPageViewQueued = pending.some(
    ([event, props]) => event === 'page_view' && props.path === currentPath,
  );
  if (!currentPageViewQueued) window.posthog.capture('page_view', { path: currentPath });
  pending.forEach(([event, props]) => window.posthog?.capture(event, props));
  pending = [];
}

export function loadAnalytics(): void {
  if (typeof window === 'undefined') return;
  if (isAnalyticsSuppressedPath(window.location.pathname)) {
    pending = [];
    return;
  }
  if (!KEY || loading || initialized) return;
  if (readConsent() !== 'granted') return;

  if (window.posthog) {
    initializeAnalytics();
    return;
  }

  loading = true;

  const script = document.createElement('script');
  script.src = `${HOST.replace('.i.posthog.com', '-assets.i.posthog.com')}/static/array.js`;
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.onload = () => {
    loading = false;
    initializeAnalytics();
  };
  script.onerror = () => {
    loading = false;
  };

  document.head.appendChild(script);
}

/** Fire an event. Silently no-ops without consent or configuration. */
export function track(event: string, props: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  if (isAnalyticsSuppressedPath(window.location.pathname)) {
    pending = [];
    return;
  }
  if (readConsent() !== 'granted') return;
  if (!initialized || !window.posthog) {
    if (KEY && pending.length < 20) pending.push([event, props]);
    return;
  }
  window.posthog.capture(event, props);
}
