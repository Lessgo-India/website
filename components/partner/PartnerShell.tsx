'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ComponentType, type ReactNode } from 'react';
import { LayoutDashboard, LogOut, Megaphone, PlugZap, Plus, Receipt, ScanLine, Settings, Store } from 'lucide-react';
import { ThemeToggle } from '@ui/ThemeToggle';
import { PARTNER_PORTAL_CONFIG } from '@web/lib/partner/config';
import { salesLabel } from '@web/lib/partner/channels';
import { can, hasFeature, type PartnerFeature, type PartnerPermission } from '@web/lib/partner/rules';
import type { PartnerRole } from '@web/lib/partner/types';
import { usePartnerSession, useSignedInPartner } from './PartnerSessionProvider';
import { BrandAvatar, DemoTag, PortalMark } from './ui';

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  permission: PartnerPermission;
  /** Only for partners whose redemption channels include this area. */
  feature?: PartnerFeature;
  /** Shorter label for the phone tab bar. */
  mobileLabel?: string;
}

// The partner type (redemption channels, set at onboarding) decides which
// areas exist: outlets and the Redeem counter for in-store partners, Orders /
// Bookings and Integrations for online ones.
const NAVIGATION: readonly NavItem[] = [
  { href: '/partner', label: 'Overview', icon: LayoutDashboard, permission: 'overview' },
  { href: '/partner/campaigns', label: 'Campaigns', icon: Megaphone, permission: 'campaigns' },
  { href: '/partner/redeem', label: 'Redeem', icon: ScanLine, permission: 'redeem', feature: 'redeem' },
  { href: '/partner/sales', label: 'Orders', icon: Receipt, permission: 'sales', feature: 'sales' },
  { href: '/partner/outlets', label: 'Outlets', icon: Store, permission: 'outlets', feature: 'outlets' },
  { href: '/partner/integrations', label: 'Integrations', icon: PlugZap, permission: 'integrations', feature: 'integrations', mobileLabel: 'Connect' },
  { href: '/partner/settings', label: 'Settings', icon: Settings, permission: 'settings' },
];

const ROLE_LABEL: Record<PartnerRole, string> = { owner: 'Owner', manager: 'Manager', cashier: 'Counter staff' };

const MOBILE_COLUMNS = ['', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4', 'grid-cols-5', 'grid-cols-6'];

function isActive(pathname: string, href: string): boolean {
  return href === '/partner' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export default function PartnerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const session = useSignedInPartner();
  const { signOut } = usePartnerSession();
  const [signingOut, setSigningOut] = useState(false);
  const channels = session.partner.channels;
  const items = NAVIGATION.filter(
    (item) => can(session.user.role, item.permission) && (!item.feature || hasFeature(channels, item.feature)),
  ).map((item) => (item.href === '/partner/sales' ? { ...item, label: salesLabel(channels) ?? item.label } : item));
  // Phones: Settings lives in the header so hybrid partners' tab bar stays at six or fewer.
  const tabItems = items.filter((item) => item.href !== '/partner/settings');
  const settingsActive = isActive(pathname, '/partner/settings');
  const current = items.find((item) => isActive(pathname, item.href)) ?? items[0];

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    await signOut();
  }

  return (
    <div className="min-h-screen bg-bg text-ink lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface lg:flex">
        <div className="border-b border-line px-5 py-5">
          <PortalMark />
        </div>
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <BrandAvatar partner={session.partner} size={40} />
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold text-ink">{session.partner.brandName}</p>
            <p className="truncate text-xs text-ink-muted">
              {session.user.name} · {ROLE_LABEL[session.user.role]}
            </p>
          </div>
        </div>
        {can(session.user.role, 'campaigns.write') ? (
          <div className="px-3 pt-4">
            <Link
              href="/partner/campaigns/new"
              className="gradient-brand flex min-h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold text-white transition-transform duration-200 ease-spring hover:-translate-y-px"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New campaign
            </Link>
          </div>
        ) : null}
        <nav aria-label="Partner portal" className="space-y-1 px-3 py-4">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors ${
                  active ? 'bg-ink text-bg' : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
                }`}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-3 border-t border-line p-3">
          {PARTNER_PORTAL_CONFIG.useDummyData ? (
            <p className="flex items-center gap-2 px-2 text-xs text-ink-muted">
              <DemoTag /> Nothing reaches real users.
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            <ThemeToggle className="rounded-md" />
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-line text-sm font-semibold text-ink-muted hover:bg-surface-2 hover:text-ink disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
          <BrandAvatar partner={session.partner} size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-extrabold">{current?.label ?? 'Partners'}</p>
            <p className="truncate text-xs text-ink-muted">{session.partner.brandName}</p>
          </div>
          <ThemeToggle className="rounded-md" />
          <Link
            href="/partner/settings"
            aria-current={settingsActive ? 'page' : undefined}
            className={`inline-flex h-11 w-11 flex-none items-center justify-center rounded-md border border-line hover:bg-surface-2 hover:text-ink ${
              settingsActive ? 'bg-surface-2 text-ink' : 'text-ink-muted'
            }`}
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Settings</span>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-md border border-line text-ink-muted hover:bg-surface-2 hover:text-ink disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Sign out</span>
          </button>
        </header>

        <main className="mx-auto w-full max-w-container px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8">{children}</main>
      </div>

      <nav
        aria-label="Partner portal"
        className={`fixed inset-x-0 bottom-0 z-50 grid border-t border-line bg-surface/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur lg:hidden ${MOBILE_COLUMNS[tabItems.length]}`}
      >
        {tabItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-md font-semibold ${
                tabItems.length > 5 ? 'text-[10px]' : 'text-[11px]'
              } ${active ? 'text-ink' : 'text-ink-muted'}`}
            >
              <item.icon className={`h-5 w-5 ${active ? 'text-profile' : ''}`} aria-hidden="true" />
              <span className="max-w-full truncate px-0.5">{item.mobileLabel ?? item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
