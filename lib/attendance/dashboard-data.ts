import { createClient } from '@/lib/supabase/server'
import { GRADES, sectionsForGrade } from '@/lib/students/constants'
import type { ClassAttendanceStat, DayAttendanceStat } from '@/components/dashboard/modules/AttendanceDashboardContent'

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function lastNDates(n: number, offsetDays = 0): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - offsetDays - (n - 1 - i))
    return isoDate(d)
  })
}

export type AttendanceDashboardData = {
  todayLabel: string
  classStats: Record<string, Record<string, ClassAttendanceStat>>
  week: DayAttendanceStat[]
  lastWeekAvg: number
  failedAlertsToday: number
}

export async function fetchAttendanceDashboardData(): Promise<AttendanceDashboardData> {
  const supabase = await createClient()
  const today = isoDate(new Date())
  const thisWeekDates = lastNDates(5)
  const priorWeekDates = lastNDates(5, 5)

  const [studentsRes, todayRes, weekRes, priorWeekRes, failedRes] = await Promise.all([
    supabase.from('students').select('grade_level, section').is('deleted_at', null).eq('status', 'active'),
    supabase.from('attendance_records').select('status, students(grade_level, section)').eq('class_date', today),
    supabase.from('attendance_records').select('class_date, status').in('class_date', thisWeekDates),
    supabase.from('attendance_records').select('class_date, status').in('class_date', priorWeekDates),
    supabase.from('notification_log').select('id', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('sent_at', `${today}T00:00:00.000Z`)
      .lt('sent_at', `${today}T23:59:59.999Z`),
  ])

  // ── class grid: total enrolled per grade/section, today's marks layered on top ──
  const classStats: Record<string, Record<string, ClassAttendanceStat>> = {}
  for (const g of GRADES) {
    classStats[g] = {}
    for (const s of sectionsForGrade(g)) classStats[g][s] = { present: 0, absent: 0, late: 0, total: 0 }
  }
  for (const row of studentsRes.data ?? []) {
    if (classStats[row.grade_level]?.[row.section]) classStats[row.grade_level][row.section].total++
  }
  for (const row of todayRes.data ?? []) {
    const grade = row.students?.grade_level
    const section = row.students?.section
    if (grade && section && classStats[grade]?.[section] && row.status in classStats[grade][section]) {
      ;(classStats[grade][section] as unknown as Record<string, number>)[row.status]++
    }
  }

  const totalEnrolled = Object.values(classStats).flatMap((g) => Object.values(g)).reduce((a, c) => a + c.total, 0)

  // ── week: last 5 calendar days, schoolwide totals ──
  const week: DayAttendanceStat[] = thisWeekDates.map((date) => {
    const dayRows = (weekRes.data ?? []).filter((r) => r.class_date === date)
    const present = dayRows.filter((r) => r.status === 'present').length
    const absent = dayRows.filter((r) => r.status === 'absent').length
    const late = dayRows.filter((r) => r.status === 'late').length
    return {
      day: new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }),
      date: new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
      present, absent, late,
      total: totalEnrolled,
      isToday: date === today,
    }
  })

  const priorRates = priorWeekDates.map((date) => {
    const dayRows = (priorWeekRes.data ?? []).filter((r) => r.class_date === date)
    const present = dayRows.filter((r) => r.status === 'present').length
    return totalEnrolled > 0 ? (present / totalEnrolled) * 100 : 0
  })
  const lastWeekAvg = priorRates.length > 0 ? Math.round(priorRates.reduce((a, b) => a + b, 0) / priorRates.length) : 0

  return {
    todayLabel: new Date(`${today}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }),
    classStats,
    week,
    lastWeekAvg,
    failedAlertsToday: failedRes.count ?? 0,
  }
}
