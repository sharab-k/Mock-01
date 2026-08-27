import { useCallback, useEffect, useState } from 'react';

type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; data: T };

const TIMEOUT_MS = 15_000;

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
// below: a rejected promise is already handled, but a request that never
// settles at all (a hung connection, a dropped socket that never fires
// either a resolve or a reject) would otherwise leave `state` at 'loading'
// forever with nothing to catch. Racing every fetch against a hard 15s
// timer means the screen can never spin indefinitely, regardless of cause.
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
    withTimeout(fetcher())
      .then((data) => { if (mounted) setState({ status: 'ready', data }); })
      .catch(() => { if (mounted) setState({ status: 'error', error: 'Could not load this. Check your connection and try again.' }); });
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
