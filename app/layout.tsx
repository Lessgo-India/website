import type { Metadata, Viewport } from 'next';
import { Inter, Outfit, Space_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@web/lib/auth';
import { SITE_URL } from '@web/lib/config';
import { ConsentBanner } from '@ui/ConsentBanner';

const display = Outfit({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: SITE_URL ? new URL(SITE_URL) : new URL('https://www.lessgo.in'),
  title: {
    default: 'Lessgo — Hangouts made easy',
    template: '%s · Lessgo',
  },
  description:
    'Lessgo turns group-chat chaos into one app — plan the hangout, get everyone to RSVP, split the bill and settle up. Free to start, built in India.',
  applicationName: 'Lessgo',
  keywords: [
    'hangout planner app',
    'group event app India',
    'split expenses with friends',
    'RSVP app',
    'trip planning app',
    'Lessgo app',
  ],
  icons: {
    icon: 'https://lessgo-asset.s3.ap-south-1.amazonaws.com/images/logo.ico',
    apple: 'https://lessgo-asset.s3.ap-south-1.amazonaws.com/images/logo.png',
  },
  openGraph: {
    title: 'Lessgo — Hangouts made easy',
    description:
      'Party is on you. Managing is on us. Plan, RSVP, split and settle — all in one app.',
    type: 'website',
    siteName: 'Lessgo',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lessgo — Hangouts made easy',
    description:
      'Party is on you. Managing is on us. Plan, RSVP, split and settle — all in one app.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F1EEFF' },
    { media: '(prefers-color-scheme: dark)', color: '#0E0B24' },
  ],
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light dark',
};

// Apply the persisted/system theme before first paint to avoid a flash.
const themeScript = `(function(){try{var s=localStorage.getItem('theme');var t=(s==='dark'||s==='light')?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en-IN"
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* Scroll-reveal entrances start hidden and are shown by JS. Without
            JS they must never hide content. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
      </head>
      <body>
        <a
          href="#content"
          className="sr-only rounded-full px-5 py-3 font-semibold focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-surface focus:text-ink focus:shadow-pop"
        >
          Skip to content
        </a>
        <AuthProvider>{children}</AuthProvider>
        <ConsentBanner />
      </body>
    </html>
  );
}
