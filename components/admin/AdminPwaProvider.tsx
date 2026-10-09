'use client';

import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from 'react';
import { useAdminSession } from '@ui/admin/AdminGate';
import {
  useScopedPwa,
  type ScopedPwaState,
} from '@ui/pwa/useScopedPwa';

const AdminPwaContext = createContext<ScopedPwaState | null>(null);

export function useAdminPwa(): ScopedPwaState {
  const value = useContext(AdminPwaContext);
  if (!value) throw new Error('useAdminPwa must be used inside AdminPwaProvider.');
  return value;
}

export default function AdminPwaProvider({ children }: { children: ReactNode }) {
  const { recheck } = useAdminSession();
  const handleReconnect = useCallback(() => void recheck(), [recheck]);
  const handleWorkerMessage = useCallback(
    (event: MessageEvent) => {
      if (event.data?.type === 'ADMIN_SESSION_RECHECK') void recheck();
    },
    [recheck],
  );
  const pwa = useScopedPwa({
    appName: 'Lessgo Admin',
    workerUrl: '/admin-sw.js',
    scope: '/admin',
    reconnectEvent: 'admin:reconnect',
    onReconnect: handleReconnect,
    onWorkerMessage: handleWorkerMessage,
  });

  return (
    <AdminPwaContext.Provider value={pwa}>
      {children}
    </AdminPwaContext.Provider>
  );
}
