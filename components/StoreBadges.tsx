import Image from 'next/image';
import { ANDROID_APP_URL, IOS_APP_URL } from '@web/lib/config';

export function StoreBadges({ className = '' }: { className?: string }) {
  const stores = [
    {
      href: IOS_APP_URL,
      src: '/store-badges/app-store.svg',
      alt: 'Download on the App Store',
      name: 'App Store',
    },
    {
      href: ANDROID_APP_URL,
      src: '/store-badges/play-store-badge.png',
      alt: 'Get it on Google Play',
      name: 'Google Play',
    },
  ];

  return (
    <div className={`flex flex-wrap items-center gap-4 ${className}`} aria-label="App download options">
      {stores.map(({ href, src, alt, name }) =>
        href ? (
          <a
            key={name}
            href={href}
            aria-label={alt}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-14 items-center justify-center"
          >
            <Image src={src} alt={alt} width={168} height={56} className="h-14 w-[168px]" />
          </a>
        ) : (
          <div
            key={name}
            role="status"
            aria-label={`${name} download coming soon`}
            title="Coming soon"
            className="inline-flex min-h-14 items-center justify-center"
          >
            <Image src={src} alt={alt} width={168} height={56} className="h-14 w-[168px]" />
          </div>
        ),
      )}
    </div>
  );
}
