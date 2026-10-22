import { createClient } from '@/lib/supabase/server'
import { tierOf, type Tier } from './tier'

export type StudentAverage = { average: number; tier: Tier; entryCount: number }

// Average across every mark row a student has, any subject/exam combined —
// the same "overall average" the tier bands are defined against. Added up by
// the database (marks_student_averages): one row per graded student, so the
// 1,000-row response limit is never in play for a school this size.
export async function fetchStudentAverages(): Promise<Map<string, StudentAverage>> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('marks_student_averages')

  const result = new Map<string, StudentAverage>()
  for (const row of data ?? []) {
    const average = Math.round(Number(row.avg_pct))
    result.set(row.student_id, { average, tier: tierOf(average), entryCount: Number(row.entry_count) })
  }
  return result
}
