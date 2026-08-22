import { Apple, Smartphone } from 'lucide-react';
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
      <div className={`flex flex-wrap items-center gap-3 ${className}`}>
        {[
          { icon: Smartphone, label: 'Android', status: 'In early access' },
          { icon: Apple, label: 'iOS', status: 'Coming next' },
        ].map(({ icon: Icon, label, status }) => (
          <div
            key={label}
            className="inline-flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
          >
            <Icon className="h-5 w-5 text-ink-muted" aria-hidden="true" />
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-ink">{label}</span>
              <span className="block text-xs text-ink-faint">{status}</span>
            </span>
          </div>
        ))}
      </div>
    );
  }

  const stores = [
    { href: ANDROID_APP_URL, icon: Smartphone, top: 'Get it on', name: 'Google Play' },
    { href: IOS_APP_URL, icon: Apple, top: 'Download on the', name: 'App Store' },
  ].filter((s) => Boolean(s.href));

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {stores.map(({ href, icon: Icon, top, name }) => (
        <a
          key={name}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-3 transition-transform duration-200 ease-spring hover:-translate-y-px hover:shadow-soft"
        >
          <Icon className="h-6 w-6 text-ink" aria-hidden="true" />
          <span className="leading-tight">
            <span className="block text-[0.65rem] uppercase tracking-wide text-ink-faint">
              {top}
            </span>
            <span className="block text-sm font-bold text-ink">{name}</span>
          </span>
        </a>
      ))}
    </div>
  );
}
