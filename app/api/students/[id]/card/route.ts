import { NextResponse } from 'next/server'
import { authorizeCard, loadCardStudent } from '@/lib/cards/access'
import { buildCardData } from '@/lib/cards/build'
import { renderStudentCardPdf } from '@/lib/cards/student-card'

export const runtime = 'nodejs'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeCard(request, params)
  if ('error' in auth) return auth.error
  const student = await loadCardStudent(auth.studentId)
  if (!student) return NextResponse.json({ error: 'Student not found.' }, { status: 404 })

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
