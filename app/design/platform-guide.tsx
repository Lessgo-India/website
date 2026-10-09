'use client';

import { Monitor, Smartphone } from 'lucide-react';
import {
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import styles from './style-guide.module.css';

type Platform = 'website' | 'mobile';

const platformCopy: Record<
  Platform,
  { title: string; description: string }
> = {
  website: {
    title: 'Website system',
    description:
      'Responsive layouts, pointer and keyboard interaction, web typography, and browser-safe motion.',
  },
  mobile: {
    title: 'Mobile system',
    description:
      'Touch-first controls, native navigation, compact screens, and expressive app motion.',
  },
};

export function PlatformGuide({ children }: { children: ReactNode }) {
  const [platform, setPlatform] = useState<Platform>('website');
  const websiteTab = useRef<HTMLButtonElement>(null);
  const mobileTab = useRef<HTMLButtonElement>(null);

  const activate = (nextPlatform: Platform, moveFocus = false) => {
    setPlatform(nextPlatform);
    if (moveFocus) {
      const target = nextPlatform === 'website' ? websiteTab : mobileTab;
      requestAnimationFrame(() => target.current?.focus());
    }
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentPlatform: Platform,
  ) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();

    if (event.key === 'Home') {
      activate('website', true);
      return;
    }
    if (event.key === 'End') {
      activate('mobile', true);
      return;
    }

    activate(currentPlatform === 'website' ? 'mobile' : 'website', true);
  };

  const activeCopy = platformCopy[platform];

  return (
    <div className={styles.platformGuide} data-platform={platform}>
      <div className={styles.platformSwitcher}>
        <div className={styles.platformSwitcherIntro}>
          <span>Platform guides</span>
          <strong>{activeCopy.title}</strong>
          <p>{activeCopy.description}</p>
        </div>
        <div className={styles.platformTabs} role="tablist" aria-label="Choose a platform guide">
          <button
            ref={websiteTab}
            id="website-guide-tab"
            type="button"
            role="tab"
            aria-selected={platform === 'website'}
            aria-controls="platform-guide-panel"
            tabIndex={platform === 'website' ? 0 : -1}
            onClick={() => activate('website')}
            onKeyDown={(event) => handleKeyDown(event, 'website')}
          >
            <Monitor aria-hidden="true" />
            <span><strong>Website</strong><small>Responsive web</small></span>
          </button>
          <button
            ref={mobileTab}
            id="mobile-guide-tab"
            type="button"
            role="tab"
            aria-selected={platform === 'mobile'}
            aria-controls="platform-guide-panel"
            tabIndex={platform === 'mobile' ? 0 : -1}
            onClick={() => activate('mobile')}
            onKeyDown={(event) => handleKeyDown(event, 'mobile')}
          >
            <Smartphone aria-hidden="true" />
            <span><strong>Mobile</strong><small>Native app</small></span>
          </button>
        </div>
      </div>
      <div
        id="platform-guide-panel"
        className={styles.platformPanel}
        role="tabpanel"
        aria-labelledby={`${platform}-guide-tab`}
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  );
}
