'use client';

import Image from 'next/image';
import { useSyncExternalStore } from 'react';

const ASSET_ROOT = '/assets/app-screenshots';

export const APP_SCREENSHOTS = {
  events: {
    light: `${ASSET_ROOT}/events-light.png`,
    dark: `${ASSET_ROOT}/events-dark.png`,
    label: 'Events',
  },
  balances: {
    light: `${ASSET_ROOT}/balances-light.png`,
    dark: `${ASSET_ROOT}/balances-dark.png`,
    label: 'Balances',
  },
  groups: {
    light: `${ASSET_ROOT}/groups-light.png`,
    dark: `${ASSET_ROOT}/groups-dark.png`,
    label: 'Groups',
  },
  vibes: {
    light: `${ASSET_ROOT}/vibes-light.png`,
    dark: `${ASSET_ROOT}/vibes-dark.png`,
    label: 'Vibes',
  },
  profile: {
    light: `${ASSET_ROOT}/profile.png`,
    dark: `${ASSET_ROOT}/profile.png`,
    label: 'Profile',
  },
  'event-detail': {
    light: `${ASSET_ROOT}/event-detail.png`,
    dark: `${ASSET_ROOT}/event-detail.png`,
    label: 'Event details',
  },
} as const;

export type AppScreenshotName = keyof typeof APP_SCREENSHOTS;
type Theme = 'light' | 'dark';

function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  return () => observer.disconnect();
}

function getThemeSnapshot(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function getThemeServerSnapshot(): Theme {
  return 'dark';
}

export function AppScreenshot({
  name,
  decorative = true,
  eager = false,
  className = '',
}: {
  name: AppScreenshotName;
  decorative?: boolean;
  eager?: boolean;
  className?: string;
}) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getThemeServerSnapshot,
  );
  const screenshot = APP_SCREENSHOTS[name];

  return (
    <Image
      src={screenshot[theme]}
      alt={decorative ? '' : `Lessgo ${screenshot.label} screen`}
      width={1272}
      height={2800}
      sizes="(min-width: 640px) 300px, 78vw"
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      draggable={false}
      className={`h-full w-full select-none object-cover ${className}`}
    />
  );
}