import MarksClassDetailContent from '@/components/dashboard/modules/MarksClassDetailContent'
import { fetchClassMarks } from '@/lib/marks/class-detail'
import { sectionsForGrade, type Grade, type Section } from '@/lib/students/constants'

const VALID_GRADES = ['9', '10', '11', '12']

export default async function ClassMarksPage({
  params,
}: {
  params: Promise<{ grade: string; section: string }>
}) {
  const { grade, section } = await params
  const isValid = VALID_GRADES.includes(grade) && sectionsForGrade(grade as Grade).includes(section as Section)
  const marks = isValid ? await fetchClassMarks(grade, section) : []

  return <MarksClassDetailContent grade={grade} section={section} basePath="/marks" marks={marks} />
}
