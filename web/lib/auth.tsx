'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
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
};

const AuthContext = createContext<AuthState | null>(null);

function phoneToUserId(user: User | null): string | null {
  const phone = user?.phoneNumber ?? null;
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // When Firebase isn't configured we are immediately "ready" with no session.
  const [ready, setReady] = useState<boolean>(!isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
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
  }, []);

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

  const signOut = useCallback(async () => {
    try {
      await fbSignOut(getFirebaseAuth());
    } catch {
      /* ignore */
    }
    resetRecaptcha();
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      user,
      userId: phoneToUserId(user),
      configured: isFirebaseConfigured,
      sendOtp: fbSendOtp,
      getToken,
      signOut,
    }),
    [ready, user, getToken, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>.');
  return ctx;
}
