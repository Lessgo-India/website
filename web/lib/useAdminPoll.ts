'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface PollState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/**
 * Polls a read endpoint on an interval, with two behaviours that matter for a
 * dashboard left open all day:
 *
 * - **Pauses while the tab is hidden** and fetches immediately on return, so a
 *   forgotten tab stops hammering the gateway overnight.
 * - **Jitters each interval**, so several operators watching at once don't
 *   synchronise into a thundering herd.
 *
 * Previous data is kept while a refresh is in flight, so the UI never flashes
 * empty on a poll.
 */
export function usePoll<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  key: string,
): PollState<T> & { refresh: () => void } {
  const [state, setState] = useState<PollState<T>>({
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
    let timer: ReturnType<typeof setTimeout> | undefined;

    setState((previous) => ({ ...previous, loading: true }));

    const schedule = () => {
      if (cancelled || document.visibilityState === 'hidden') return;
      timer = setTimeout(run, intervalMs + Math.random() * 3_000);
    };

    const run = async () => {
      if (cancelled) return;
      if (document.visibilityState === 'hidden') {
        clearTimeout(timer);
        return;
      }
      if (inFlight) {
        rerunRequested = true;
        return;
      }
      inFlight = true;
      clearTimeout(timer);
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
        } else {
          schedule();
        }
      }
    };

    const onVisibilityChange = () => {
      clearTimeout(timer);
      if (document.visibilityState !== 'visible') return;
      void run();
    };

    refreshRef.current = onVisibilityChange;

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('admin:reconnect', onVisibilityChange);
    void run();

    return () => {
      cancelled = true;
      refreshRef.current = () => undefined;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('admin:reconnect', onVisibilityChange);
    };
  }, [key, intervalMs]);

  return { ...state, refresh };
}
