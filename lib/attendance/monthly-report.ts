import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchAllRows } from '@/lib/db/fetch-all'
import type { Database } from '@/types/supabase'

export type MonthlyStudentInput = { id: string; roll: string; gr: string | null; name: string; active: boolean }
export type MonthlyRecordInput = { student_id: string; class_date: string; status: string; subject: string }

export type MonthlyStudentRow = {
  id: string
  serial: number
  name: string
  roll: string
  gr: string
  inactive: boolean
  /** One entry per day of the month: P, A, L (late), LV (leave), "3/4" (subject-wise day: attended / periods) or "" (nothing marked). */
  days: string[]
  present: number
  late: number
  absent: number
  leave: number
  /** (present + late) / (present + late + absent). Leave is excused, so it is not in the denominator. */
  pct: number | null
}

export type MonthlyReport = {
  grade: string
  section: string
  year: number
  month: number
  daysInMonth: number
  /** Weekday initial for each day, to spot Sundays and holidays at a glance. */
  weekdays: string[]
  students: MonthlyStudentRow[]
}

const CODE: Record<string, string> = { present: 'P', absent: 'A', late: 'L', leave: 'LV' }
const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export const monthStart = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}-01`
export const monthEnd = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}-${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, '0')}`

/**
 * Builds the class's month sheet. A whole-day record decides that day's cell; a First/Second Year day that
 * only has subject-wise records shows "attended/periods". Students who have left are kept only if they have
 * records in the month, so history stays complete without cluttering the sheet with people long gone.
 */
export function buildMonthlyReport(
  meta: { grade: string; section: string; year: number; month: number },
  students: MonthlyStudentInput[],
  records: MonthlyRecordInput[],
): MonthlyReport {
  const { year, month } = meta
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const prefix = `${year}-${String(month).padStart(2, '0')}-`
  const byStudent = new Map<string, MonthlyRecordInput[]>()
  for (const r of records) {
    if (!r.class_date.startsWith(prefix)) continue
    const list = byStudent.get(r.student_id) ?? []
    list.push(r)
    byStudent.set(r.student_id, list)
  }

  const rows: MonthlyStudentRow[] = []
  for (const s of students) {
    const mine = byStudent.get(s.id) ?? []
    if (!s.active && mine.length === 0) continue

    let present = 0, late = 0, absent = 0, leave = 0
    for (const r of mine) {
      if (r.status === 'present') present++
      else if (r.status === 'late') late++
      else if (r.status === 'absent') absent++
      else if (r.status === 'leave') leave++
    }

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const date = `${prefix}${String(i + 1).padStart(2, '0')}`
      const day = mine.filter((r) => r.class_date === date)
      if (day.length === 0) return ''
      const whole = day.find((r) => r.subject === '')
      if (whole) return CODE[whole.status] ?? ''
      const counted = day.filter((r) => r.status !== 'leave')
      if (counted.length === 0) return 'LV'
      return `${counted.filter((r) => r.status === 'present' || r.status === 'late').length}/${counted.length}`
    })

    const denominator = present + late + absent
    rows.push({
      id: s.id, serial: 0, name: s.name, roll: s.roll, gr: s.gr ?? '', inactive: !s.active, days,
      present, late, absent, leave, pct: denominator > 0 ? Math.round(((present + late) / denominator) * 100) : null,
    })
  }
  rows.forEach((r, i) => { r.serial = i + 1 })

  return {
    ...meta,
    daysInMonth,
    weekdays: Array.from({ length: daysInMonth }, (_, i) => WEEKDAY[new Date(Date.UTC(year, month - 1, i + 1)).getUTCDay()]!),
    students: rows,
  }
}

/** Reads one class's students and that month's records (RLS decides what the caller may see), then builds the sheet. */
export async function fetchMonthlyReport(
  supabase: SupabaseClient<Database>,
  grade: string,
  section: string,
  year: number,
  month: number,
): Promise<MonthlyReport> {
  const students = await fetchAllRows((from, to) =>
    supabase.from('students').select('id, roll_number, gr_number, full_name, status')
      .eq('grade_level', grade).eq('section', section).is('deleted_at', null)
      .order('list_sort', { ascending: true }).order('id').range(from, to),
  )
  const ids = students.map((s) => s.id)
  const records = ids.length === 0 ? [] : await fetchAllRows((from, to) =>
    supabase.from('attendance_records').select('student_id, class_date, status, subject')
      .in('student_id', ids).gte('class_date', monthStart(year, month)).lte('class_date', monthEnd(year, month))
      .order('class_date').order('student_id').order('subject').range(from, to),
  )
  return buildMonthlyReport(
    { grade, section, year, month },
    students.map((s) => ({ id: s.id, roll: s.roll_number, gr: s.gr_number, name: s.full_name, active: s.status === 'active' })),
    records,
  )
}
