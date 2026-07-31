import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROLE_DESTINATIONS } from './role-destinations'
import { ROLE_META } from './role-meta'
import type { UserInfo } from '@/components/dashboard/types'

function initialsFrom(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?'
}

export type LinkedStudent = {
  id: string
  full_name: string
  roll_number: string
  grade_level: string
  section: string
  program: string
  is_late_enrollment: boolean
}

// Replaces the dead requireRole('student') guard (CLAUDE.md §4: no separate
// student login ever gets created, so that check could never succeed). The
// `(student)` route group is reached through the signed-in PARENT's session
// for one specific linked child — this confirms both "is this a parent" and
// "is this specific studentId actually theirs," redirecting away on either
// failure rather than leaking which children exist. The parent_student_links
// lookup runs on the caller's own RLS-scoped session, so even if this check
// were accidentally skipped, RLS itself would still block a mismatched
// studentId — this is the UX layer on top of that real boundary (golden rule 8).
export async function requireParentAccessToChild(studentId: string): Promise<{ user: UserInfo; student: LinkedStudent }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login?error=no_role')
  if (profile.role !== 'parent') redirect(ROLE_DESTINATIONS[profile.role] ?? '/login?error=no_role')

  const { data: link } = await supabase
    .from('parent_student_links')
    .select('student_id')
    .eq('parent_id', user.id)
    .eq('student_id', studentId)
    .maybeSingle()

  if (!link) redirect('/parent')

  const { data: student } = await supabase
    .from('students')
    .select('id, full_name, roll_number, grade_level, section, program, is_late_enrollment')
    .eq('id', studentId)
    .single()

  if (!student) redirect('/parent')

  const meta = ROLE_META.parent
  const name = profile.full_name ?? profile.email

  const userInfo: UserInfo = {
    name,
    email: profile.email,
    role: profile.role,
    roleLabel: meta.label,
    roleColor: meta.color,
    initials: initialsFrom(name),
  }

  return { user: userInfo, student }
}

// Used by the bare /student redirect page — finds the parent's first linked
// child (there is always at least one by the time this route is reachable;
// a parent account only exists because admissions created it alongside a
// student, per CLAUDE.md §4) so `/student` always lands somewhere valid.
export async function requireParentWithChildren(): Promise<{ userId: string; firstStudentId: string | null }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login?error=no_role')
  if (profile.role !== 'parent') redirect(ROLE_DESTINATIONS[profile.role] ?? '/login?error=no_role')

  const { data: links } = await supabase
    .from('parent_student_links')
    .select('student_id')
    .eq('parent_id', user.id)
    .limit(1)

  return { userId: user.id, firstStudentId: links?.[0]?.student_id ?? null }
}
