import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { parentsWithStoredPassword } from '@/lib/auth/credential-vault'
import { fetchAllRows } from '@/lib/db/fetch-all'

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
  // .in() puts every id in the request URL — a whole school's worth overflows it —
  // so ask in batches, all at once.
  const BATCH = 100
  const batches: string[][] = []
  for (let i = 0; i < studentIds.length; i += BATCH) batches.push(studentIds.slice(i, i + BATCH))
  const results = await Promise.all(batches.map((ids) =>
    admin
      .from('parent_student_links')
      .select('student_id, profiles(id, full_name, email, phone, secondary_phone, whatsapp_number_2)')
      .in('student_id', ids),
  ))

  for (const { data: links } of results) {
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
  }
  return contactByStudent
}

// Every student's parent contact in ONE paged read (no id list in the URL, no
// dependency on a prior student query) — lets the Student Directory fetch its
// students, contacts and fees together.
export async function fetchAllParentEditContacts(): Promise<Map<string, ParentEditContact>> {
  const admin = createAdminClient()
  const links = await fetchAllRows((from, to) =>
    admin
      .from('parent_student_links')
      .select('student_id, profiles(id, full_name, email, phone, secondary_phone, whatsapp_number_2)')
      .order('student_id')
      .order('parent_id')
      .range(from, to),
  )
  const contactByStudent = new Map<string, ParentEditContact>()
  for (const link of links) {
    if (link.profiles && !contactByStudent.has(link.student_id)) {
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
  /** The login username (a synthetic institutional email for parents). */
  email: string
  phone: string
  secondaryPhone: string | null
  whatsapp2: string | null
  isActive: boolean
  createdAt: string
  /** A recoverable password is on record, so "Show password" will work. */
  hasStoredPassword: boolean
  children: { name: string; roll: string; grNumber: string | null; grade: string; section: string }[]
}

// Powers the Super Admin Parent Directory — grouped client-side from the
// join rather than a second round trip per parent, same one-call-then-group
// shape as the old lib/mock/students.ts buildParentDirectory() it replaces.
export async function fetchParentDirectory(): Promise<ParentDirectoryRow[]> {
  const admin = createAdminClient()
  // Paged: PostgREST cuts a single response at 1,000 rows without saying so.
  const links = await fetchAllRows((from, to) =>
    admin
      .from('parent_student_links')
      .select('parent_id, profiles(full_name, email, phone, secondary_phone, whatsapp_number_2, is_active, created_at), students(full_name, roll_number, gr_number, grade_level, section)')
      .order('parent_id')
      .order('student_id')
      .range(from, to),
  )

  const byParent = new Map<string, ParentDirectoryRow>()
  for (const link of links) {
    if (!link.profiles || !link.students) continue
    if (!byParent.has(link.parent_id)) {
      byParent.set(link.parent_id, {
        key: link.parent_id,
        name: link.profiles.full_name ?? '—',
        email: link.profiles.email,
        phone: link.profiles.phone ?? '—',
        secondaryPhone: link.profiles.secondary_phone,
        whatsapp2: link.profiles.whatsapp_number_2,
        isActive: link.profiles.is_active,
        createdAt: link.profiles.created_at,
        hasStoredPassword: false,
        children: [],
      })
    }
    byParent.get(link.parent_id)!.children.push({
      name: link.students.full_name,
      roll: link.students.roll_number,
      grNumber: link.students.gr_number,
      grade: link.students.grade_level,
      section: link.students.section,
    })
  }
  const stored = await parentsWithStoredPassword(Array.from(byParent.keys()))
  for (const [id, p] of byParent) p.hasStoredPassword = stored.has(id)

  // Siblings in roll-number order within each family, families alphabetical.
  for (const p of byParent.values()) p.children.sort((a, b) => a.roll.localeCompare(b.roll, undefined, { numeric: true }))
  return Array.from(byParent.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export async function countParentAccounts(): Promise<number> {
  const admin = createAdminClient()
  const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'parent')
  return count ?? 0
}
