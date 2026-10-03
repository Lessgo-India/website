import Image from 'next/image';
import { site } from '@content/site';
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

  if (!site.storesLive) {
    return (
      <div className={`flex flex-wrap items-center gap-4 ${className}`} aria-label="App store releases coming soon">
        {stores.map(({ src, alt, name }) => (
          <div
            key={name}
            role="status"
            aria-label={`${name} download coming soon`}
            title="Coming soon"
            className="inline-flex min-h-14 items-center justify-center"
          >
            <Image src={src} alt={alt} width={168} height={56} className="h-14 w-[168px]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-4 ${className}`}>
      {stores.filter(({ href }) => Boolean(href)).map(({ href, src, alt }) => (
        <a
          key={alt}
          href={href}
          aria-label={alt}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-14 items-center justify-center"
        >
          <Image src={src} alt={alt} width={168} height={56} className="h-14 w-[168px]" />
        </a>
      ))}
    </div>
  );
}
