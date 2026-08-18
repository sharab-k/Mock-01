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
  | { status: 'ready'; child: LinkedChild };

// Client-side equivalent of the web's requireParentAccessToChild
// (lib/auth/require-parent-access.ts) — there's no server-rendered layout to
// redirect from on native, so every screen under student/[studentId] goes
// through this via the group's _layout.tsx, which bounces back to /parent on
// denial. RLS (parent_read_linked_children_students) is what actually
// enforces the boundary — this only decides what the UI shows meanwhile.
export function useLinkedChild(studentId: string): LinkedChildState {
  const [state, setState] = useState<LinkedChildState>({ status: 'loading' });

  useEffect(() => {
    let mounted = true;
    // Deliberate: resets to 'loading' whenever studentId changes (e.g.
    // switching siblings) so a stale 'ready'/'denied' from the previous
    // child never flashes before this fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: 'loading' });

    supabase
      .from('students')
      .select('id, full_name, roll_number, grade_level, section, is_late_enrollment')
      .eq('id', studentId)
      .maybeSingle()
      .then(({ data }) => {
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
      });

    return () => { mounted = false; };
  }, [studentId]);

  return state;
}
