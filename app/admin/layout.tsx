import type { Metadata, Viewport } from 'next';
import AdminGate from '@ui/admin/AdminGate';
import AdminPwaProvider from '@ui/admin/AdminPwaProvider';
import AdminShell from '@ui/admin/AdminShell';

/**
 * Internal operations dashboard.
 *
 * Not linked from the site, excluded from the sitemap, and marked noindex here
 * as well as in robots.ts and a response header — a private surface has nothing
 * to gain from search and plenty to lose.
 */
export const metadata: Metadata = {
  title: {
    default: 'Lessgo Admin',
    template: '%s · Lessgo Admin',
  },
  robots: { index: false, follow: false, nocache: true },
  applicationName: 'Lessgo Admin',
  manifest: '/admin/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Lessgo Admin',
  },
  formatDetection: { telephone: false, email: false, address: false },
  // Overrides the root icons so an admin tab is tellable from a marketing one.
  icons: {
    icon: { url: '/admin-favicon.png', type: 'image/png' },
    apple: { url: '/admin/apple-touch-icon.png', type: 'image/png' },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0e0e12' },
  ],
};

// Never let admin markup end up in a static build artifact.
export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="content" className="min-h-screen bg-bg">
      <AdminGate>
        <AdminPwaProvider>
          <AdminShell>{children}</AdminShell>
        </AdminPwaProvider>
      </AdminGate>
    </div>
  );
}
