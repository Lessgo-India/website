// Central config for the Lessgo web client. All values are build-time public
// (NEXT_PUBLIC_*) and safe to embed. See .env.local.example for the full list.

function trimSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

export const BACKEND_API = trimSlashes(process.env.NEXT_PUBLIC_BACKEND_API ?? '');
export const SITE_URL = trimSlashes(process.env.NEXT_PUBLIC_SITE_URL ?? '');
export const SITE_NAME = 'Lessgo';

export const ANDROID_APP_URL = process.env.NEXT_PUBLIC_ANDROID_APP_URL || '';
export const IOS_APP_URL = process.env.NEXT_PUBLIC_IOS_APP_URL || '';

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

export const DEFAULT_AVATAR =
  'https://lessgo.blob.core.windows.net/lessgocontainer/default-profile.png';
