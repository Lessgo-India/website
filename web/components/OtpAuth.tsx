'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { track } from '@ui/analytics';
import { useAuth } from '@web/lib/auth';
import type { ConfirmationResult } from '@web/lib/firebase';

const RECAPTCHA_ID = 'lessgo-recaptcha';
const RESEND_SECONDS = 30;

// Normalise user input to E.164 (defaults to +91 for bare 10-digit numbers).
function toE164(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.startsWith('+')) {
    const digits = '+' + trimmed.slice(1).replace(/\D/g, '');
    return digits.length >= 11 ? digits : null;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length > 10) return `+${digits}`;
  return null;
}

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

export default function OtpAuth({ heading = 'Sign in with your phone' }: { heading?: string }) {
  const { sendOtp, configured } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = useCallback(
    async (isResend = false) => {
      setError(null);
      const e164 = toE164(phone);
      if (!e164) {
        setError('Enter a valid phone number.');
        return;
      }
      setBusy(true);
      try {
        const result = await sendOtp(e164, RECAPTCHA_ID);
        setConfirmation(result);
        setStep('otp');
        setCooldown(RESEND_SECONDS);
        track(isResend ? 'web_otp_resent' : 'web_otp_requested');
      } catch (e) {
        setError(readableAuthError(e));
      } finally {
        setBusy(false);
      }
    },
    [phone, sendOtp],
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
      track('web_otp_verified');
      // The auth listener takes over from here and advances the flow.
    } catch {
      setError('That code didn’t work. Check it and try again.');
      setBusy(false);
    }
  }, [code, confirmation]);

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
      <h1 className="font-display text-2xl font-bold text-ink">{heading}</h1>

      {step === 'phone' ? (
        <>
          <p className="text-sm text-ink-muted">
            We&apos;ll text you a 6-digit code. Use the number your invite was sent to.
          </p>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-ink-muted" htmlFor="lessgo-phone">
              Phone number
            </label>
            <input
              id="lessgo-phone"
              inputMode="tel"
              autoComplete="tel"
              className={inputClass}
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void send()}
            />
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
            Enter the 6-digit code sent to <span className="font-semibold text-ink">{phone}</span>.
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
