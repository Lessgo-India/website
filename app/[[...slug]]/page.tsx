'use client';

import dynamic from 'next/dynamic';

// The existing marketing site (a react-router SPA in ../../src) is reused
// verbatim and rendered client-only, exactly like the previous Vite build.
// Native Next routes (/e/[id], /onboarding, /me) take precedence over this
// optional catch-all, which handles /, /discover, /help, /legal, etc.
const MarketingApp = dynamic(() => import('../../src/App'), {
  ssr: false,
  loading: () => null,
});

export default function MarketingCatchAll() {
  return <MarketingApp />;
}
