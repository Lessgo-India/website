'use client';

import { useState } from 'react';
import { useAuth } from '@web/lib/auth';
import type { ConfirmationResult } from '@web/lib/firebase';

const RECAPTCHA_ID = 'lessgo-recaptcha';

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

export default function OtpAuth({
  onAuthenticated,
  heading = 'Sign in with your phone',
}: {
  onAuthenticated?: () => void;
  heading?: string;
}) {
  const { sendOtp, configured } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);

  if (!configured) {
    return (
      <p className="text-secondary text-sm">
        Sign-in isn’t configured yet. Set the <code>NEXT_PUBLIC_FIREBASE_*</code> environment
        variables to enable phone OTP.
      </p>
    );
  }

  async function handleSend() {
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
    } catch (e) {
      setError((e as Error)?.message || 'Could not send the code. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    setError(null);
    if (!confirmation) return;
    if (code.trim().length < 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    setBusy(true);
    try {
      await confirmation.confirm(code.trim());
      onAuthenticated?.();
    } catch {
      setError('That code didn’t work. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-primary">{heading}</h2>

      {step === 'phone' ? (
        <>
          <label className="block text-sm text-secondary" htmlFor="lessgo-phone">
            Phone number
          </label>
          <input
            id="lessgo-phone"
            inputMode="tel"
            autoComplete="tel"
            className="luma-input"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleSend()}
          />
          <button
            className="luma-button luma-button-primary w-full"
            disabled={busy}
            onClick={() => void handleSend()}
          >
            {busy ? 'Sending…' : 'Send code'}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-secondary">
            Enter the 6-digit code sent to{' '}
            <span className="text-primary font-medium">{phone}</span>.
          </p>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className="luma-input text-center text-lg tracking-[0.4em]"
            placeholder="••••••"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && void handleVerify()}
          />
          <button
            className="luma-button luma-button-primary w-full"
            disabled={busy}
            onClick={() => void handleVerify()}
          >
            {busy ? 'Verifying…' : 'Verify & continue'}
          </button>
          <button
            className="text-sm text-secondary hover:text-primary"
            disabled={busy}
            onClick={() => {
              setStep('phone');
              setCode('');
              setConfirmation(null);
            }}
          >
            Use a different number
          </button>
        </>
      )}

      {error ? (
        <p className="text-sm" style={{ color: 'var(--error)' }}>
          {error}
        </p>
      ) : null}

      {/* Invisible reCAPTCHA renders here (required by Firebase phone auth). */}
      <div id={RECAPTCHA_ID} />
    </div>
  );
}
