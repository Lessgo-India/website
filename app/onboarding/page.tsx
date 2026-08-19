'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@web/lib/auth';
import { createProfile, getProfileOrNull } from '@web/lib/api';
import OtpAuth from '@web/components/OtpAuth';
import AppHeader from '@web/components/AppHeader';

type Phase = 'auth' | 'checking' | 'profile' | 'saving';

function OnboardingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams?.get('next') || '/me';
  const next = nextParam.startsWith('/') ? nextParam : '/me';

  const { ready, user, userId, getToken, configured } = useAuth();

  const [phase, setPhase] = useState<Phase>('auth');
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | 'T'>('M');

  const goNext = useCallback(() => router.replace(next), [next, router]);

  // Once authenticated, decide new vs existing user.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!ready || !user || !userId) return;
      if (phase !== 'auth' && phase !== 'checking') return;
      setPhase('checking');
      const token = await getToken();
      if (!token) {
        setPhase('auth');
        return;
      }
      try {
        const profile = await getProfileOrNull(userId, token);
        if (!active) return;
        if (profile) goNext();
        else setPhase('profile');
      } catch (e) {
        if (!active) return;
        setError((e as Error)?.message || 'Something went wrong. Please try again.');
        setPhase('profile');
      }
    })();
    return () => {
      active = false;
    };
  }, [ready, user, userId, phase, getToken, goNext]);

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
    const token = await getToken();
    if (!token) {
      setError('Your session expired. Please sign in again.');
      return;
    }
    setPhase('saving');
    try {
      await createProfile({ userId, name: name.trim(), dob, gender }, token);
      goNext();
    } catch (e) {
      setError((e as Error)?.message || 'Could not create your profile.');
      setPhase('profile');
    }
  }, [userId, name, dob, gender, getToken, goNext]);

  const showAuth = phase === 'auth' && (!configured || !user);
  const showProfile = !!user && (phase === 'profile' || phase === 'saving');

  return (
    <div className="min-h-screen bg-primary">
      <AppHeader />
      <main className="container mx-auto max-w-md px-4 sm:px-6 py-8">
        <div className="luma-card space-y-5">
          {showAuth ? (
            <>
              <OtpAuth heading="Sign in or sign up" />
              <p className="text-xs text-muted">
                New to Lessgo? Verifying your number creates your account.
              </p>
            </>
          ) : null}

          {user && phase === 'checking' ? (
            <p className="text-secondary text-sm">Setting things up…</p>
          ) : null}

          {showProfile ? (
            <>
              <h2 className="text-xl font-semibold text-primary">Create your profile</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-secondary mb-1" htmlFor="name">
                    Name
                  </label>
                  <input
                    id="name"
                    className="luma-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-secondary mb-1" htmlFor="dob">
                    Date of birth
                  </label>
                  <input
                    id="dob"
                    type="date"
                    className="luma-input"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-secondary mb-1">Gender</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['M', 'F', 'T'] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className="rounded-lg border py-2 text-sm"
                        style={{
                          borderColor:
                            gender === g ? 'var(--primary-accent)' : 'var(--border-light)',
                          background: gender === g ? 'var(--active-bg)' : 'transparent',
                          color: gender === g ? 'var(--primary-accent)' : 'var(--text-secondary)',
                        }}
                      >
                        {g === 'M' ? 'Male' : g === 'F' ? 'Female' : 'Other'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button
                className="luma-button luma-button-primary w-full"
                disabled={phase === 'saving'}
                onClick={() => void handleCreate()}
              >
                {phase === 'saving' ? 'Creating…' : 'Create profile'}
              </button>
            </>
          ) : null}

          {error ? (
            <p className="text-sm" style={{ color: 'var(--error)' }}>
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
