import { supabase } from '@/lib/supabase/client';
import { fetchChildAcademicData, type ChildAcademicData } from '@/lib/parent/child-academic-data';
import { fetchStudentLectures, type LectureProgress } from './lectures';

export type { LectureProgress };

export type StudentDashboardData = ChildAcademicData & {
  lectures: LectureProgress[];
};

// Ported from the web's lib/student/dashboard-data.ts. Runs on the parent's
// own RLS-scoped session for a child confirmed linked to them — see
// requireLinkedChild in lib/auth/require-parent-access.ts.
export async function fetchStudentDashboardData(studentId: string): Promise<StudentDashboardData> {
  const [academic, lectures] = await Promise.all([
    fetchChildAcademicData(supabase, studentId),
    fetchStudentLectures(studentId),
  ]);

  return { ...academic, lectures };
}
