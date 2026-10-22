import { supabase } from '@/lib/supabase/client';
import { tierOf, type Tier } from './tier';

export type StudentAverage = { average: number; tier: Tier; entryCount: number };

// Mirrors the web's lib/marks/student-averages.ts: added up by the database
// (marks_student_averages) — one row per graded student — instead of
// downloading every mark over the phone's connection.
export async function fetchStudentAverages(): Promise<Map<string, StudentAverage>> {
  const { data } = await supabase.rpc('marks_student_averages');

  const result = new Map<string, StudentAverage>();
  for (const row of data ?? []) {
    const average = Math.round(Number(row.avg_pct));
    result.set(row.student_id, { average, tier: tierOf(average), entryCount: Number(row.entry_count) });
  }
  return result;
}
