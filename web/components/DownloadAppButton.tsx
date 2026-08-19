'use client';

import React, { useEffect, useState } from 'react';
import { Apple, Play } from 'lucide-react';
import { detectPlatform, type Platform } from '@web/lib/platform';
import { ANDROID_APP_URL, IOS_APP_URL } from '@web/lib/config';

function StoreButton({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  const disabled = !href || href === '#';
  return (
    <a
      href={disabled ? undefined : href}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={disabled}
      className={`luma-button luma-button-primary no-underline inline-flex items-center gap-3 ${
        disabled ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex flex-col items-start leading-tight text-left">
        <span className="text-[11px] opacity-80">{subtitle}</span>
        <span className="text-sm font-semibold">{title}</span>
      </span>
    </a>
  );
}

export default function DownloadAppButton({ subtitle = 'Get the app' }: { subtitle?: string }) {
  const [platform, setPlatform] = useState<Platform>('other');
  useEffect(() => setPlatform(detectPlatform()), []);

  const ios = (
    <StoreButton
      href={IOS_APP_URL || '#'}
      icon={<Apple className="h-6 w-6" />}
      title="App Store"
      subtitle={subtitle}
    />
  );
  const android = (
    <StoreButton
      href={ANDROID_APP_URL || '#'}
      icon={<Play className="h-6 w-6" />}
      title="Google Play"
      subtitle={subtitle}
    />
  );

  if (platform === 'ios') return ios;
  if (platform === 'android') return android;
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {ios}
      {android}
    </div>
  );
}
