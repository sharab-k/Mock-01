import SuperAdminDashboardContent from '@/components/dashboard/modules/SuperAdminDashboardContent'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { GRADES, sectionsForGrade } from '@/lib/students/constants'
import { STAFF_ROLES } from '@/lib/staff/roles'
import { fetchStaffDirectory } from '@/lib/staff/fetch'
import { fetchAuditLog } from '@/lib/audit/fetch'

const GRADE_META: Record<string, { color: string; to: string }> = {
  '9':  { color: 'bg-[#487A63]', to: 'Grade 10' },
  '10': { color: 'bg-[#547B96]', to: 'Grade 11' },
  '11': { color: 'bg-[#495F8D]', to: 'Grade 12' },
  '12': { color: 'bg-[#7E587E]', to: 'Graduated' },
}

function isoDate(offsetDays: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

function startOfMonthIso(): string {
  const d = new Date()
  d.setUTCDate(1)
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

function attendancePct(rows: { status: string }[]): number | null {
  if (rows.length === 0) return null
  const present = rows.filter((r) => r.status === 'present' || r.status === 'late').length
  return Math.round((present / rows.length) * 100)
}

export default async function SuperAdminDashboard() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const [
    studentsRes, monthlyEnrollRes, subAdminCountRes, inactiveSubAdminRes,
    todaysAttRes, lastWeekAttRes, staffPreview, auditEntries,
  ] = await Promise.all([
    supabase.from('students').select('grade_level, section').is('deleted_at', null).eq('status', 'active'),
    supabase.from('students').select('id', { count: 'exact', head: true }).is('deleted_at', null).gte('created_at', startOfMonthIso()),
    admin.from('profiles').select('id', { count: 'exact', head: true }).in('role', STAFF_ROLES),
    admin.from('profiles').select('id', { count: 'exact', head: true }).in('role', STAFF_ROLES).eq('is_active', false),
    supabase.from('attendance_records').select('status').eq('class_date', isoDate(0)),
    supabase.from('attendance_records').select('status').eq('class_date', isoDate(-7)),
    fetchStaffDirectory(),
    fetchAuditLog(7),
  ])

  const classGrid: Record<string, Record<string, number>> = {}
  for (const g of GRADES) {
    classGrid[g] = {}
    for (const s of sectionsForGrade(g)) classGrid[g][s] = 0
  }
  for (const row of studentsRes.data ?? []) {
    if (classGrid[row.grade_level] && row.section in classGrid[row.grade_level]) {
      classGrid[row.grade_level][row.section]++
    }
  }

  const gradeCounts = GRADES.map((g) => ({
    label: `Grade ${g}`,
    count: Object.values(classGrid[g]).reduce((a, b) => a + b, 0),
    color: GRADE_META[g]?.color ?? 'bg-neutral-400',
    to: GRADE_META[g]?.to ?? null,
  }))

  const totalStudents = gradeCounts.reduce((a, g) => a + g.count, 0)

  const todaysPct = attendancePct(todaysAttRes.data ?? [])
  const lastWeekPct = attendancePct(lastWeekAttRes.data ?? [])
  const attendanceDelta = todaysPct !== null && lastWeekPct !== null ? todaysPct - lastWeekPct : null

  const flaggedCount = auditEntries.filter((e) => e.flag).length

  return (
    <SuperAdminDashboardContent
      totalStudents={totalStudents}
      enrolledThisMonth={monthlyEnrollRes.count ?? 0}
      subAdminCount={subAdminCountRes.count ?? 0}
      inactiveSubAdminCount={inactiveSubAdminRes.count ?? 0}
      todaysAttendancePct={todaysPct}
      attendanceDelta={attendanceDelta}
      flaggedCount={flaggedCount}
      staffPreview={staffPreview.slice(0, 5)}
      gradeCounts={gradeCounts}
      auditEntries={auditEntries}
    />
  )
}
