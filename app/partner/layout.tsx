import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import PartnerPwaProvider from '@ui/partner/PartnerPwaProvider';
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
  manifest: '/partner/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Lessgo Partners',
  },
  formatDetection: { telephone: false, email: false, address: false },
  icons: {
    icon: { url: '/partner/icon-192.png', type: 'image/png' },
    apple: { url: '/partner/apple-touch-icon.png', type: 'image/png' },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

// Signed-in surface: never prerender partner markup into a static artifact.
export const dynamic = 'force-dynamic';

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  if (!PARTNER_PORTAL_CONFIG.enabled) notFound();
  return (
    <div id="content" className="min-h-screen min-h-dvh bg-bg">
      <PartnerPwaProvider>
        <PartnerSessionProvider>{children}</PartnerSessionProvider>
      </PartnerPwaProvider>
    </div>
  );
}
