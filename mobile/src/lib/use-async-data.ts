import { useCallback, useEffect, useState } from 'react';

type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; data: T };

// Shared fetch-on-mount pattern with a real error branch — Phase 3 flagged
// that screens only had loading/ready states, so a failed request (offline,
// slow network, a real backend outage) left either an infinite spinner or a
// silently-empty list indistinguishable from "genuinely no data." `reload`
// backs the Retry button every error state renders.
export function useAsyncData<T>(fetcher: () => Promise<T>, deps: React.DependencyList): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let mounted = true;
    // Deliberate: resets to 'loading' whenever deps change or reload() is
    // called, so a stale 'ready'/'error' from the previous fetch never
    // flashes before this one resolves — same pattern as useLinkedChild.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: 'loading' });
    fetcher()
      .then((data) => { if (mounted) setState({ status: 'ready', data }); })
      .catch(() => { if (mounted) setState({ status: 'error', error: 'Could not load this. Check your connection and try again.' }); });
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
