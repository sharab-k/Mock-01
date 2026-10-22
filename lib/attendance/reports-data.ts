import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/db/fetch-all'
import { GRADES } from '@/lib/students/constants'

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export type WeekTrendPoint = { week: string; rate: number }

export type AttendanceReportsData = {
  monthTrend: WeekTrendPoint[]
  classComparison: Record<string, number>
  classTotals: Record<string, number>
}

// Rolling 4×7-day buckets ending today, oldest first — an approximation of
// "this month's weekly trend" since the app has no calendar-week/term model.
export async function fetchAttendanceReportsData(): Promise<AttendanceReportsData> {
  const supabase = await createClient()

  // Rates are added up by the database (attendance_weekly_rates / _grade_rates)
  // — the old code downloaded every attendance row ever recorded.
  const today = isoDate(new Date())
  const [students, weeklyRes, gradeRes] = await Promise.all([
    fetchAllRows((from, to) => supabase.from('students').select('grade_level, section').is('deleted_at', null).eq('status', 'active').order('id').range(from, to)),
    supabase.rpc('attendance_weekly_rates', { p_today: today }),
    supabase.rpc('attendance_grade_rates'),
  ])

  const classTotals: Record<string, number> = {}
  for (const g of GRADES) classTotals[g] = 0
  for (const row of students) {
    if (row.grade_level in classTotals) classTotals[row.grade_level]++
  }

  const rate = (attended: unknown, total: unknown) => (Number(total) > 0 ? Math.round((Number(attended) / Number(total)) * 100) : 0)

  const monthTrend: WeekTrendPoint[] = Array.from({ length: 4 }, (_, i) => {
    const bucket = (weeklyRes.data ?? []).find((b) => b.bucket === i)
    return { week: `Week ${i + 1}`, rate: rate(bucket?.attended, bucket?.total) }
  })

  const classComparison: Record<string, number> = {}
  for (const grade of GRADES) {
    const row = (gradeRes.data ?? []).find((r) => r.grade_level === grade)
    classComparison[grade] = rate(row?.attended, row?.total)
  }

  return { monthTrend, classComparison, classTotals }
}
