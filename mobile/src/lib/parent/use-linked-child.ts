import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export type LinkedChild = {
  id: string;
  fullName: string;
  rollNumber: string;
  gradeLevel: string;
  section: string;
  isLateEnrollment: boolean;
};

type LinkedChildState =
  | { status: 'loading' }
  | { status: 'denied' }
  | { status: 'error'; error: string; reload: () => void }
  | { status: 'ready'; child: LinkedChild };

// Client-side equivalent of the web's requireParentAccessToChild
// (lib/auth/require-parent-access.ts) — there's no server-rendered layout to
// redirect from on native, so every screen under student/[studentId] goes
// through this via the group's _layout.tsx, which bounces back to /parent on
// denial. RLS (parent_read_linked_children_students) is what actually
// enforces the boundary — this only decides what the UI shows meanwhile.
export function useLinkedChild(studentId: string): LinkedChildState {
  const [state, setState] = useState<LinkedChildState>({ status: 'loading' });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let mounted = true;
    // Deliberate: resets to 'loading' whenever studentId changes (e.g.
    // switching siblings) or reload() is called, so a stale
    // 'ready'/'denied'/'error' from the previous attempt never flashes
    // before this fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: 'loading' });

    // Wrapped in an async IIFE + try/catch rather than a .then() chain —
    // the postgrest-js query builder's thenable only implements `.then`,
    // not the full Promise interface, so `.catch()` isn't chainable on it
    // directly. Without a catch of some form, a rejected request (offline,
    // timeout, a genuine backend outage) left `state` stuck at 'loading'
    // forever — the screen this gates would spin indefinitely with no way
    // out.
    (async () => {
      try {
        // A second, independent safety net: a request that never settles at
        // all (a hung connection, not a rejection) would still leave `state`
        // at 'loading' forever without this — racing against a hard 15s
        // timer means the screen can never spin indefinitely either way.
        const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timed out.')), 15_000));
        const { data } = await Promise.race([
          supabase
            .from('students')
            .select('id, full_name, roll_number, grade_level, section, is_late_enrollment')
            .eq('id', studentId)
            .maybeSingle(),
          timeout,
        ]);

        if (!mounted) return;
        if (!data) {
          setState({ status: 'denied' });
          return;
        }
        setState({
          status: 'ready',
          child: {
            id: data.id,
            fullName: data.full_name,
            rollNumber: data.roll_number,
            gradeLevel: data.grade_level,
            section: data.section,
            isLateEnrollment: data.is_late_enrollment,
          },
        });
      } catch {
        if (mounted) setState({ status: 'error', error: 'Could not load this. Check your connection and try again.', reload: () => setTick((t) => t + 1) });
      }
    })();

    return () => { mounted = false; };
  }, [studentId, tick]);

  return state;
}
