'use client';

import { useEffect, useState } from 'react';
import { getMuo } from './api';
import { useAuth } from './auth';
import type { Muo } from './types';

// Module-level cache so the header, event page and /me don't each refetch the
// MUO on every mount.
let cache: { userId: string; muo: Muo } | null = null;

export function useMe(): {
  muo: Muo | null;
  name: string | null;
  loading: boolean;
  reload: () => void;
} {
  const { userId, getToken } = useAuth();
  const [muo, setMuo] = useState<Muo | null>(
    cache && cache.userId === userId ? cache.muo : null,
  );
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!userId) {
        setMuo(null);
        return;
      }
      if (cache && cache.userId === userId && tick === 0) {
        setMuo(cache.muo);
        return;
      }
      const token = await getToken();
      if (!token) return;
      setLoading(true);
      try {
        const data = await getMuo(userId, token);
        if (!active) return;
        cache = { userId, muo: data };
        setMuo(data);
      } catch {
        /* keep last-good */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId, getToken, tick]);

  return {
    muo,
    name: muo?.profile?.name ?? null,
    loading,
    reload: () => setTick((t) => t + 1),
  };
}
