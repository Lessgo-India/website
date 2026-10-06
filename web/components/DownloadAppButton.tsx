'use client';

import { StoreBadges } from '@ui/StoreBadges';

/**
 * Secondary "get the app" affordance for the guest surfaces.
 *
 * It delegates to the shared StoreBadges so available listings are linked and
 * unreleased platforms remain honest "Coming soon" statuses. The web flow —
 * not this button — is how a new guest replies to an invite.
 */
export default function DownloadAppButton({ className = '' }: { className?: string }) {
  return <StoreBadges className={className} />;
}
