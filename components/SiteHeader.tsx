'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { nav } from '@content/site';
import { ButtonLink } from './Button';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock the page behind the full-screen mobile sheet.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled ? 'border-b border-line glass' : 'border-b border-transparent'
      }`}
    >
      <div className="container-page flex h-[72px] items-center justify-between gap-4">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {nav.primary.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-[0.95rem] font-medium text-ink-muted transition-colors duration-200 hover:bg-surface-2 hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <ButtonLink href={nav.cta.href} className="hidden sm:inline-flex">
            {nav.cta.label}
          </ButtonLink>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink md:hidden"
          >
            {open ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {open ? (
        <div
          id="mobile-nav"
          className="fixed inset-x-0 bottom-0 top-[72px] z-40 flex flex-col gap-2 overflow-y-auto border-t border-line bg-bg px-5 pb-10 pt-6 md:hidden"
        >
          {nav.primary.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-2xl border border-line bg-surface px-5 py-4 text-lg font-semibold text-ink"
            >
              {item.label}
            </Link>
          ))}
          <ButtonLink
            href={nav.cta.href}
            size="lg"
            className="mt-2 w-full"
            onClick={() => setOpen(false)}
          >
            {nav.cta.label}
          </ButtonLink>
        </div>
      ) : null}
    </header>
  );
}
