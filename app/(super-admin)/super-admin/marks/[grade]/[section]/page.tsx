import MarksClassDetailContent from '@/components/dashboard/modules/MarksClassDetailContent'
import { fetchClassMarks } from '@/lib/marks/class-detail'

const VALID_GRADES = ['9', '10', '11', '12']
const VALID_SECTIONS = ['A', 'B', 'C', 'D']

export default async function SuperAdminMarksClassPage({
  params,
}: {
  params: Promise<{ grade: string; section: string }>
}) {
  const { grade, section } = await params
  const isValid = VALID_GRADES.includes(grade) && VALID_SECTIONS.includes(section)
  const marks = isValid ? await fetchClassMarks(grade, section) : []

  return <MarksClassDetailContent grade={grade} section={section} basePath="/super-admin/marks" marks={marks} />
}
