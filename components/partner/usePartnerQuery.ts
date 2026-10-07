'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface QueryResult<T> {
  key: string;
  nonce: number;
  data: T | null;
  error: string | null;
}

/**
 * Loads data whenever `key` changes (and on `reload`). Results from stale
 * requests are ignored; data for the same key stays visible while reloading.
 */
export function usePartnerQuery<T>(load: () => Promise<T>, key: string) {
  const loadRef = useRef(load);
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<QueryResult<T> | null>(null);

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    let cancelled = false;
    loadRef.current().then(
      (data) => {
        if (!cancelled) setResult({ key, nonce, data, error: null });
      },
      (caught: unknown) => {
        if (cancelled) return;
        const message = (caught as Error)?.message ?? 'Something went wrong.';
        setResult((previous) => ({
          key,
          nonce,
          data: previous?.key === key ? previous.data : null,
          error: message,
        }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  const setData = useCallback((update: (current: T | null) => T | null) => {
    setResult((previous) => (previous ? { ...previous, data: update(previous.data) } : previous));
  }, []);

  const current = result?.key === key ? result : null;
  return {
    data: current?.data ?? null,
    error: current?.nonce === nonce ? current.error : null,
    loading: !current || current.nonce !== nonce,
    reload,
    setData,
  };
}
