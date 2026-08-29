import type { Metadata } from 'next';
import AdminGate from '@ui/admin/AdminGate';

/**
 * Internal operations dashboard.
 *
 * Not linked from the site, excluded from the sitemap, and marked noindex here
 * as well as in robots.ts and a response header — a private surface has nothing
 * to gain from search and plenty to lose.
 */
export const metadata: Metadata = {
  title: 'Admin · Lessgo',
  robots: { index: false, follow: false, nocache: true },
  // Overrides the root icons so an admin tab is tellable from a marketing one.
  icons: { icon: { url: '/admin-favicon.png', type: 'image/png' } },
};

// Never let admin markup end up in a static build artifact.
export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="content" className="min-h-screen bg-bg">
      <AdminGate>{children}</AdminGate>
    </main>
  );
}
