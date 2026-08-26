import { supabase } from '@/lib/supabase/client';
import { fetchChildAcademicData, type AttStatus } from './child-academic-data';
import type { Tier } from '@/lib/marks/tier';

const INITIALS = (name: string) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export type { AttStatus };

export type ParentChild = {
  id: string;
  name: string;
  roll: string;
  grade: string;
  section: string;
  initials: string;
  gradeVal: string;
  tier: Tier | null;
  attendancePct: number;
  avgScore: number;
  marks: { subject: string; exam: string; score: number; max: number; grade: string }[];
  attendance: { day: string; date: string; status: AttStatus }[];
  monthlyTrend: { month: string; attendance: number; avgScore: number }[];
  /** Current calendar month's fee status — absence of a fee_payments row means unpaid. */
  feeStatus: 'paid' | 'unpaid';
};

// Ported from the web's lib/parent/dashboard-data.ts — the single most
// security-sensitive read in the app (CLAUDE.md §12): a parent must only
// ever be able to name their OWN linked children here. Authorized entirely
// by parent_read_linked_children_* RLS policies, not application logic.
export async function fetchParentChildren(): Promise<ParentChild[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: links } = await supabase
    .from('parent_student_links')
    .select('students(id, full_name, roll_number, grade_level, section)')
    .eq('parent_id', user.id);

  const students = (links ?? [])
    .map((l) => l.students)
    .filter((s): s is NonNullable<typeof s> => !!s);

  const now = new Date();
  // Every child's data (and each child's own attendance/marks/fee queries)
  // was previously fetched one child at a time in a serial loop — for a
  // multi-sibling family that's N sequential round trips instead of one
  // parallel batch, and was the main cause of the parent dashboard feeling
  // slow to load. Promise.all across children fixes that without changing
  // any RLS scoping (each query still runs on the caller's own session).
  const children = await Promise.all(students.map(async (s) => {
    const [academic, paymentRes] = await Promise.all([
      fetchChildAcademicData(supabase, s.id),
      supabase
        .from('fee_payments')
        .select('status')
        .eq('student_id', s.id)
        .eq('year', now.getFullYear())
        .eq('month', now.getMonth() + 1)
        .maybeSingle(),
    ]);
    return {
      id: s.id,
      name: s.full_name,
      roll: s.roll_number,
      grade: s.grade_level,
      section: s.section,
      initials: INITIALS(s.full_name),
      ...academic,
      feeStatus: paymentRes.data?.status ?? 'unpaid',
    };
  }));

  return children;
}
