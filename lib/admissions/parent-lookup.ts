import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

// profiles has no RLS policy letting one user read another's row, by design
// (see lib/supabase/admin.ts) — so resolving "which parent is linked to this
// student" for a staff-facing list view needs the service-role client, same
// as enrolStudentAction's existing parent lookup/creation.
export async function fetchParentNamesByStudentId(studentIds: string[]): Promise<Map<string, string | null>> {
  const parentByStudent = new Map<string, string | null>()
  if (studentIds.length === 0) return parentByStudent

  const admin = createAdminClient()
  const { data: links } = await admin
    .from('parent_student_links')
    .select('student_id, profiles(full_name)')
    .in('student_id', studentIds)

  for (const link of links ?? []) parentByStudent.set(link.student_id, link.profiles?.full_name ?? null)
  return parentByStudent
}

// Same rationale as fetchParentNamesByStudentId — needed by Admissions
// Admin's student directory to target a "reset parent password" action at a
// specific parent_id (Admissions Admin has no separate parent directory
// page, unlike Super Admin's fetchParentDirectory() below).
export async function fetchParentIdsByStudentId(studentIds: string[]): Promise<Map<string, string>> {
  const parentIdByStudent = new Map<string, string>()
  if (studentIds.length === 0) return parentIdByStudent

  const admin = createAdminClient()
  const { data: links } = await admin
    .from('parent_student_links')
    .select('student_id, parent_id')
    .in('student_id', studentIds)

  for (const link of links ?? []) parentIdByStudent.set(link.student_id, link.parent_id)
  return parentIdByStudent
}

export type ParentContact = { name: string; phone: string }

// Same rationale as fetchParentNamesByStudentId — service-role client needed
// to cross a profiles row that isn't the caller's own — but also carries
// phone, for staff-facing views (Super Admin student/parent directories)
// that need to show contact info, not just a name.
export async function fetchParentContactsByStudentId(studentIds: string[]): Promise<Map<string, ParentContact>> {
  const contactByStudent = new Map<string, ParentContact>()
  if (studentIds.length === 0) return contactByStudent

  const admin = createAdminClient()
  const { data: links } = await admin
    .from('parent_student_links')
    .select('student_id, profiles(full_name, phone)')
    .in('student_id', studentIds)

  for (const link of links ?? []) {
    if (link.profiles) {
      contactByStudent.set(link.student_id, { name: link.profiles.full_name ?? '—', phone: link.profiles.phone ?? '—' })
    }
  }
  return contactByStudent
}

export type ParentEditContact = { id: string; name: string; phone: string; secondaryPhone: string | null; whatsapp2: string | null }

// Same rationale as fetchParentContactsByStudentId — carries the parent's
// id and every contact field, for the student edit form's "Parent /
// Guardian" section (updateParentContactAction needs the parent's id to
// target the right profiles row).
export async function fetchParentEditContactsByStudentId(studentIds: string[]): Promise<Map<string, ParentEditContact>> {
  const contactByStudent = new Map<string, ParentEditContact>()
  if (studentIds.length === 0) return contactByStudent

  const admin = createAdminClient()
  const { data: links } = await admin
    .from('parent_student_links')
    .select('student_id, profiles(id, full_name, phone, secondary_phone, whatsapp_number_2)')
    .in('student_id', studentIds)

  for (const link of links ?? []) {
    if (link.profiles) {
      contactByStudent.set(link.student_id, {
        id: link.profiles.id,
        name: link.profiles.full_name ?? '—',
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
    .select('parent_id, profiles(full_name, phone), students(full_name, roll_number, grade_level, section)')

  const byParent = new Map<string, ParentDirectoryRow>()
  for (const link of links ?? []) {
    if (!link.profiles || !link.students) continue
    if (!byParent.has(link.parent_id)) {
      byParent.set(link.parent_id, {
        key: link.parent_id,
        name: link.profiles.full_name ?? '—',
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
