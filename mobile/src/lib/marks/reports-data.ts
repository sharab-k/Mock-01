import { supabase } from '@/lib/supabase/client';
import { fetchStudentAverages } from './student-averages';
import type { Tier } from './tier';

export type TieredStudent = {
  id: string;
  full_name: string;
  roll_number: string;
  grade: string;
  section: string;
  average: number;
  tier: Tier;
};

// Ported from the web's lib/marks/reports-data.ts — only students with at
// least one mark can have a tier.
export async function fetchTieredStudents(): Promise<TieredStudent[]> {
  const { data: students } = await supabase
    .from('students')
    .select('id, full_name, roll_number, grade_level, section')
    .is('deleted_at', null)
    .eq('status', 'active');

  const averages = await fetchStudentAverages();

  return (students ?? [])
    .filter((s) => averages.has(s.id))
    .map((s) => {
      const avg = averages.get(s.id)!;
      return {
        id: s.id,
        full_name: s.full_name,
        roll_number: s.roll_number,
        grade: s.grade_level,
        section: s.section,
        average: avg.average,
        tier: avg.tier,
      };
    });
}
