'use client';

import { useCallback, useEffect, useState, type ReactNode, type Ref } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Check, Copy, Loader2 } from 'lucide-react';
import { track } from '@ui/analytics';
import { useAuth } from '@web/lib/auth';
import { resetRecaptcha, type ConfirmationResult } from '@web/lib/firebase';
import { detectPlatform, isInAppBrowser, type Platform } from '@web/lib/platform';
import { OtpArt, PhoneArt } from '@web/components/AuthArt';
import { getCountries, getCountryCallingCode, type CountryCode } from 'libphonenumber-js';
import { BACKEND_API } from '@web/lib/config';
import { formatPhone, parsePhoneInput } from '@web/lib/phoneIdentity';

const RECAPTCHA_ID = 'lessgo-recaptcha';
const RESEND_SECONDS = 30;
type PhoneCountry = { code: CountryCode; name: string; callingCode: string };
const INITIAL_COUNTRIES: PhoneCountry[] = [{ code: 'IN', name: 'India', callingCode: '+91' }];

// Firebase's raw messages ("FirebaseError: auth/…") are not for guests.
function readableAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  if (code.includes('invalid-phone-number')) return 'That phone number doesn’t look right.';
  if (code.includes('too-many-requests'))
    return 'Too many attempts. Please wait a few minutes and try again.';
  if (code.includes('quota-exceeded')) return 'We can’t send codes right now. Please try later.';
  if (code.includes('captcha')) return 'Verification failed. Please reload the page and retry.';
  if (code.includes('network')) return 'Network error. Check your connection and try again.';
  return 'We couldn’t send the code. Please try again.';
}

const inputClass =
  'w-full min-h-[52px] rounded-lg border border-line-strong bg-bg-elev px-4 text-base text-ink ' +
  'placeholder:text-ink-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-profile';

const primaryClass =
  'gradient-brand inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full ' +
  'px-7 text-base font-semibold text-white shadow-[0_10px_30px_-12px_rgba(142,84,233,0.85)] ' +
  'transition-transform duration-200 ease-spring hover:-translate-y-px active:scale-[0.97] ' +
  'disabled:pointer-events-none disabled:opacity-55';

type OtpAuthProps = {
  heading?: string;
  headingLevel?: 'h1' | 'h2';
  headingRef?: Ref<HTMLHeadingElement>;
  phoneHelperText?: ReactNode;
  trackMilestones?: boolean;
};

export default function OtpAuth({
  heading = 'Sign in with your phone',
  headingLevel = 'h1',
  headingRef,
  phoneHelperText = "We'll text you a 6-digit code. Use the number your invite was sent to.",
  trackMilestones = true,
}: OtpAuthProps) {
  const Heading = headingLevel;
  const { sendOtp, configured } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>('IN');
  const [phoneCountries, setPhoneCountries] = useState<PhoneCountry[]>(INITIAL_COUNTRIES);
  const [sentPhone, setSentPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [inApp, setInApp] = useState(false);
  const [platform, setPlatform] = useState<Platform>('other');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    if (!BACKEND_API) return;
    void fetch(`${BACKEND_API}/config/regions`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        if (data?.schemaVersion !== 1 || !Array.isArray(data.countries) || !data.countries.length || data.countries.length > 250) return;
        const countries = data.countries as PhoneCountry[];
        if (!countries.every((country) => country && getCountries().includes(country.code) && typeof country.name === 'string' && country.name.length <= 80 && country.callingCode === `+${getCountryCallingCode(country.code)}`)) return;
        if (!controller.signal.aborted) setPhoneCountries(countries);
      }).catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    setInApp(isInAppBrowser());
    setPlatform(detectPlatform());
  }, []);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard blocked — the instructions still tell them how to open it */
    }
  }, []);

  const send = useCallback(
    async (isResend = false) => {
      setError(null);
      const normalized = isResend && sentPhone ? sentPhone : parsePhoneInput(phone, phoneCountry);
      if (!normalized) {
        setError('Enter a valid phone number for the selected country.');
        return;
      }
      setBusy(true);
      try {
        const result = await sendOtp(normalized, RECAPTCHA_ID);
        setSentPhone(normalized);
        setConfirmation(result);
        setStep('otp');
        setCooldown(RESEND_SECONDS);
        if (trackMilestones) track(isResend ? 'web_otp_resent' : 'web_otp_requested');
      } catch (e) {
        // A failed reCAPTCHA leaves a stale verifier; clear it so the next
        // attempt renders a fresh one instead of erroring again.
        const code = (e as { code?: string })?.code ?? '';
        if (code.includes('captcha') || code.includes('internal')) resetRecaptcha();
        setError(readableAuthError(e));
      } finally {
        setBusy(false);
      }
    },
    [phone, phoneCountry, sentPhone, sendOtp, trackMilestones],
  );

  const verify = useCallback(async () => {
    setError(null);
    if (!confirmation) return;
    if (code.trim().length < 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    setBusy(true);
    try {
      await confirmation.confirm(code.trim());
      if (trackMilestones) track('web_otp_verified');
      // The auth listener takes over from here and advances the flow.
    } catch {
      setError('That code didn’t work. Check it and try again.');
      setBusy(false);
    }
  }, [code, confirmation, trackMilestones]);

  if (!configured) {
    return (
      <p className="text-sm text-ink-muted">
        Phone sign-in isn&apos;t configured on this site yet. Please ask the host to resend the
        invite.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {step === 'phone' ? <PhoneArt /> : <OtpArt />}
      <Heading ref={headingRef} tabIndex={-1} className="font-display text-2xl font-bold text-ink outline-none">
        {heading}
      </Heading>

      {inApp ? (
        <div className="rounded-lg border border-line-strong bg-bg-elev p-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-profile" aria-hidden="true" />
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-ink">Open this page in your browser</p>
              <p className="text-ink-muted">
                You&apos;re in an in-app browser, which blocks the security check needed to text your
                code.{' '}
                {platform === 'ios'
                  ? 'Tap the ••• (or Aa) menu, then “Open in Safari”.'
                  : platform === 'android'
                    ? 'Tap the ⋮ menu, then “Open in Chrome”.'
                    : 'Open this link in Chrome or Safari.'}
              </p>
              <button
                type="button"
                onClick={() => void copyLink()}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-sm font-semibold text-ink transition-transform duration-200 ease-spring active:scale-[0.97]"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-profile" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
                {copied ? 'Link copied' : 'Copy link'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {step === 'phone' ? (
        <>
          <p className="text-sm text-ink-muted">{phoneHelperText}</p>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-ink-muted" htmlFor="lessgo-phone">
              Phone number
            </label>
            <div className="flex min-h-[52px] overflow-hidden rounded-lg border border-line-strong bg-bg-elev text-base text-ink focus-within:border-transparent focus-within:ring-2 focus-within:ring-profile">
              <select
                id="lessgo-phone-prefix"
                aria-label="Phone country"
                value={phoneCountry}
                onChange={(event) => setPhoneCountry(event.target.value as CountryCode)}
                className="max-w-[40%] shrink-0 border-r border-line bg-transparent px-2 text-sm font-semibold text-ink-muted"
              >
                {phoneCountries.map((country) => <option key={country.code} value={country.code}>{country.name} {country.callingCode}</option>)}
              </select>
              <input
                id="lessgo-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                aria-describedby="lessgo-phone-prefix"
                maxLength={64}
                className="min-w-0 flex-1 bg-transparent px-4 text-base text-ink placeholder:text-ink-faint focus:outline-none"
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^+\d\s().-]/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && void send()}
              />
            </div>
          </div>
          <button className={primaryClass} disabled={busy} onClick={() => void send()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {busy ? 'Sending…' : 'Send code'}
          </button>
          <p className="text-xs leading-relaxed text-ink-faint">
            By continuing you agree to our{' '}
            <Link href="/terms" className="underline hover:text-ink-muted">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline hover:text-ink-muted">
              Privacy Policy
            </Link>
            . Standard SMS rates may apply.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm text-ink-muted">
            Enter the 6-digit code sent to{' '}
            <span className="font-semibold text-ink">
              {formatPhone(sentPhone)}
            </span>
            .
          </p>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label="6-digit verification code"
            maxLength={6}
            className={`${inputClass} text-center text-xl tracking-[0.5em]`}
            placeholder="••••••"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && void verify()}
          />
          <button className={primaryClass} disabled={busy} onClick={() => void verify()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {busy ? 'Verifying…' : 'Verify & continue'}
          </button>
          <div className="flex items-center justify-between gap-3 text-sm">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-ink-muted hover:text-ink"
              disabled={busy}
              onClick={() => {
                setStep('phone');
                setCode('');
                setConfirmation(null);
                setError(null);
              }}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Change number
            </button>
            <button
              type="button"
              className="text-ink-muted hover:text-ink disabled:opacity-55"
              disabled={busy || cooldown > 0}
              onClick={() => void send(true)}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        </>
      )}

      {error ? (
        <p role="alert" className="text-sm text-vibes">
          {error}
        </p>
      ) : null}

      {/* Invisible reCAPTCHA renders here (required by Firebase phone auth). */}
      <div id={RECAPTCHA_ID} />
    </div>
  );
}
