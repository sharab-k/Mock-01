import { createClient } from '@/lib/supabase/server'

export type AttendanceDay = { date: number; status: 'Present' | 'Late' | 'Absent' | 'Leave'; /** First Year's subject-wise records only; '' for whole-day. */ subject: string }
export type AttendanceMonth = { label: string; year: number; monthIndex: number; days: AttendanceDay[] }

export async function fetchAttendanceHistory(studentId: string): Promise<AttendanceMonth[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('attendance_records')
    .select('class_date, status, subject')
    .eq('student_id', studentId)
    .order('class_date', { ascending: true })

  const byMonth = new Map<string, AttendanceDay[]>()
  for (const row of data ?? []) {
    const d = new Date(`${row.class_date}T00:00:00Z`)
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`
    if (!byMonth.has(key)) byMonth.set(key, [])
    byMonth.get(key)!.push({
      date: d.getUTCDate(),
      status: row.status === 'present' ? 'Present' : row.status === 'late' ? 'Late' : row.status === 'leave' ? 'Leave' : 'Absent',
      subject: row.subject,
    })
  }

  return Array.from(byMonth.entries())
    .map(([key, days]) => {
      const [year, monthIndex] = key.split('-').map(Number)
      const label = new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' })
      return { label, year, monthIndex, days }
    })
    .sort((a, b) => a.year - b.year || a.monthIndex - b.monthIndex)
}
