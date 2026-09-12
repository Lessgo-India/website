'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import Image from 'next/image';
import { Loader2, LockKeyhole, ShieldAlert } from 'lucide-react';
import AdminLogin from '@ui/admin/AdminLogin';
import { getAdminSession, type AdminSession } from '@web/lib/adminApi';

type Phase = 'loading' | 'signin' | 'unconfigured' | 'error' | 'granted';

interface AdminSessionContextValue {
  session: AdminSession;
  recheck: () => Promise<void>;
}

const AdminSessionContext = createContext<AdminSessionContextValue | null>(null);

export function useAdminSession(): AdminSessionContextValue {
  const value = useContext(AdminSessionContext);
  if (!value) {
    throw new Error('useAdminSession must be used inside AdminGate.');
  }
  return value;
}

/**
 * Gates the dashboard on a valid admin session.
 *
 * This is a convenience, not a security boundary: the session cookie is
 * httpOnly, so all this component can do is ask the server whether it is signed
 * in. Every data route re-checks the same cookie, and bypassing this component
 * reveals an empty shell and nothing else.
 */
export default function AdminGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [session, setSession] = useState<AdminSession | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const requestGeneration = useRef(0);

  const check = useCallback(async () => {
    const generation = ++requestGeneration.current;
    try {
      const result = await getAdminSession();
      if (generation !== requestGeneration.current) return;
      setSession(result);
      setPhase('granted');
    } catch (error) {
      if (generation !== requestGeneration.current) return;
      const status = (error as { status?: number })?.status;
      if (status === 401) {
        setSession(null);
        setPhase('signin');
        return;
      }
      if (status === 503) {
        setSession(null);
        setPhase('unconfigured');
        return;
      }
      setMessage((error as Error)?.message ?? 'Could not verify admin access.');
      setSession(null);
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  useEffect(() => {
    const requireSignIn = () => {
      requestGeneration.current += 1;
      setSession(null);
      setMessage(null);
      setPhase('signin');
    };
    window.addEventListener('admin:unauthorized', requireSignIn);
    return () => window.removeEventListener('admin:unauthorized', requireSignIn);
  }, []);

  useEffect(() => {
    if (phase !== 'granted' || !session) return undefined;
    const timer =
      typeof session.expiresAt === 'number'
        ? window.setTimeout(
            () => void check(),
            Math.max(0, session.expiresAt - Date.now() + 50),
          )
        : undefined;
    const recheckWhenVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', recheckWhenVisible);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', recheckWhenVisible);
    };
  }, [check, phase, session]);

  if (phase === 'loading') {
    return (
      <Panel
        icon={<Loader2 className="h-6 w-6 animate-spin text-ink-muted" aria-hidden="true" />}
        title="Checking access"
        body="One moment."
      />
    );
  }

  if (phase === 'unconfigured') {
    return (
      <Panel
        icon={<ShieldAlert className="h-6 w-6 text-warn" aria-hidden="true" />}
        title="Sign-in isn’t configured"
        body="This deployment has no ADMIN_USERS or ADMIN_SESSION_SECRET set, so nobody can sign in. Generate credentials with scripts/hash-admin-password.mjs."
      />
    );
  }

  if (phase === 'error') {
    return (
      <Panel
        icon={<ShieldAlert className="h-6 w-6 text-warn" aria-hidden="true" />}
        title="Couldn’t verify access"
        body={message ?? 'The server did not respond.'}
      >
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-full border border-line-strong px-6 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
        >
          Try again
        </button>
      </Panel>
    );
  }

  if (phase === 'signin') {
    return (
      <Panel
        icon={<LockKeyhole className="h-6 w-6 text-profile" aria-hidden="true" />}
        title="Lessgo admin"
        body="Operators only."
      >
        <AdminLogin
          onSuccess={() => {
            setPhase('loading');
            void check();
          }}
        />
      </Panel>
    );
  }

  if (!session) return null;
  return (
    <AdminSessionContext.Provider value={{ session, recheck: check }}>
      {children}
    </AdminSessionContext.Provider>
  );
}

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
      <Image
        src="/admin-icon.png"
        alt="Lessgo Admin"
        width={72}
        height={66}
        priority
        className="h-16 w-auto object-contain"
      />
      <div className="mt-8 w-full rounded-xl border border-line bg-surface p-8">
        <div className="flex justify-center">{icon}</div>
        <h1 className="mt-4 font-display text-2xl font-bold text-ink">{title}</h1>
        <p className="mt-2 text-sm text-ink-muted">{body}</p>
        {children}
      </div>
    </div>
  );
}
