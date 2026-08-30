'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, RefreshCw } from 'lucide-react';
import { track } from '@ui/analytics';
import { useAuth } from '@web/lib/auth';
import { createProfile, getProfileOrNull } from '@web/lib/api';
import OtpAuth from '@web/components/OtpAuth';
import AppHeader from '@web/components/AppHeader';

type Phase = 'auth' | 'checking' | 'check_failed' | 'profile' | 'saving';

const inputClass =
  'w-full min-h-[52px] rounded-lg border border-line-strong bg-bg-elev px-4 text-base text-ink ' +
  'placeholder:text-ink-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-profile';

const GENDERS = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
  { value: 'T', label: 'Other' },
] as const;

function OnboardingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only ever redirect within this site — never to an attacker-supplied host.
  const rawNext = searchParams?.get('next') || '/me';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/me';

  const { ready, user, userId, getToken, configured } = useAuth();

  const [phase, setPhase] = useState<Phase>('auth');
  const [profileCheckAttempt, setProfileCheckAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | 'T'>('M');

  const goNext = useCallback(() => router.replace(next), [next, router]);

  // Once the phone is verified, decide new vs. returning guest.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!ready || !user || !userId) return;
      setPhase('checking');
      try {
        const profile = await getProfileOrNull(userId, getToken);
        if (!active) return;
        if (profile) {
          goNext();
        } else {
          setPhase('profile');
        }
      } catch (e) {
        if (!active) return;
        setError((e as Error)?.message || 'We could not check your account. Please try again.');
        setPhase('check_failed');
      }
    })();
    return () => {
      active = false;
    };
  }, [ready, user, userId, getToken, goNext, profileCheckAttempt]);

  const handleCreate = useCallback(async () => {
    setError(null);
    if (!userId) return;
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!dob) {
      setError('Please enter your date of birth.');
      return;
    }
    setPhase('saving');
    try {
      await createProfile({ userId, name: name.trim(), dob, gender }, getToken);
      track('web_signup_completed');
      goNext();
    } catch (e) {
      setError((e as Error)?.message || 'Could not create your account.');
      setPhase('profile');
    }
  }, [userId, name, dob, gender, getToken, goNext]);

  const showAuth = phase === 'auth' && (!configured || !user);
  const showProfile = !!user && (phase === 'profile' || phase === 'saving');

  return (
    <div className="min-h-screen bg-[color:var(--bg)]">
      <AppHeader />
      <main id="content" className="container-page max-w-md py-10 sm:py-14">
        <div className="rounded-xl border border-line bg-surface p-6 sm:p-8">
          {showAuth ? <OtpAuth heading="Verify your number" /> : null}

          {user && phase === 'checking' ? (
            <p className="flex items-center gap-2 text-sm text-ink-muted">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Setting things up…
            </p>
          ) : null}

          {user && phase === 'check_failed' ? (
            <div className="space-y-5">
              <div>
                <h1 className="font-display text-2xl font-bold text-ink">
                  We couldn&apos;t check your account
                </h1>
                <p className="mt-2 text-sm text-ink-muted">
                  We won&apos;t ask you to register again until we can confirm this is a new number.
                </p>
              </div>
              <button
                type="button"
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border border-line-strong bg-surface-2 px-6 text-sm font-semibold text-ink transition-transform duration-200 ease-spring hover:-translate-y-px active:scale-[0.97]"
                onClick={() => {
                  setError(null);
                  setProfileCheckAttempt((attempt) => attempt + 1);
                }}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Try again
              </button>
            </div>
          ) : null}

          {showProfile ? (
            <div className="space-y-5">
              <div>
                <h1 className="font-display text-2xl font-bold text-ink">
                  Nice — one last step
                </h1>
                <p className="mt-2 text-sm text-ink-muted">
                  Tell your hosts who&apos;s replying. You can change this later in the app.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-ink-muted" htmlFor="name">
                    Your name
                  </label>
                  <input
                    id="name"
                    className={inputClass}
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-ink-muted" htmlFor="dob">
                    Date of birth
                  </label>
                  <input
                    id="dob"
                    type="date"
                    className={inputClass}
                    autoComplete="bday"
                    max={new Date().toISOString().slice(0, 10)}
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                </div>

                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-ink-muted">Gender</legend>
                  <div className="grid grid-cols-3 gap-2">
                    {GENDERS.map((option) => {
                      const active = gender === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setGender(option.value)}
                          className={`min-h-[48px] rounded-lg border-2 text-sm font-semibold transition-transform duration-200 ease-spring active:scale-[0.97] ${
                            active
                              ? 'border-profile bg-profile-tint text-profile'
                              : 'border-line text-ink-muted hover:border-line-strong'
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              </div>

              <button
                type="button"
                className="gradient-brand inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full px-7 text-base font-semibold text-white shadow-[0_10px_30px_-12px_rgba(142,84,233,0.85)] transition-transform duration-200 ease-spring hover:-translate-y-px active:scale-[0.97] disabled:pointer-events-none disabled:opacity-55"
                disabled={phase === 'saving'}
                onClick={() => void handleCreate()}
              >
                {phase === 'saving' ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                {phase === 'saving' ? 'Creating…' : 'Create account'}
              </button>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="mt-4 text-sm text-vibes">
              {error}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingInner />
    </Suspense>
  );
}
