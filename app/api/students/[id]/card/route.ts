import { NextResponse } from 'next/server'
import { authorizeCard, loadCardStudent } from '@/lib/cards/access'
import { downloadPhoto } from '@/lib/cards/storage'
import { gradeLabel, sessionLabel } from '@/lib/cards/card-data'
import { renderStudentCardPdf } from '@/lib/cards/student-card'

export const runtime = 'nodejs'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeCard(request, params)
  if ('error' in auth) return auth.error
  const student = await loadCardStudent(auth.studentId)
  if (!student) return NextResponse.json({ error: 'Student not found.' }, { status: 404 })

  const photo = student.photo_path ? await downloadPhoto(student.photo_path) : null
  const pdf = await renderStudentCardPdf({
    fullName: student.full_name,
    grNumber: student.gr_number || student.roll_number,
    gradeLabel: gradeLabel(student.grade_level),
    section: student.section,
    session: sessionLabel(student.academic_year),
    photoJpeg: photo ? new Uint8Array(photo) : null,
  })
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="id-card-${student.roll_number}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
