'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useAdminSession } from '@ui/admin/AdminGate';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface AdminPwaContextValue {
  online: boolean;
  standalone: boolean;
  installAvailable: boolean;
  updateAvailable: boolean;
  install: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  activateUpdate: () => void;
  registration: ServiceWorkerRegistration | null;
}

const AdminPwaContext = createContext<AdminPwaContextValue | null>(null);

export function useAdminPwa(): AdminPwaContextValue {
  const value = useContext(AdminPwaContext);
  if (!value) throw new Error('useAdminPwa must be used inside AdminPwaProvider.');
  return value;
}

export default function AdminPwaProvider({ children }: { children: ReactNode }) {
  const { recheck } = useAdminSession();
  const [online, setOnline] = useState(true);
  const [standalone, setStandalone] = useState(false);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    setStandalone(window.matchMedia('(display-mode: standalone)').matches);

    const handleOnline = () => {
      setOnline(true);
      void recheck();
      window.dispatchEvent(new Event('admin:reconnect'));
    };
    const handleOffline = () => setOnline(false);
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setStandalone(true);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    const handleWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ADMIN_SESSION_RECHECK') void recheck();
    };
    navigator.serviceWorker?.addEventListener('message', handleWorkerMessage);

    let disposed = false;
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker
        .register('/admin-sw.js', {
          scope: '/admin',
          updateViaCache: 'none',
        })
        .then((nextRegistration) => {
          if (disposed) return;
          setRegistration(nextRegistration);
          setUpdateAvailable(Boolean(nextRegistration.waiting));
          const watchInstalling = () => {
            const installing = nextRegistration.installing;
            if (!installing) return;
            installing.addEventListener('statechange', () => {
              if (
                installing.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                setUpdateAvailable(true);
              }
            });
          };
          nextRegistration.addEventListener('updatefound', watchInstalling);
        })
        .catch(() => {
          // Installability is progressive enhancement; the admin app remains usable.
        });
    }

    return () => {
      disposed = true;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      navigator.serviceWorker?.removeEventListener(
        'message',
        handleWorkerMessage,
      );
    };
  }, [recheck]);

  async function install() {
    if (!installPrompt) return 'unavailable' as const;
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') setInstallPrompt(null);
    return result.outcome;
  }

  function activateUpdate() {
    const waiting = registration?.waiting;
    if (!waiting) return;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
    waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  return (
    <AdminPwaContext.Provider
      value={{
        online,
        standalone,
        installAvailable: Boolean(installPrompt),
        updateAvailable,
        install,
        activateUpdate,
        registration,
      }}
    >
      {children}
    </AdminPwaContext.Provider>
  );
}
