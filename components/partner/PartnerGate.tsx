'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Loader2, LockKeyhole } from 'lucide-react';
import { can, hasFeature, homePathFor, type PartnerFeature, type PartnerPermission } from '@web/lib/partner/rules';
import { usePartnerSession, useSignedInPartner } from './PartnerSessionProvider';
import { secondaryButtonClass } from './ui';

/** Sends signed-out visitors to /partner/login and back here afterwards. */
export default function PartnerGate({ children }: { children: ReactNode }) {
  const { status, explicitSignOut } = usePartnerSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status !== 'signed_out') return;
    const next = explicitSignOut ? '' : `?next=${encodeURIComponent(pathname)}`;
    router.replace(`/partner/login${next}`);
  }, [explicitSignOut, pathname, router, status]);

  if (status !== 'signed_in') {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 bg-bg text-sm text-ink-muted" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        {status === 'loading' ? 'Checking your session…' : 'Redirecting to sign in…'}
      </div>
    );
  }
  return <>{children}</>;
}

/**
 * Role (and, for channel-specific pages, partner type) check for a page; the
 * server enforces the same rules on every call.
 */
export function RequirePermission({
  permission,
  feature,
  children,
}: {
  permission: PartnerPermission;
  /** Page only exists for some redemption channels (e.g. Redeem is in-store only). */
  feature?: PartnerFeature;
  children: ReactNode;
}) {
  const session = useSignedInPartner();
  if (feature && !hasFeature(session.partner.channels, feature)) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
        <LockKeyhole className="h-8 w-8 text-ink-faint" aria-hidden="true" />
        <h1 className="mt-3 font-display text-xl font-bold text-ink">Not part of your partner type</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {feature === 'redeem' || feature === 'outlets'
            ? 'Your groups redeem online, so there’s no counter or outlets to manage here.'
            : 'This page is for partners whose groups redeem online.'}{' '}
          Ask Lessgo if your setup has changed.
        </p>
        <Link href={homePathFor(session.user.role)} className={`${secondaryButtonClass} mt-6`}>
          Go back
        </Link>
      </div>
    );
  }
  if (can(session.user.role, permission)) return <>{children}</>;
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
      <LockKeyhole className="h-8 w-8 text-ink-faint" aria-hidden="true" />
      <h1 className="mt-3 font-display text-xl font-bold text-ink">Not available for your login</h1>
      <p className="mt-1 text-sm text-ink-muted">
        {session.user.role === 'cashier'
          ? 'Counter logins can redeem vouchers only. Ask your account owner for anything else.'
          : 'Only the account owner can open this page.'}
      </p>
      <Link href={homePathFor(session.user.role)} className={`${secondaryButtonClass} mt-6`}>
        Go back
      </Link>
    </div>
  );
}
