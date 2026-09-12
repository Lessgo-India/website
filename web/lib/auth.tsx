'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import { isFirebaseConfigured } from './config';
import {
  getFirebaseAuth,
  onAuthStateChanged,
  sendOtp as fbSendOtp,
  signOut as fbSignOut,
  resetRecaptcha,
  type ConfirmationResult,
  type User,
} from './firebase';

type AuthState = {
  ready: boolean;
  user: User | null;
  userId: string | null; // 10-digit phone == gateway identity
  configured: boolean;
  sendOtp: (e164Phone: string, containerId: string) => Promise<ConfirmationResult>;
  getToken: (forceRefresh?: boolean) => Promise<string | null>;
  signOut: () => Promise<void>;
  signOutConfirmed: (expectedUid?: string) => Promise<void>;
};

export class AuthIdentityChangedError extends Error {
  constructor() {
    super('The authenticated Firebase user changed.');
    this.name = 'AuthIdentityChangedError';
  }
}

const AuthContext = createContext<AuthState | null>(null);

function phoneToUserId(user: User | null): string | null {
  const phone = user?.phoneNumber ?? null;
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute =
    pathname === '/admin' || (pathname?.startsWith('/admin/') ?? false);
  const [user, setUser] = useState<User | null>(null);
  // When Firebase isn't configured we are immediately "ready" with no session.
  const [ready, setReady] = useState<boolean>(!isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured || isAdminRoute) {
      setReady(true);
      return;
    }
    setReady(false);
    let unsub = () => {};
    try {
      unsub = onAuthStateChanged(getFirebaseAuth(), (u) => {
        setUser(u);
        setReady(true);
      });
    } catch {
      setReady(true);
    }
    return () => unsub();
  }, [isAdminRoute]);

  const getToken = useCallback(
    async (forceRefresh = false) => {
      if (!user) return null;
      try {
        return await user.getIdToken(forceRefresh);
      } catch {
        return null;
      }
    },
    [user],
  );

  const signOutConfirmed = useCallback(async (expectedUid?: string) => {
    const auth = getFirebaseAuth();
    if (!auth.currentUser) {
      resetRecaptcha();
      setUser(null);
      return;
    }
    if (expectedUid && auth.currentUser.uid !== expectedUid) {
      throw new AuthIdentityChangedError();
    }
    try {
      await fbSignOut(auth);
    } finally {
      resetRecaptcha();
    }
    setUser(null);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await signOutConfirmed();
    } catch {
      // Regular sign-out remains best-effort for existing callers. Account
      // deletion uses signOutConfirmed so it can report a local cleanup error.
      resetRecaptcha();
      setUser(null);
    }
  }, [signOutConfirmed]);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      user,
      userId: phoneToUserId(user),
      configured: isFirebaseConfigured && !isAdminRoute,
      sendOtp: fbSendOtp,
      getToken,
      signOut,
      signOutConfirmed,
    }),
    [ready, user, isAdminRoute, getToken, signOut, signOutConfirmed],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>.');
  return ctx;
}
