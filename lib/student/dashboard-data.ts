import { createClient } from '@/lib/supabase/server'
import { fetchChildAcademicData, type ChildAcademicData } from '@/lib/parent/child-academic-data'
import { fetchStudentLectures } from './lectures'

export type LectureProgress = {
  id: string
  subject: string
  title: string
  durationSeconds: number
  watchedSeconds: number
  completed: boolean
}

export type StudentDashboardData = ChildAcademicData & {
  lectures: LectureProgress[]
}

// Runs on the parent's own RLS-scoped session for the already-verified
// linked child (requireParentAccessToChild ran in the layout above this).
export async function fetchStudentDashboardData(studentId: string): Promise<StudentDashboardData> {
  const supabase = await createClient()

  const [academic, lectures] = await Promise.all([
    fetchChildAcademicData(supabase, studentId),
    fetchStudentLectures(studentId),
  ])

  return { ...academic, lectures }
}
