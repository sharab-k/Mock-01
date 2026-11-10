import { NextResponse } from 'next/server'
import { authorizeCard, loadCardStudent } from '@/lib/cards/access'
import { buildCardData } from '@/lib/cards/build'
import { groupsForGrade, isGroupForGrade } from '@/lib/cards/groups'
import { renderStudentCardPdf } from '@/lib/cards/student-card'

export const runtime = 'nodejs'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeCard(request, params)
  if ('error' in auth) return auth.error
  const student = await loadCardStudent(auth.studentId)
  if (!student) return NextResponse.json({ error: 'Student not found.' }, { status: 404 })

  // The group is part of the card, so a card is only produced once it has been chosen (and fits the student's class).
  if (!student.card_group || !isGroupForGrade(student.grade_level, student.card_group)) {
    return NextResponse.json(
      { code: 'group_required', error: 'Choose the group before the card can be shown, downloaded or printed.', options: groupsForGrade(student.grade_level) },
      { status: 409 },
    )
  }

  const [card] = await buildCardData([student])
  const pdf = await renderStudentCardPdf(card)
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="id-card-${student.roll_number}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
