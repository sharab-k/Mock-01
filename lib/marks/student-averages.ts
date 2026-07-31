import { createClient } from '@/lib/supabase/server'
import { tierOf, type Tier } from './tier'

export type StudentAverage = { average: number; tier: Tier; entryCount: number }

// Average across every mark row a student has, any subject/exam combined —
// the same "overall average" the tier bands are defined against.
export async function fetchStudentAverages(): Promise<Map<string, StudentAverage>> {
  const supabase = await createClient()
  const { data } = await supabase.from('marks').select('student_id, score, max_score')

  const byStudent = new Map<string, { sum: number; count: number }>()
  for (const row of data ?? []) {
    const cur = byStudent.get(row.student_id) ?? { sum: 0, count: 0 }
    cur.sum += (row.score / row.max_score) * 100
    cur.count++
    byStudent.set(row.student_id, cur)
  }

  const result = new Map<string, StudentAverage>()
  for (const [id, v] of byStudent) {
    const average = Math.round(v.sum / v.count)
    result.set(id, { average, tier: tierOf(average), entryCount: v.count })
  }
  return result
}
