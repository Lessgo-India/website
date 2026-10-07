'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  ScanLine,
  Sparkles,
  Target,
} from 'lucide-react';
import { ThemeToggle } from '@ui/ThemeToggle';
import { PARTNER_PORTAL_CONFIG, PARTNER_SUPPORT_EMAIL } from '@web/lib/partner/config';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, DUMMY_USERS } from '@web/lib/partner/dummyData';
import { partnerCompleteFirstLogin, partnerSignIn } from '@web/lib/partner/partnerApi';
import { newPasswordProblem, safeNextPath } from '@web/lib/partner/rules';
import type { PartnerUser } from '@web/lib/partner/types';
import { usePartnerSession } from './PartnerSessionProvider';
import { DemoTag, hintClass, inputClass, labelClass, PortalMark, primaryButtonClass } from './ui';

const FEATURES = [
  { icon: Sparkles, title: 'Your offer in the Vibes tray', body: 'A story circle next to “+ New”, shown only to the people you target.' },
  { icon: Target, title: 'Target by place and people', body: 'Include or exclude states and districts, pick age brackets and gender.' },
  { icon: ScanLine, title: 'Redeem at the counter', body: 'Scan the guest’s QR or type the code — the group’s split updates itself.' },
];

const ROLE_LABEL: Record<PartnerUser['role'], string> = { owner: 'Owner', manager: 'Manager', cashier: 'Cashier' };

export default function PartnerLogin({ next }: { next: string | null }) {
  const router = useRouter();
  const { status, session, signedIn } = usePartnerSession();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstLogin, setFirstLogin] = useState<{ challenge: string; user: PartnerUser } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (status === 'signed_in' && session) router.replace(safeNextPath(next, session.user.role));
  }, [next, router, session, status]);

  async function submitCredentials(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!userId.trim() || !password) {
      setError('Enter your user ID and password.');
      return;
    }
    setBusy(true);
    try {
      const result = await partnerSignIn(userId, password);
      setPassword('');
      if (result.kind === 'signed_in') {
        signedIn(result.session);
        return;
      }
      setFirstLogin({ challenge: result.challenge, user: result.user });
      setBusy(false);
    } catch (caught) {
      setError((caught as Error).message);
      setBusy(false);
    }
  }

  async function submitNewPassword(event: FormEvent) {
    event.preventDefault();
    if (!firstLogin) return;
    setError(null);
    const problem = newPasswordProblem(newPassword, { userId: firstLogin.user.userId });
    if (problem) {
      setError(problem);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The two passwords don’t match.');
      return;
    }
    setBusy(true);
    try {
      signedIn(await partnerCompleteFirstLogin(firstLogin.challenge, newPassword));
    } catch (caught) {
      setError((caught as Error).message);
      setBusy(false);
      if ((caught as { code?: string }).code === 'challenge_expired') setFirstLogin(null);
    }
  }

  function fillDemoAccount(account: (typeof DEMO_ACCOUNTS)[number]) {
    setFirstLogin(null);
    setError(null);
    setUserId(account.userId);
    setPassword(account.password);
  }

  return (
    <div className="grid min-h-screen bg-bg text-ink lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden overflow-hidden bg-brand-night px-12 py-12 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:self-start">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-10 h-80 w-80 animate-aurora-a rounded-full bg-brand-purple/50 blur-3xl" />
          <div className="absolute -right-10 top-1/3 h-96 w-96 animate-aurora-b rounded-full bg-brand-magenta/35 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 h-72 w-72 animate-aurora-a rounded-full bg-brand-teal/30 blur-3xl" />
        </div>
        <div className="relative">
          <p className="font-display text-xl font-extrabold tracking-tight">
            Less<span className="text-gradient">go</span>{' '}
            <span className="ml-1 text-sm font-semibold uppercase tracking-[0.18em] text-white/70">Partners</span>
          </p>
        </div>
        <div className="relative my-auto max-w-md">
          <h2 className="font-display text-4xl font-extrabold leading-tight tracking-tight">
            Bring groups <span className="text-gradient">to your door.</span>
          </h2>
          <p className="mt-4 text-base text-white/75">
            Friends turn your offer into a plan on Lessgo, then redeem the coupon together at your outlet.
          </p>
          <ul className="mt-10 space-y-6">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="mt-0.5 inline-flex h-10 w-10 flex-none items-center justify-center rounded-md bg-white/10">
                  <Icon className="h-5 w-5 text-brand-teal" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-semibold">{title}</span>
                  <span className="mt-0.5 block text-sm text-white/70">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/60">
          Partner access is invite-only. Want your brand on Lessgo?{' '}
          <a href={`mailto:${PARTNER_SUPPORT_EMAIL}`} className="font-semibold text-white underline-offset-4 hover:underline">
            {PARTNER_SUPPORT_EMAIL}
          </a>
        </p>
      </aside>

      <main className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <span className="lg:invisible">
            <PortalMark />
          </span>
          <ThemeToggle className="rounded-md" />
        </div>

        <div className="mx-auto my-auto w-full max-w-md py-10">
          {firstLogin ? (
            <form onSubmit={submitNewPassword} className="rounded-xl border border-line bg-surface p-7 shadow-lift">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-profile-tint">
                <KeyRound className="h-5 w-5 text-profile" aria-hidden="true" />
              </span>
              <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight">Set your own password</h1>
              <p className="mt-1 text-sm text-ink-muted">
                Welcome, {firstLogin.user.name.split(' ')[0]}. The password Lessgo sent you was temporary — choose a
                new one to finish signing in as <span className="font-mono text-ink">{firstLogin.user.userId}</span>.
              </p>
              <div className="mt-6 space-y-4">
                <div>
                  <label htmlFor="partner-new-password" className={labelClass}>
                    New password
                  </label>
                  <input
                    id="partner-new-password"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    disabled={busy}
                    className={inputClass}
                  />
                  <p className={hintClass}>At least 10 characters, letters and numbers, not your user ID.</p>
                </div>
                <div>
                  <label htmlFor="partner-confirm-password" className={labelClass}>
                    Confirm new password
                  </label>
                  <input
                    id="partner-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    disabled={busy}
                    className={inputClass}
                  />
                </div>
              </div>
              {error ? (
                <p role="alert" className="mt-4 text-sm font-medium text-down">
                  {error}
                </p>
              ) : null}
              <button type="submit" disabled={busy} className={`${primaryButtonClass} mt-6 w-full`}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                Save and continue
              </button>
            </form>
          ) : (
            <form onSubmit={submitCredentials} className="rounded-xl border border-line bg-surface p-7 shadow-lift">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-profile-tint">
                <LockKeyhole className="h-5 w-5 text-profile" aria-hidden="true" />
              </span>
              <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight">Partner sign in</h1>
              <p className="mt-1 text-sm text-ink-muted">Use the user ID and password the Lessgo team sent you.</p>
              <div className="mt-6 space-y-4">
                <div>
                  <label htmlFor="partner-user-id" className={labelClass}>
                    User ID
                  </label>
                  <input
                    id="partner-user-id"
                    name="username"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="e.g. brewbros.owner"
                    value={userId}
                    onChange={(event) => setUserId(event.target.value)}
                    disabled={busy}
                    className={`${inputClass} font-mono`}
                  />
                </div>
                <div>
                  <label htmlFor="partner-password" className={labelClass}>
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="partner-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={busy}
                      className={`${inputClass} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-ink-muted hover:text-ink"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>
              </div>
              {error ? (
                <p role="alert" className="mt-4 text-sm font-medium text-down">
                  {error}
                </p>
              ) : null}
              <button type="submit" disabled={busy || status === 'loading'} className={`${primaryButtonClass} mt-6 w-full`}>
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </button>
              <p className="mt-4 text-xs text-ink-muted">
                {/* TODO(backend): self-serve reset via POST /api/partner/password/reset-request. */}
                Forgot your password? Email{' '}
                <a href={`mailto:${PARTNER_SUPPORT_EMAIL}`} className="font-semibold text-ink underline-offset-4 hover:underline">
                  {PARTNER_SUPPORT_EMAIL}
                </a>{' '}
                from your registered address. Sessions last 8 hours.
              </p>
            </form>
          )}

          {PARTNER_PORTAL_CONFIG.useDummyData ? (
            <section aria-labelledby="demo-accounts" className="mt-6 rounded-xl border border-gold-line bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="demo-accounts" className="font-display text-sm font-bold text-ink">
                  Demo logins
                </h2>
                <DemoTag />
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                Password <span className="font-mono font-semibold text-ink">{DEMO_PASSWORD}</span> unless shown.
                These dummy accounts stand in for the credentials Lessgo issues from Admin → Partners.
              </p>
              <ul className="mt-3 divide-y divide-line">
                {DEMO_ACCOUNTS.map((account) => {
                  const member = DUMMY_USERS.find((candidate) => candidate.userId === account.userId);
                  return (
                    <li key={account.userId} className="flex items-center gap-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-[13px] font-semibold text-ink">
                          {account.userId}
                          {account.password !== DEMO_PASSWORD ? (
                            <span className="ml-2 font-normal text-ink-muted">/ {account.password}</span>
                          ) : null}
                        </p>
                        <p className="truncate text-xs text-ink-muted">
                          {member ? `${ROLE_LABEL[member.role]} · ` : ''}
                          {account.note.replace(/^(Owner|Manager|Cashier) · /, '')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => fillDemoAccount(account)}
                        className="inline-flex min-h-8 flex-none items-center rounded-full border border-line-strong px-3 text-xs font-semibold text-ink hover:bg-surface-2"
                      >
                        Use
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
