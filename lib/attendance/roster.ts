import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { RosterStudent, Status } from '@/components/dashboard/modules/AttendanceClassDetailContent'
import type { Database } from '@/types/supabase'

import { todayIso } from '@/lib/attendance/class-date'

// supabaseOverride lets the mobile app's bearer-authed GET route (Phase 0's
// pattern, app/api/mobile/attendance/class-roster) reuse this exact query
// instead of re-implementing it — the admin-client enrichment below (parent
// phone, alert status) stays server-side either way, since that key can
// never ship to a mobile bundle.
export async function fetchClassRoster(grade: string, section: string, supabaseOverride?: SupabaseClient<Database>, classDateOverride?: string): Promise<RosterStudent[]> {
  const supabase = supabaseOverride ?? await createClient()
  const classDate = classDateOverride ?? todayIso()

  const { data: students } = await supabase
    .from('students')
    .select('id, roll_number, full_name, grade_level, section')
    .eq('grade_level', grade)
    .eq('section', section)
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('roll_sort', { ascending: true })

  const studentIds = (students ?? []).map((s) => s.id)
  if (studentIds.length === 0) return []

  const [todayRes, termRes] = await Promise.all([
    supabase.from('attendance_records').select('student_id, status').eq('class_date', classDate).in('student_id', studentIds),
    supabase.from('attendance_records').select('student_id, status').in('student_id', studentIds),
  ])

  // profiles has no RLS policy letting staff read another user's row (see
  // lib/supabase/admin.ts) — same constraint the admissions module already
  // works around with the service-role client.
  const admin = createAdminClient()
  const { data: links } = await admin.from('parent_student_links').select('student_id, profiles(phone)').in('student_id', studentIds)
  const phoneByStudent = new Map<string, string | null>()
  for (const link of links ?? []) phoneByStudent.set(link.student_id, link.profiles?.phone ?? null)
  const hasParent = new Set((links ?? []).map((l) => l.student_id))

  // Whether today's absence notice reached the parent's portal inbox — raised
  // by the database event when the student was marked absent. This is what
  // decides "Notified".
  const { data: portalToday } = await admin
    .from('portal_notifications')
    .select('student_id')
    .eq('kind', 'absence')
    .in('student_id', studentIds)
    .gte('created_at', `${classDate}T00:00:00.000Z`)
    .lt('created_at', classDate === todayIso() ? `${classDate}T23:59:59.999Z` : '9999-12-31T00:00:00.000Z')
  const notifiedInPortal = new Set((portalToday ?? []).map((r) => r.student_id))

  const statusByStudent = new Map<string, Status>()
  for (const row of todayRes.data ?? []) statusByStudent.set(row.student_id, row.status as Status)

  const termStatsByStudent = new Map<string, { present: number; absent: number; late: number; total: number }>()
  for (const row of termRes.data ?? []) {
    const cur = termStatsByStudent.get(row.student_id) ?? { present: 0, absent: 0, late: 0, total: 0 }
    cur[row.status as 'present' | 'absent' | 'late']++
    cur.total++
    termStatsByStudent.set(row.student_id, cur)
  }

  return (students ?? []).map((s) => {
    const phone = phoneByStudent.get(s.id) ?? null
    return {
      id: s.id,
      name: s.full_name,
      roll: s.roll_number,
      grade: s.grade_level,
      section: s.section,
      status: statusByStudent.get(s.id) ?? 'unmarked',
      parentPhone: phone,
      hasParent: hasParent.has(s.id),
      alertStatus: notifiedInPortal.has(s.id) ? 'sent' : null,
      termAttendance: termStatsByStudent.get(s.id) ?? { present: 0, absent: 0, late: 0, total: 0 },
    }
  })
}
