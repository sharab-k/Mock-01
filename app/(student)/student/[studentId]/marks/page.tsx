import StudentMarksContent from '@/components/dashboard/modules/StudentMarksContent'
import { requireParentAccessToChild } from '@/lib/auth/require-parent-access'
import { createClient } from '@/lib/supabase/server'
import { fetchChildAcademicData } from '@/lib/parent/child-academic-data'

export default async function StudentMarksPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  await requireParentAccessToChild(studentId)
  const supabase = await createClient()
  const { marks } = await fetchChildAcademicData(supabase, studentId)

  return <StudentMarksContent studentId={studentId} marks={marks} />
}
