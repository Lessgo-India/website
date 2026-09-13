'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BellRing,
  Bug,
  Download,
  Gauge,
  LogOut,
  RefreshCw,
  Settings,
  ShieldAlert,
  WifiOff,
} from 'lucide-react';
import { ThemeToggle } from '@ui/ThemeToggle';
import { adminLogout } from '@web/lib/adminApi';
import { unsubscribeCurrentAdminDevice } from '@web/lib/adminAlertsApi';
import { useAdminSession } from './AdminGate';
import { useAdminPwa } from './AdminPwaProvider';
import { useState, type ReactNode } from 'react';

const NAVIGATION = [
  { href: '/admin', label: 'Operations', icon: Gauge },
  { href: '/admin/reports', label: 'Reports', icon: ShieldAlert },
  { href: '/admin/bugs', label: 'Bugs', icon: Bug },
  { href: '/admin/notifications', label: 'Notifications', icon: BellRing },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
] as const;

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { session } = useAdminSession();
  const pwa = useAdminPwa();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const current =
    NAVIGATION.find((item) =>
      item.href === '/admin'
        ? pathname === item.href
        : pathname.startsWith(item.href),
    ) ?? NAVIGATION[0];

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError(null);
    const cleanup = await unsubscribeCurrentAdminDevice(pwa.registration);
    if (!cleanup.safe) {
      setSignOutError(
        'Could not disable browser alerts safely. Check your connection and try signing out again.',
      );
      setSigningOut(false);
      return;
    }
    await adminLogout();
    window.location.reload();
  }

  return (
    <div className="admin-shell min-h-screen bg-bg text-ink lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen border-r border-line bg-surface lg:flex lg:flex-col">
        <div className="flex items-center gap-3 border-b border-line px-5 py-5">
          <Image
            src="/admin-icon.png"
            alt=""
            width={42}
            height={38}
            priority
            className="h-9 w-auto object-contain"
          />
          <div>
            <p className="font-display text-base font-extrabold">Lessgo Admin</p>
            <p className="text-xs text-ink-muted">Operations console</p>
          </div>
        </div>
        <AdminNavigation pathname={pathname} online={pwa.online} />
        <div className="mt-auto border-t border-line p-3">
          <div className="mb-2 flex items-center gap-2 px-2 text-xs text-ink-muted">
            <span
              className={`h-2 w-2 rounded-full ${pwa.online ? 'bg-ok' : 'bg-down'}`}
              aria-hidden="true"
            />
            {pwa.online ? 'Connected' : 'Offline'}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle className="rounded-md" />
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut || !pwa.online}
              title="Sign out"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-line text-sm font-semibold text-ink-muted hover:bg-surface-2 hover:text-ink disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="admin-safe-top sticky top-0 z-40 flex items-center gap-3 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
          <Image
            src="/admin-icon.png"
            alt=""
            width={36}
            height={33}
            priority
            className="h-8 w-auto object-contain"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-extrabold">
              {current.label}
            </p>
            <p className="text-xs text-ink-muted">Lessgo Admin</p>
          </div>
          {pwa.installAvailable ? (
            <Link
              href="/admin/settings"
              title="Install admin app"
              className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-line text-gold"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Install admin app</span>
            </Link>
          ) : null}
          <ThemeToggle className="rounded-md" />
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut || !pwa.online}
            title="Sign out"
            className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-md border border-line text-ink-muted hover:bg-surface-2 hover:text-ink disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Sign out</span>
          </button>
        </header>

        <div aria-live="polite" aria-atomic="true">
            {signOutError ? (
              <div className="border-b border-down bg-down-tint px-4 py-3 text-center text-sm text-ink">
                {signOutError}
              </div>
            ) : null}
          {!pwa.online ? (
            <div className="flex items-center justify-center gap-2 border-b border-warn bg-warn-tint px-4 py-3 text-sm font-semibold text-ink">
              <WifiOff className="h-4 w-4 text-warn" aria-hidden="true" />
              Offline. Admin data and actions are unavailable.
            </div>
          ) : null}
          {pwa.updateAvailable ? (
            <div className="flex flex-wrap items-center justify-center gap-3 border-b border-profile bg-profile-tint px-4 py-3 text-sm text-ink">
              <span>A new admin version is ready.</span>
              <button
                type="button"
                onClick={pwa.activateUpdate}
                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 font-semibold text-bg"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Reload
              </button>
            </div>
          ) : null}
          {!session.statsAvailable ? (
            <div className="border-b border-warn bg-warn-tint px-4 py-3 text-center text-sm text-ink">
              {session.gatewayReachable
                ? 'Counts and trends are unavailable; service health remains live.'
                : 'The gateway is unreachable. Live admin data is unavailable.'}
            </div>
          ) : null}
        </div>

        <main className="admin-content min-w-0">
          <div
            hidden={!pwa.online}
            aria-hidden={!pwa.online}
            {...(!pwa.online ? { inert: true } : {})}
          >
            {children}
          </div>
          {!pwa.online ? <OfflineSurface /> : null}
        </main>
      </div>

      <nav
        aria-label="Admin sections"
        className="admin-bottom-nav fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-line bg-surface/95 px-2 pt-2 backdrop-blur lg:hidden"
      >
        {NAVIGATION.map((item) => (
          <AdminNavLink
            key={item.href}
            item={item}
            pathname={pathname}
            mobile
            online={pwa.online}
          />
        ))}
      </nav>
    </div>
  );
}

function AdminNavigation({
  pathname,
  online,
}: {
  pathname: string;
  online: boolean;
}) {
  return (
    <nav aria-label="Admin sections" className="space-y-1 p-3">
      {NAVIGATION.map((item) => (
        <AdminNavLink
          key={item.href}
          item={item}
          pathname={pathname}
          online={online}
        />
      ))}
    </nav>
  );
}

function AdminNavLink({
  item,
  pathname,
  mobile = false,
  online,
}: {
  item: (typeof NAVIGATION)[number];
  pathname: string;
  mobile?: boolean;
  online: boolean;
}) {
  const active =
    item.href === '/admin'
      ? pathname === item.href
      : pathname.startsWith(item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      aria-disabled={!online}
      onClick={(event) => {
        if (!online) event.preventDefault();
      }}
      className={
        mobile
          ? `flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-semibold ${active ? 'bg-profile-tint text-profile' : 'text-ink-muted'}`
          : `flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors ${active ? 'bg-profile-tint text-ink' : 'text-ink-muted hover:bg-surface-2 hover:text-ink'}`
      }
    >
      <Icon className="h-5 w-5 flex-none" aria-hidden="true" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function OfflineSurface() {
  return (
    <section className="mx-auto flex min-h-[65vh] w-full max-w-lg flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-md bg-warn-tint text-warn">
        <WifiOff className="h-6 w-6" aria-hidden="true" />
      </div>
      <h1 className="mt-5 font-display text-2xl font-bold text-ink">
        You’re offline
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-ink-muted">
        Current admin data and actions require a connection. Nothing from this
        console is stored for offline use.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md border border-line px-5 text-sm font-semibold text-ink hover:bg-surface-2"
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Try again
      </button>
    </section>
  );
}
