'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface AdminResourceState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/**
 * Loads an admin resource once and exposes an explicit refresh action.
 * Previous data is kept while a refresh is in flight.
 */
export function useAdminResource<T>(
  fetcher: () => Promise<T>,
  key: string,
): AdminResourceState<T> & { refresh: () => void } {
  const [state, setState] = useState<AdminResourceState<T>>({
    data: null,
    error: null,
    loading: true,
  });
  const fetcherRef = useRef(fetcher);
  const refreshRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const refresh = useCallback(() => refreshRef.current(), []);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    let rerunRequested = false;

    const run = async () => {
      if (cancelled) return;
      if (inFlight) {
        rerunRequested = true;
        return;
      }
      inFlight = true;
      setState((previous) => ({ ...previous, error: null, loading: true }));
      try {
        const data = await fetcherRef.current();
        if (!cancelled) setState({ data, error: null, loading: false });
      } catch (error) {
        if (!cancelled) {
          const unauthorized = (error as { status?: number })?.status === 401;
          setState((previous) => ({
            data: unauthorized ? null : previous.data,
            loading: false,
            error: (error as Error)?.message ?? 'Request failed.',
          }));
        }
      } finally {
        inFlight = false;
        if (cancelled) return;
        if (rerunRequested) {
          rerunRequested = false;
          void run();
        }
      }
    };

    refreshRef.current = () => void run();
    void run();

    return () => {
      cancelled = true;
      refreshRef.current = () => undefined;
    };
  }, [key]);

  return { ...state, refresh };
}
