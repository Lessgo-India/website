import Image from 'next/image';
import { Apple, Play } from 'lucide-react';
import { site } from '@content/site';
import { ANDROID_APP_URL, IOS_APP_URL } from '@web/lib/config';

/**
 * Store buttons. Until the listings are live (`site.storesLive`), we render an
 * honest status line instead of dead links — a broken CTA converts worse than
 * no CTA, and store badge artwork may not be used before launch.
 */
export function StoreBadges({ className = '' }: { className?: string }) {
  if (!site.storesLive) {
    return (
      <div className={`flex flex-wrap items-center gap-3 ${className}`} aria-label="App store releases coming soon">
        {[
          { icon: Apple, name: 'App Store' },
          { icon: Play, name: 'Google Play' },
        ].map(({ icon: Icon, name }) => (
          <div
            key={name}
            role="status"
            aria-label={`${name} download coming soon`}
            title="Coming soon"
            className="inline-flex h-16 min-w-[164px] items-center gap-3 rounded-[10px] border border-[#a6a6a6] bg-black px-4 text-white"
          >
            <Icon className="h-7 w-7 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span className="leading-tight">
              <span className="block text-[0.58rem] font-medium uppercase text-white/75">Coming soon on</span>
              <span className="mt-0.5 block text-base font-semibold text-white">{name}</span>
            </span>
          </div>
        ))}
      </div>
    );
  }

  const stores = [
    {
      href: IOS_APP_URL,
      src: '/store-badges/download-on-the-app-store.svg',
      alt: 'Download on the App Store',
      width: 144,
      height: 48,
    },
    {
      href: ANDROID_APP_URL,
      src: '/store-badges/get-it-on-google-play.png',
      alt: 'Get it on Google Play',
      width: 162,
      height: 63,
    },
  ].filter((store) => Boolean(store.href));

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {stores.map(({ href, src, alt, width, height }) => (
        <a
          key={alt}
          href={href}
          aria-label={alt}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-16 items-center justify-center p-2"
        >
          <Image src={src} alt={alt} width={width} height={height} className="h-auto" />
        </a>
      ))}
    </div>
  );
}
