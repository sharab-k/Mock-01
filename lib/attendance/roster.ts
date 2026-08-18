import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { absenceAlertPrefix } from '@/lib/notifications/message-templates'
import type { RosterStudent, Status } from '@/components/dashboard/modules/AttendanceClassDetailContent'
import type { Database } from '@/types/supabase'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

// supabaseOverride lets the mobile app's bearer-authed GET route (Phase 0's
// pattern, app/api/mobile/attendance/class-roster) reuse this exact query
// instead of re-implementing it — the admin-client enrichment below (parent
// phone, alert status) stays server-side either way, since that key can
// never ship to a mobile bundle.
export async function fetchClassRoster(grade: string, section: string, supabaseOverride?: SupabaseClient<Database>): Promise<RosterStudent[]> {
  const supabase = supabaseOverride ?? await createClient()
  const classDate = today()

  const { data: students } = await supabase
    .from('students')
    .select('id, roll_number, full_name, grade_level, section')
    .eq('grade_level', grade)
    .eq('section', section)
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('full_name', { ascending: true })

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

  // Today's alert outcome, surfaced so the admin knows to call a parent
  // directly if Twilio failed. notification_log has no student_id column
  // (matches CLAUDE.md §5's schema exactly) and siblings can share one
  // parent phone, so recipient alone can't disambiguate whose alert this
  // was — the payload text (which embeds the student's name, see
  // lib/notifications/send-notification.ts) is what disambiguates.
  const todayPhones = Array.from(new Set(Array.from(phoneByStudent.values()).filter((p): p is string => !!p)))
  const alertRows: { recipient: string; status: 'sent' | 'failed'; payload: string }[] = []
  if (todayPhones.length > 0) {
    const { data: alerts } = await admin
      .from('notification_log')
      .select('recipient, status, payload, sent_at')
      .in('recipient', todayPhones)
      .gte('sent_at', `${classDate}T00:00:00.000Z`)
      .lt('sent_at', `${classDate}T23:59:59.999Z`)
      .order('sent_at', { ascending: true })
    if (alerts) alertRows.push(...alerts)
  }
  function alertStatusFor(phone: string | null, studentName: string): 'sent' | 'failed' | null {
    if (!phone) return null
    const prefix = absenceAlertPrefix(studentName)
    const match = alertRows.find((r) => r.recipient === phone && r.payload.startsWith(prefix))
    return match?.status ?? null
  }

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
      alertStatus: alertStatusFor(phone, s.full_name),
      termAttendance: termStatsByStudent.get(s.id) ?? { present: 0, absent: 0, late: 0, total: 0 },
    }
  })
}
