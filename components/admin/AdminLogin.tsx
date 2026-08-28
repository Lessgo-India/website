'use client';

import { useState } from 'react';
import { Loader2, LockKeyhole } from 'lucide-react';
import { adminLogin } from '@web/lib/adminApi';
import { deriveCredential, normalisePhone } from '@web/lib/adminCredential';

const inputClass =
  'w-full min-h-[52px] rounded-lg border border-line-strong bg-bg-elev px-4 text-base text-ink ' +
  'placeholder:text-ink-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-profile';

const primaryClass =
  'gradient-brand inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full ' +
  'px-7 text-base font-semibold text-white transition-transform duration-200 ease-spring ' +
  'hover:-translate-y-px active:scale-[0.97] disabled:pointer-events-none disabled:opacity-55';

export default function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (normalisePhone(phone).length !== 10) {
      setError('Enter a 10-digit phone number.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }

    setBusy(true);
    try {
      // The password is hashed here and discarded; only the derived credential
      // is ever sent. ~1s of PBKDF2 is the cost of that guarantee.
      const credential = await deriveCredential(phone, password);
      await adminLogin(phone, credential);
      setPassword('');
      onSuccess();
    } catch (e) {
      setError((e as Error)?.message ?? 'Sign-in failed.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-3 text-left">
      <div>
        <label htmlFor="admin-phone" className="mb-1.5 block text-sm font-semibold text-ink">
          Phone number
        </label>
        <input
          id="admin-phone"
          name="username"
          type="tel"
          inputMode="numeric"
          autoComplete="username"
          placeholder="98765 43210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={busy}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="admin-password" className="mb-1.5 block text-sm font-semibold text-ink">
          Password
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
          className={inputClass}
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-down">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={busy} className={primaryClass}>
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Verifying…
          </>
        ) : (
          <>
            <LockKeyhole className="h-4 w-4" aria-hidden="true" />
            Sign in
          </>
        )}
      </button>

      <p className="pt-1 text-xs text-ink-muted">
        Your password is hashed in this browser and never sent. Sessions last 8 hours.
      </p>
    </form>
  );
}
