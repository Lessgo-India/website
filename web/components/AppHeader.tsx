'use client';

import { LogOut } from 'lucide-react';
import { Logo } from '@ui/Logo';
import { ThemeToggle } from '@ui/ThemeToggle';
import { useAuth } from '@web/lib/auth';
import { useMe } from '@web/lib/useMe';

/**
 * Header for the guest (RSVP) surfaces. Deliberately lighter than the marketing
 * SiteHeader — no nav, no install CTA — so a guest opening an invite has one
 * obvious thing to do.
 */
export default function AppHeader() {
  const { user, signOut, configured } = useAuth();
  const { name } = useMe();

  return (
    <header className="sticky top-0 z-50 border-b border-line glass">
      <div className="container-page flex h-[72px] items-center justify-between gap-4">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {configured && user ? (
            <>
              {name ? (
                <span className="hidden text-sm text-ink-muted sm:inline">Hi, {name}</span>
              ) : null}
              <button
                type="button"
                onClick={() => void signOut()}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink transition-transform duration-200 ease-spring hover:-translate-y-px"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
