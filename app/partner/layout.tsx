import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PartnerSessionProvider } from '@ui/partner/PartnerSessionProvider';
import { PARTNER_PORTAL_CONFIG } from '@web/lib/partner/config';

/**
 * Partner (merchant) portal: brands sign in with the user ID Lessgo issued,
 * run offer campaigns for the Vibes tray and redeem vouchers at the counter.
 *
 * Public launch and application pages share this layout with the signed-in
 * portal. Private routes set their own noindex metadata.
 */
export const metadata: Metadata = {
  title: {
    default: 'Lessgo Partners',
    template: '%s · Lessgo Partners',
  },
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
