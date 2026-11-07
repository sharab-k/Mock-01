import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAllRows } from '@/lib/db/fetch-all'
import type { Database } from '@/types/supabase'

export type ClassExportRow = {
  serial: number
  roll: string
  name: string
  gr: string
  contact: string
  status: 'Active' | 'Inactive'
}

/**
 * Everyone in one class section: roll number, name, GR number, the parent's contact number and whether the
 * student is active. `includeInactive` keeps students who have left, so the Status column means something.
 * Parent numbers sit in profiles, which staff cannot read through RLS, so they come from the service role —
 * only after the caller's own RLS-scoped read of the students has already succeeded.
 */
export async function fetchClassExportRows(
  supabase: SupabaseClient<Database>,
  grade: string,
  section: string,
  includeInactive: boolean,
): Promise<ClassExportRow[]> {
  const students = await fetchAllRows((from, to) => {
    let q = supabase
      .from('students')
      .select('id, roll_number, gr_number, full_name, status')
      .eq('grade_level', grade)
      .eq('section', section)
      .is('deleted_at', null)
      .order('list_sort', { ascending: true })
      .order('id')
      .range(from, to)
    if (!includeInactive) q = q.eq('status', 'active')
    return q
  })
  if (students.length === 0) return []

  const { data: links } = await createAdminClient()
    .from('parent_student_links')
    .select('student_id, profiles(phone, secondary_phone)')
    .in('student_id', students.map((s) => s.id))
  const contact = new Map<string, string>()
  for (const l of links ?? []) {
    const phone = l.profiles?.phone || l.profiles?.secondary_phone
    if (phone && !contact.has(l.student_id)) contact.set(l.student_id, phone)
  }

  return students.map((s, i) => ({
    serial: i + 1,
    roll: s.roll_number,
    name: s.full_name,
    gr: s.gr_number ?? '',
    contact: contact.get(s.id) ?? '',
    status: s.status === 'active' ? 'Active' : 'Inactive',
  }))
}
