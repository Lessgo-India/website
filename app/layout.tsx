import type { Metadata } from 'next';
import '../src/index.css';
import { AuthProvider } from '@web/lib/auth';
import { SITE_URL } from '@web/lib/config';

export const metadata: Metadata = {
  metadataBase: SITE_URL ? new URL(SITE_URL) : undefined,
  title: {
    default: 'Lessgo — Delightful Events Start Here',
    template: '%s · Lessgo',
  },
  description:
    'Turn any plan into a shared event. RSVP, see details, and download shared photos & documents — right from your browser.',
  icons: {
    icon: 'https://lessgo-asset.s3.ap-south-1.amazonaws.com/images/logo.ico',
  },
  openGraph: {
    title: 'Lessgo',
    description: 'Hangouts made easy. RSVP and see event details in your browser.',
    type: 'website',
    siteName: 'Lessgo',
  },
};

// Apply the persisted/system theme before first paint to avoid a flash
// (mirrors the previous Vite entry point).
const themeScript = `(function(){try{var s=localStorage.getItem('theme');var t=(s==='dark'||s==='light')?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
