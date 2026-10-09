'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface ScopedPwaState {
  online: boolean;
  standalone: boolean;
  ios: boolean;
  installAvailable: boolean;
  updateAvailable: boolean;
  registrationError: string | null;
  install: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  activateUpdate: () => void;
  registration: ServiceWorkerRegistration | null;
}

interface ScopedPwaOptions {
  appName: string;
  workerUrl: string;
  scope: string;
  reconnectEvent?: string;
  onReconnect?: () => void | Promise<void>;
  onWorkerMessage?: (event: MessageEvent) => void;
}

function isIosDevice(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function useScopedPwa({
  appName,
  workerUrl,
  scope,
  reconnectEvent,
  onReconnect,
  onWorkerMessage,
}: ScopedPwaOptions): ScopedPwaState {
  const [online, setOnline] = useState(true);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const displayMode = window.matchMedia('(display-mode: standalone)');
    const syncStandalone = () => {
      const navigatorWithStandalone = navigator as Navigator & {
        standalone?: boolean;
      };
      setStandalone(
        displayMode.matches || navigatorWithStandalone.standalone === true,
      );
    };
    setOnline(navigator.onLine);
    setIos(isIosDevice());
    syncStandalone();

    const handleOnline = () => {
      setOnline(true);
      void onReconnect?.();
      if (reconnectEvent) window.dispatchEvent(new Event(reconnectEvent));
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
    displayMode.addEventListener('change', syncStandalone);
    if (onWorkerMessage) {
      navigator.serviceWorker?.addEventListener(
        'message',
        onWorkerMessage,
      );
    }

    let disposed = false;
    let nextRegistration: ServiceWorkerRegistration | null = null;
    let watchInstalling: (() => void) | null = null;
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker
        .register(workerUrl, {
          scope,
          updateViaCache: 'none',
        })
        .then((registered) => {
          if (disposed) return;
          nextRegistration = registered;
          setRegistration(registered);
          setRegistrationError(null);
          setUpdateAvailable(Boolean(registered.waiting));
          watchInstalling = () => {
            const installing = registered.installing;
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
          registered.addEventListener('updatefound', watchInstalling);
        })
        .catch((caught: unknown) => {
          if (disposed) return;
          const detail =
            caught instanceof Error ? caught.message : 'Unknown browser error';
          setRegistrationError(`${appName} could not enable installation: ${detail}`);
        });
    }

    return () => {
      disposed = true;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      displayMode.removeEventListener('change', syncStandalone);
      if (onWorkerMessage) {
        navigator.serviceWorker?.removeEventListener(
          'message',
          onWorkerMessage,
        );
      }
      if (nextRegistration && watchInstalling) {
        nextRegistration.removeEventListener('updatefound', watchInstalling);
      }
    };
  }, [
    appName,
    onReconnect,
    onWorkerMessage,
    reconnectEvent,
    scope,
    workerUrl,
  ]);

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

  return {
    online,
    standalone,
    ios,
    installAvailable: Boolean(installPrompt),
    updateAvailable,
    registrationError,
    install,
    activateUpdate,
    registration,
  };
}
