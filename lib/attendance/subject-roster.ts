import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { FIRST_YEAR_GRADE, isUnplaced, studentInSubjectList, type Faculty, type SubjectGrade } from '@/lib/attendance/first-year-subjects'
import type { Database } from '@/types/supabase'

export type SubjectStatus = 'unmarked' | 'present' | 'absent' | 'late' | 'leave'

export type SubjectRosterStudent = {
  id: string
  name: string
  roll: string
  gr: string | null
  /** The student's faculty (students.stream); null when it was never recorded. */
  stream: string | null
  status: SubjectStatus
  /** Today's absence notice for this subject reached a parent's portal inbox. */
  notified: boolean
}

export type SubjectRoster = {
  students: SubjectRosterStudent[]
  /** Students in the class with no faculty on record who can't be placed in this subject. */
  unplaced: number
}

// Who appears for attendance when a class, date, (optional) faculty and subject are
// chosen: only First or Second Year students of that section who study that subject, with the
// status already marked for that subject on that date. `supabaseOverride` lets the
// mobile app's bearer-authed route reuse this exact query.
export async function fetchSubjectRoster(
  input: { section: string; classDate: string; subject: string; faculty: Faculty | null; grade?: SubjectGrade },
  supabaseOverride?: SupabaseClient<Database>,
): Promise<SubjectRoster> {
  const supabase = supabaseOverride ?? await createClient()
  const grade = input.grade ?? FIRST_YEAR_GRADE

  const { data: all } = await supabase
    .from('students')
    .select('id, roll_number, gr_number, full_name, stream')
    .eq('grade_level', grade)
    .eq('section', input.section)
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('list_sort', { ascending: true })

  const everyone = all ?? []
  const listed = everyone.filter((s) => studentInSubjectList(s.stream, input.subject, input.faculty, grade))
  const unplaced = input.faculty ? 0 : everyone.filter((s) => isUnplaced(s.stream, input.subject, grade)).length
  if (listed.length === 0) return { students: [], unplaced }

  const ids = listed.map((s) => s.id)
  const [recordsRes, noticesRes] = await Promise.all([
    supabase.from('attendance_records').select('student_id, status').eq('class_date', input.classDate).eq('subject', input.subject).in('student_id', ids),
    // profiles/portal_notifications are not readable by staff directly (see lib/supabase/admin.ts).
    createAdminClient()
      .from('portal_notifications')
      .select('student_id')
      .eq('kind', 'absence')
      .in('student_id', ids)
      .like('body', `%from the ${input.subject} class%`)
      .gte('created_at', `${input.classDate}T00:00:00.000Z`),
  ])

  const statusById = new Map((recordsRes.data ?? []).map((r) => [r.student_id, r.status as SubjectStatus]))
  const notified = new Set((noticesRes.data ?? []).map((n) => n.student_id))

  return {
    unplaced,
    students: listed.map((s) => ({
      id: s.id,
      name: s.full_name,
      roll: s.roll_number,
      gr: s.gr_number,
      stream: s.stream,
      status: statusById.get(s.id) ?? 'unmarked',
      notified: notified.has(s.id),
    })),
  }
}
