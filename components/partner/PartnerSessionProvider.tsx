'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getPartnerSession,
  PARTNER_SESSION_STORAGE_KEY,
  partnerSignOut,
} from '@web/lib/partner/partnerApi';
import { DEMO_STORE_KEY } from '@web/lib/partner/demoStore';
import type { PartnerSession } from '@web/lib/partner/types';

type Status = 'loading' | 'signed_out' | 'signed_in';

interface SessionState {
  status: Status;
  session: PartnerSession | null;
  /** True when the user pressed "Sign out" (no "come back here" redirect). */
  explicitSignOut: boolean;
}

interface PartnerSessionContextValue extends SessionState {
  signedIn: (session: PartnerSession) => void;
  signOut: () => Promise<void>;
}

const PartnerSessionContext = createContext<PartnerSessionContextValue | null>(null);

/**
 * Holds the signed-in partner for every /partner page.
 *
 * DUMMY: reads the demo session from localStorage. With the backend this
 * asks GET /api/partner/session; the httpOnly cookie is the real boundary and
 * every BFF route re-checks it, so this is a convenience, not security.
 */
export function PartnerSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({
    status: 'loading',
    session: null,
    explicitSignOut: false,
  });

  const apply = useCallback((session: PartnerSession | null) => {
    setState((previous) => ({
      status: session ? 'signed_in' : 'signed_out',
      session,
      explicitSignOut: session ? false : previous.explicitSignOut,
    }));
  }, []);

  const check = useCallback(
    () =>
      getPartnerSession()
        .catch(() => null)
        .then(apply),
    [apply],
  );

  useEffect(() => {
    let cancelled = false;
    getPartnerSession()
      .catch(() => null)
      .then((session) => {
        if (!cancelled) apply(session);
      });
    return () => {
      cancelled = true;
    };
  }, [apply]);

  useEffect(() => {
    const onUnauthorized = () => setState({ status: 'signed_out', session: null, explicitSignOut: false });
    const onStorage = (event: StorageEvent) => {
      // DUMMY: an admin action in another tab (suspend, turn off, reset) also
      // ends the session, like the server re-checking it on the next request.
      // Deferred so the demo store's own listener drops its cache first.
      if (event.key === null || event.key === PARTNER_SESSION_STORAGE_KEY || event.key === DEMO_STORE_KEY) {
        window.setTimeout(() => void check(), 0);
      }
    };
    window.addEventListener('partner:unauthorized', onUnauthorized);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('partner:unauthorized', onUnauthorized);
      window.removeEventListener('storage', onStorage);
    };
  }, [check]);

  const expiresAt = state.session?.expiresAt;
  useEffect(() => {
    if (expiresAt === undefined) return undefined;
    const untilExpiry = expiresAt - Date.now();
    // A device clock running ahead of the server makes this negative while the
    // session is still valid; re-check once a minute instead of spinning. Keyed
    // on `expiresAt`, so a re-check returning the same session doesn't re-arm.
    const delay = untilExpiry > 0 ? untilExpiry + 50 : 60_000;
    const timer = window.setTimeout(() => void check(), delay);
    return () => window.clearTimeout(timer);
  }, [check, expiresAt]);

  const signedIn = useCallback((session: PartnerSession) => {
    setState({ status: 'signed_in', session, explicitSignOut: false });
  }, []);

  const signOut = useCallback(async () => {
    await partnerSignOut().catch(() => undefined);
    setState({ status: 'signed_out', session: null, explicitSignOut: true });
  }, []);

  const value = useMemo(() => ({ ...state, signedIn, signOut }), [state, signedIn, signOut]);

  return <PartnerSessionContext.Provider value={value}>{children}</PartnerSessionContext.Provider>;
}

export function usePartnerSession(): PartnerSessionContextValue {
  const value = useContext(PartnerSessionContext);
  if (!value) throw new Error('usePartnerSession must be used inside PartnerSessionProvider.');
  return value;
}

/** For pages behind PartnerGate, where a session is guaranteed. */
export function useSignedInPartner(): PartnerSession {
  const { session } = usePartnerSession();
  if (!session) throw new Error('useSignedInPartner must be used inside PartnerGate.');
  return session;
}
