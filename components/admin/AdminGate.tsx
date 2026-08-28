'use client';

import { useEffect, useState } from 'react';
import { Loader2, LockKeyhole, ShieldAlert } from 'lucide-react';
import { Logo } from '@ui/Logo';
import { ApiError } from '@web/lib/api';
import { getAdminSession, type AdminSession } from '@web/lib/adminApi';
import { useAuth } from '@web/lib/auth';
import OtpAuth from '@web/components/OtpAuth';

type Phase = 'loading' | 'signin' | 'checking' | 'denied' | 'error' | 'granted';

/**
 * Gates the dashboard on an allowlisted operator.
 *
 * This is a convenience, not a security boundary: it asks the gateway whether
 * the signed-in phone is an admin and renders accordingly. The gateway enforces
 * the same allowlist on every data route, so bypassing this component reveals
 * an empty shell and nothing else.
 */
export default function AdminGate({ children }: { children: React.ReactNode }) {
  const { ready, user, getToken, configured, signOut } = useAuth();
  const [phase, setPhase] = useState<Phase>('loading');
  const [session, setSession] = useState<AdminSession | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!configured || !ready) return;
    if (!user) {
      setPhase('signin');
      return;
    }

    let active = true;
    setPhase('checking');
    getAdminSession(getToken)
      .then((result) => {
        if (!active) return;
        setSession(result);
        setPhase(result.admin ? 'granted' : 'denied');
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 403) {
          setPhase('denied');
          setMessage(error.message);
          return;
        }
        setMessage((error as Error)?.message ?? 'Could not verify admin access.');
        setPhase('error');
      });

    return () => {
      active = false;
    };
  }, [configured, ready, user, getToken]);

  if (!configured) {
    return (
      <Panel
        icon={<ShieldAlert className="h-6 w-6 text-warn" aria-hidden="true" />}
        title="Sign-in isn’t configured"
        body="This deployment has no Firebase credentials, so phone sign-in is unavailable. Set the NEXT_PUBLIC_FIREBASE_* variables and rebuild."
      />
    );
  }

  if (phase === 'loading' || phase === 'checking') {
    return (
      <Panel
        icon={<Loader2 className="h-6 w-6 animate-spin text-ink-muted" aria-hidden="true" />}
        title="Checking access"
        body="One moment."
      />
    );
  }

  if (phase === 'signin') {
    return (
      <Panel
        icon={<LockKeyhole className="h-6 w-6 text-profile" aria-hidden="true" />}
        title="Lessgo admin"
        body="Operators only. Sign in with an allowlisted phone number."
      >
        <div className="mt-6 text-left">
          <OtpAuth heading="Verify your number" />
        </div>
      </Panel>
    );
  }

  if (phase === 'denied') {
    return (
      <Panel
        icon={<ShieldAlert className="h-6 w-6 text-down" aria-hidden="true" />}
        title="Not an admin"
        body={message ?? 'This number isn’t on the operator allowlist.'}
      >
        <button type="button" onClick={signOut} className={secondaryClass}>
          Use a different number
        </button>
      </Panel>
    );
  }

  if (phase === 'error') {
    return (
      <Panel
        icon={<ShieldAlert className="h-6 w-6 text-warn" aria-hidden="true" />}
        title="Couldn’t verify access"
        body={message ?? 'The gateway did not respond.'}
      >
        <button type="button" onClick={() => window.location.reload()} className={secondaryClass}>
          Try again
        </button>
      </Panel>
    );
  }

  if (session && !session.statsAvailable) {
    return (
      <>
        <p
          role="alert"
          className="mb-6 rounded-lg border border-warn bg-warn-tint px-4 py-3 text-sm text-ink"
        >
          The gateway has no database connection, so counts and trends are unavailable. Health
          checks still work.
        </p>
        {children}
      </>
    );
  }

  return <>{children}</>;
}

const secondaryClass =
  'mt-6 inline-flex min-h-[44px] items-center justify-center rounded-full border ' +
  'border-line-strong px-6 text-sm font-semibold text-ink transition-colors hover:bg-surface-2';

function Panel({
  icon,
  title,
  body,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center px-5 text-center">
      <Logo />
      <div className="mt-8 w-full rounded-xl border border-line bg-surface p-8">
        <div className="flex justify-center">{icon}</div>
        <h1 className="mt-4 font-display text-2xl font-bold text-ink">{title}</h1>
        <p className="mt-2 text-sm text-ink-muted">{body}</p>
        {children}
      </div>
    </div>
  );
}
