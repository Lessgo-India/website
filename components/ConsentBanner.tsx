'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { loadAnalytics, readConsent, writeConsent, type Consent } from './analytics';
import { Button } from './Button';

/**
 * Cookie/analytics consent. Non-essential analytics are opt-in, decline is
 * exactly as easy as accept, and nothing loads before a choice is made
 * (DPDP Act 2023 / GDPR-style expectations).
 */
export function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  // The internal admin tool is not a public marketing surface: it loads no
  // marketing analytics, so there is nothing here to consent to.
  const pathname = usePathname();
  const isInternal = pathname === '/admin' || (pathname?.startsWith('/admin/') ?? false);

  useEffect(() => {
    const existing = readConsent();
    if (existing === 'granted') {
      loadAnalytics();
      return;
    }
    if (existing === null) setVisible(true);
  }, []);

  function choose(value: Consent) {
    writeConsent(value);
    setVisible(false);
    if (value === 'granted') loadAnalytics();
  }

  if (!visible || isInternal) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      aria-live="polite"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-2xl rounded-[24px] border border-line bg-bg-elev p-5 shadow-pop sm:inset-x-6 sm:bottom-6 sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <p className="flex-1 text-sm leading-relaxed text-ink-muted">
          We&apos;d like to use privacy-friendly analytics to see which parts of this site are
          useful. Nothing loads until you say yes.{' '}
          <Link href="/privacy" className="font-semibold text-ink underline underline-offset-4">
            Read our privacy policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" onClick={() => choose('denied')}>
            Decline
          </Button>
          <Button onClick={() => choose('granted')}>Allow</Button>
        </div>
      </div>
    </div>
  );
}
