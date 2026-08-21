import MarksClassDetailContent from '@/components/dashboard/modules/MarksClassDetailContent'
import { fetchClassMarks } from '@/lib/marks/class-detail'
import { GRADES, sectionsForGrade, type Grade, type Section } from '@/lib/students/constants'

export default async function ClassMarksPage({
  params,
}: {
  params: Promise<{ grade: string; section: string }>
}) {
  const { grade, section } = await params
  const isValid = GRADES.includes(grade as Grade) && sectionsForGrade(grade as Grade).includes(section as Section)
  const marks = isValid ? await fetchClassMarks(grade, section) : []

  return <MarksClassDetailContent grade={grade} section={section} basePath="/marks" marks={marks} />
}
