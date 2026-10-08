'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      theme: 'auto';
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const TEST_SITE_KEY = '1x00000000000000000000AA';

export default function TurnstileWidget({
  onToken,
  resetKey,
}: {
  onToken: (token: string) => void;
  resetKey: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);
  const callbackRef = useRef(onToken);
  const [scriptReady, setScriptReady] = useState(false);
  const configured = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  const siteKey = configured || (process.env.NODE_ENV !== 'production' ? TEST_SITE_KEY : '');

  useEffect(() => {
    callbackRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!scriptReady || !siteKey || !containerRef.current || !window.turnstile || widgetRef.current) return;
    const widgetId = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action: 'partner_application',
      theme: 'auto',
      callback: (token) => callbackRef.current(token),
      'expired-callback': () => callbackRef.current(''),
      'error-callback': () => callbackRef.current(''),
    });
    widgetRef.current = widgetId;
    return () => {
      if (widgetRef.current && window.turnstile) window.turnstile.remove(widgetRef.current);
      widgetRef.current = null;
    };
  }, [scriptReady, siteKey]);

  useEffect(() => {
    if (widgetRef.current && window.turnstile) {
      window.turnstile.reset(widgetRef.current);
      callbackRef.current('');
    }
  }, [resetKey]);

  if (!siteKey) {
    return (
      <p role="alert" className="rounded-md border border-down bg-down-tint px-4 py-3 text-sm text-ink">
        Partner applications are not configured on this site yet.
      </p>
    );
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div ref={containerRef} className="min-h-[65px] overflow-hidden" aria-label="Human verification" />
    </>
  );
}
