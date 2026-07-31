import { redirect } from 'next/navigation'
import { requireParentWithChildren } from '@/lib/auth/require-parent-access'

// Bare /student has no selected child — land on the parent's first linked
// child. A parent account only ever exists because admissions created it
// alongside a student (CLAUDE.md §4), so there's always at least one, but
// guard the empty case anyway rather than assume it.
export default async function StudentEntryPage() {
  const { firstStudentId } = await requireParentWithChildren()

  if (!firstStudentId) redirect('/parent')
  redirect(`/student/${firstStudentId}`)
}
