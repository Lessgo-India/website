'use client';

import { useEffect } from 'react';
import { track } from './analytics';

/**
 * Reports the URL that 404'd, plus where the visitor came from, so broken
 * links can actually be found and fixed. Consent-gated like every other event.
 */
export function NotFoundTracker() {
  useEffect(() => {
    track('page_not_found', {
      path: window.location.pathname,
      referrer: document.referrer || undefined,
    });
  }, []);

  return null;
}
