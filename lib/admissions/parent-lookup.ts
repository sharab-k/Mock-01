import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

export type ParentEditContact = { id: string; name: string; email: string; phone: string; secondaryPhone: string | null; whatsapp2: string | null }

// profiles has no RLS policy letting one user read another's row, by design
// (see lib/supabase/admin.ts) — so resolving a linked student's parent for a
// staff-facing view needs the service-role client. Carries the parent's id,
// login email, and every contact field, for the student edit form's
// "Parent / Guardian" section and the directory drawer's "Login
// Credentials" block (both need the parent's id — the former to target
// updateParentContactAction, the latter setParentPasswordAction).
export async function fetchParentEditContactsByStudentId(studentIds: string[]): Promise<Map<string, ParentEditContact>> {
  const contactByStudent = new Map<string, ParentEditContact>()
  if (studentIds.length === 0) return contactByStudent

  const admin = createAdminClient()
  const { data: links } = await admin
    .from('parent_student_links')
    .select('student_id, profiles(id, full_name, email, phone, secondary_phone, whatsapp_number_2)')
    .in('student_id', studentIds)

  for (const link of links ?? []) {
    if (link.profiles) {
      contactByStudent.set(link.student_id, {
        id: link.profiles.id,
        name: link.profiles.full_name ?? '—',
        email: link.profiles.email,
        phone: link.profiles.phone ?? '',
        secondaryPhone: link.profiles.secondary_phone,
        whatsapp2: link.profiles.whatsapp_number_2,
      })
    }
  }
  return contactByStudent
}

export type ParentDirectoryRow = {
  key: string
  name: string
  email: string
  phone: string
  children: { name: string; roll: string; grade: string; section: string }[]
}

// Powers the Super Admin Parent Directory — grouped client-side from the
// join rather than a second round trip per parent, same one-call-then-group
// shape as the old lib/mock/students.ts buildParentDirectory() it replaces.
export async function fetchParentDirectory(): Promise<ParentDirectoryRow[]> {
  const admin = createAdminClient()
  const { data: links } = await admin
    .from('parent_student_links')
    .select('parent_id, profiles(full_name, email, phone), students(full_name, roll_number, grade_level, section)')

  const byParent = new Map<string, ParentDirectoryRow>()
  for (const link of links ?? []) {
    if (!link.profiles || !link.students) continue
    if (!byParent.has(link.parent_id)) {
      byParent.set(link.parent_id, {
        key: link.parent_id,
        name: link.profiles.full_name ?? '—',
        email: link.profiles.email,
        phone: link.profiles.phone ?? '—',
        children: [],
      })
    }
    byParent.get(link.parent_id)!.children.push({
      name: link.students.full_name,
      roll: link.students.roll_number,
      grade: link.students.grade_level,
      section: link.students.section,
    })
  }
  return Array.from(byParent.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export async function countParentAccounts(): Promise<number> {
  const admin = createAdminClient()
  const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'parent')
  return count ?? 0
}
