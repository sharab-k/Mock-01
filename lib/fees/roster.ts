import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

export type FeeRosterRow = {
  id: string
  full_name: string
  roll_number: string
  gr_number: string | null
  grade: string
  section: string
  status: 'paid' | 'unpaid'
}

// Absence of a fee_payments row for (student, year, month) means unpaid —
// rows only get created once a status is actually set (see
// lib/actions/fees.ts's setFeeStatusAction), so a fresh month starts with
// every active student defaulting to unpaid rather than needing a seed job.
// Accepts an optional bearer-scoped client override so the mobile API route
// (no cookies, only a bearer token) can reuse this instead of the cookie
// client, same pattern as fetchClassRoster/enrolStudentAction.
export async function fetchFeeRoster(
  year: number,
  month: number,
  supabaseOverride?: SupabaseClient<Database>,
): Promise<FeeRosterRow[]> {
  const supabase = supabaseOverride ?? await createClient()

  const [studentsRes, paymentsRes] = await Promise.all([
    supabase
      .from('students')
      .select('id, roll_number, gr_number, full_name, grade_level, section')
      .is('deleted_at', null)
      .eq('status', 'active')
      .order('gr_number', { ascending: true }),
    supabase
      .from('fee_payments')
      .select('student_id, status')
      .eq('year', year)
      .eq('month', month),
  ])

  const statusByStudent = new Map((paymentsRes.data ?? []).map((p) => [p.student_id, p.status]))

  return (studentsRes.data ?? []).map((s) => ({
    id: s.id,
    full_name: s.full_name,
    roll_number: s.roll_number,
    gr_number: s.gr_number,
    grade: s.grade_level,
    section: s.section,
    status: statusByStudent.get(s.id) ?? 'unpaid',
  }))
}
