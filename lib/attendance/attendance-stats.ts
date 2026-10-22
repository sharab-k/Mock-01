import { createClient } from '@/lib/supabase/server'

export type AttendancePct = { pct: number; present: number; total: number }

// Late counts as "attended" for this percentage — a late arrival still means
// the student was in class that day, unlike an absence. Added up by the
// database (attendance_student_stats) instead of downloading every row.
export async function fetchAttendancePercentages(): Promise<Map<string, AttendancePct>> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('attendance_student_stats')

  const result = new Map<string, AttendancePct>()
  for (const row of data ?? []) {
    const present = Number(row.present)
    const total = Number(row.total)
    result.set(row.student_id, { pct: total > 0 ? Math.round((present / total) * 100) : 0, present, total })
  }
  return result
}
