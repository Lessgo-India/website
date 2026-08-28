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
  const [nonce, setNonce] = useState(0);

  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    setState((previous) => ({ ...previous, loading: true }));

    const schedule = () => {
      if (cancelled || document.visibilityState === 'hidden') return;
      timer = setTimeout(run, intervalMs + Math.random() * 3_000);
    };

    const run = async () => {
      try {
        const data = await fetcherRef.current();
        if (!cancelled) setState({ data, error: null, loading: false });
      } catch (error) {
        if (!cancelled) {
          setState((previous) => ({
            ...previous,
            loading: false,
            error: (error as Error)?.message ?? 'Request failed.',
          }));
        }
      } finally {
        schedule();
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      clearTimeout(timer);
      void run();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    void run();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [key, nonce, intervalMs]);

  return { ...state, refresh };
}
