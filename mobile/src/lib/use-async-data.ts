import { useCallback, useEffect, useState } from 'react';

type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; data: T };

const TIMEOUT_MS = 15_000;
// How long a cached screen counts as fresh. Inside this window coming back to a
// screen shows its data instantly and makes no request at all; after it the
// cached data still shows instantly while a fresh copy loads behind it.
const DEFAULT_STALE_MS = 60_000;

const cache = new Map<string, { data: unknown; at: number }>();

// Called on sign-out/sign-in so one person's screens are never shown to the next.
export function clearAsyncCache(): void {
  cache.clear();
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out.')), TIMEOUT_MS);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

// Shared fetch-on-mount pattern with a real error branch — Phase 3 flagged
// that screens only had loading/ready states, so a failed request (offline,
// slow network, a real backend outage) left either an infinite spinner or a
// silently-empty list indistinguishable from "genuinely no data." `reload`
// backs the Retry button every error state renders.
//
// withTimeout is a second, independent safety net on top of the .catch()
// below: a request that never settles at all would otherwise leave `state` at
// 'loading' forever. Racing every fetch against a hard 15s timer means the
// screen can never spin indefinitely, regardless of cause.
//
// `cacheKey` (optional) turns on stale-while-revalidate: the last result for
// that key is shown immediately — no spinner — and refreshed in the background
// when it is older than `staleMs`. A request is made on every screen open
// otherwise, over a connection that costs ~0.3 s a query before any data moves.
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList,
  options?: { cacheKey?: string; staleMs?: number },
): AsyncState<T> & { reload: () => void } {
  const cacheKey = options?.cacheKey;
  const staleMs = options?.staleMs ?? DEFAULT_STALE_MS;
  const [state, setState] = useState<AsyncState<T>>(() => {
    const hit = cacheKey ? cache.get(cacheKey) : undefined;
    return hit ? { status: 'ready', data: hit.data as T } : { status: 'loading' };
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let mounted = true;
    const hit = cacheKey ? cache.get(cacheKey) : undefined;
    const fresh = hit && tick === 0 && Date.now() - hit.at < staleMs;

    if (hit && fresh) {
      // Deliberate: sync to the cached copy for this key; nothing to fetch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ status: 'ready', data: hit.data as T });
      return () => { mounted = false; };
    }
    if (hit) {
      // Stale: show it now, refresh behind it (no spinner).
      setState({ status: 'ready', data: hit.data as T });
    } else {
      // Deliberate: resets to 'loading' whenever deps change or reload() is
      // called, so a stale 'ready'/'error' from the previous fetch never
      // flashes before this one resolves — same pattern as useLinkedChild.
      setState({ status: 'loading' });
    }

    withTimeout(fetcher())
      .then((data) => {
        if (cacheKey) cache.set(cacheKey, { data, at: Date.now() });
        if (mounted) setState({ status: 'ready', data });
      })
      .catch(() => {
        // A failed refresh must not wipe good cached data off the screen.
        if (mounted && !hit) setState({ status: 'error', error: 'Could not load this. Check your connection and try again.' });
      });
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
