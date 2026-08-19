'use client';

import Link from 'next/link';
import { useAuth } from '@web/lib/auth';
import { useMe } from '@web/lib/useMe';

const LOGO = 'https://lessgo-asset.s3.ap-south-1.amazonaws.com/images/logo.png';

export default function AppHeader() {
  const { user, signOut, configured } = useAuth();
  const { name } = useMe();

  return (
    <header className="luma-header border-b sticky top-0 z-50">
      <nav className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO} alt="Lessgo" className="h-7 w-7 sm:h-8 sm:w-8" />
          <span className="text-lg sm:text-xl font-semibold text-primary">Lessgo</span>
        </Link>
        {configured && user ? (
          <div className="flex items-center gap-3">
            {name ? (
              <span className="text-sm text-secondary hidden sm:inline">Hi, {name}</span>
            ) : null}
            <button
              onClick={() => void signOut()}
              className="luma-button luma-button-secondary text-sm"
            >
              Sign out
            </button>
          </div>
        ) : null}
      </nav>
    </header>
  );
}
