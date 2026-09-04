import Link from 'next/link';
import { footer, site } from '@content/site';
import { Container } from './Section';
import { Logo } from './Logo';

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-bg-elev">
      <Container className="py-14 sm:py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">{footer.blurb}</p>
            <p className="mt-5 text-sm font-medium text-ink-faint">{footer.madeIn}</p>
          </div>

          {footer.columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-ink-faint">
                {col.title}
              </h2>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-ink-muted transition-colors duration-200 hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
          <p>
            Google Play and the Google Play logo are trademarks of Google LLC. Apple and the Apple
            logo are trademarks of Apple Inc., registered in the U.S. and other countries and
            regions. App Store is a service mark of Apple Inc.
          </p>
        </div>
      </Container>
    </footer>
  );
}
