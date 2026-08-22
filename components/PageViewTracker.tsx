'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { track } from './analytics';

/**
 * Reports client-side route changes. The first page view is sent by
 * loadAnalytics() when consent is granted, so it is skipped here to avoid a
 * duplicate.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    track('page_view', { path: pathname });
  }, [pathname]);

  return null;
}
