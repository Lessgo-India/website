'use client';

import { createContext, useContext, type ReactNode } from 'react';
import {
  useScopedPwa,
  type ScopedPwaState,
} from '@ui/pwa/useScopedPwa';

const PartnerPwaContext = createContext<ScopedPwaState | null>(null);

export function usePartnerPwa(): ScopedPwaState {
  const value = useContext(PartnerPwaContext);
  if (!value) {
    throw new Error('usePartnerPwa must be used inside PartnerPwaProvider.');
  }
  return value;
}

export default function PartnerPwaProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pwa = useScopedPwa({
    appName: 'Lessgo Partners',
    workerUrl: '/partner-sw.js',
    scope: '/partner',
    reconnectEvent: 'partner:reconnect',
  });

  return (
    <PartnerPwaContext.Provider value={pwa}>
      {children}
    </PartnerPwaContext.Provider>
  );
}
