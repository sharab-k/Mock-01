import { createClient } from '@/lib/supabase/server'
import { fetchChildAcademicData, type AttStatus } from './child-academic-data'
import type { Tier } from '@/lib/marks/tier'

const INITIALS = (name: string) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

export type { AttStatus }

export type ParentChild = {
  id: string
  name: string
  roll: string
  grade: string
  section: string
  initials: string
  gradeVal: string
  tier: Tier | null
  attendancePct: number
  avgScore: number
  marks: { subject: string; exam: string; score: number; max: number; grade: string }[]
  attendance: { day: string; date: string; status: AttStatus }[]
  monthlyTrend: { month: string; attendance: number; avgScore: number }[]
}

// Every query here runs on the signed-in parent's own RLS-scoped session —
// parent_read_linked_children_* policies (students, attendance_records,
// marks) are what actually authorize this, not application logic. This is
// the single most security-sensitive read path in the app (CLAUDE.md §12):
// a parent must only ever be able to name their OWN linked children here.
export async function fetchParentChildren(): Promise<ParentChild[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: links } = await supabase
    .from('parent_student_links')
    .select('students(id, full_name, roll_number, grade_level, section)')
    .eq('parent_id', user.id)

  const students = (links ?? [])
    .map((l) => l.students)
    .filter((s): s is NonNullable<typeof s> => !!s)

  const children: ParentChild[] = []
  for (const s of students) {
    const academic = await fetchChildAcademicData(supabase, s.id)
    children.push({
      id: s.id,
      name: s.full_name,
      roll: s.roll_number,
      grade: s.grade_level,
      section: s.section,
      initials: INITIALS(s.full_name),
      ...academic,
    })
  }

  return children
}
