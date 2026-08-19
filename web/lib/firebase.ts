'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged,
  signOut,
  type Auth,
  type ConfirmationResult,
  type User,
} from 'firebase/auth';
import { firebaseConfig, isFirebaseConfigured } from './config';

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let recaptcha: RecaptchaVerifier | undefined;

export function getFirebaseAuth(): Auth {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured. Set the NEXT_PUBLIC_FIREBASE_* env vars.');
  }
  if (!app) app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  if (!authInstance) authInstance = getAuth(app);
  return authInstance;
}

export function resetRecaptcha(): void {
  try {
    recaptcha?.clear();
  } catch {
    /* ignore */
  }
  recaptcha = undefined;
}

// e164Phone must be full international format, e.g. +919716674953. A fresh
// invisible reCAPTCHA is created per send so resends don't hit the
// "already rendered" error.
export function sendOtp(e164Phone: string, containerId: string): Promise<ConfirmationResult> {
  const auth = getFirebaseAuth();
  resetRecaptcha();
  recaptcha = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
  return signInWithPhoneNumber(auth, e164Phone, recaptcha);
}

export { onAuthStateChanged, signOut };
export type { ConfirmationResult, User };
