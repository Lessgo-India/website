import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PartnerSessionProvider } from '@ui/partner/PartnerSessionProvider';
import { PARTNER_PORTAL_CONFIG } from '@web/lib/partner/config';

/**
 * Partner (merchant) portal: brands sign in with the user ID Lessgo issued,
 * run offer campaigns for the Vibes tray and redeem vouchers at the counter.
 *
 * Runs on dummy data for now (web/lib/partner/config.ts lists the backend
 * TODOs). Not linked from the site and noindex here and in robots.ts.
 */
export const metadata: Metadata = {
  title: {
    default: 'Lessgo Partners',
    template: '%s · Lessgo Partners',
  },
  robots: { index: false, follow: false, nocache: true },
  applicationName: 'Lessgo Partners',
  formatDetection: { telephone: false, email: false, address: false },
};

// Signed-in surface: never prerender partner markup into a static artifact.
export const dynamic = 'force-dynamic';

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  if (!PARTNER_PORTAL_CONFIG.enabled) notFound();
  return (
    <div id="content" className="min-h-screen bg-bg">
      <PartnerSessionProvider>{children}</PartnerSessionProvider>
    </div>
  );
}
