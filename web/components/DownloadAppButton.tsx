'use client';

import { StoreBadges } from '@ui/StoreBadges';

/**
 * Secondary "get the app" affordance for the guest surfaces.
 *
 * It delegates to the shared StoreBadges so it inherits `site.storesLive`:
 * while the apps are still in early access this renders an honest status
 * instead of a dead store link. The web flow — not this button — is how a new
 * guest replies to an invite.
 */
export default function DownloadAppButton({ className = '' }: { className?: string }) {
  return <StoreBadges className={className} />;
}
