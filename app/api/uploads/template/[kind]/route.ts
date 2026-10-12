import { NextResponse } from 'next/server'

const TEMPLATES: Record<string, { file: string; body: string }> = {
  marks: {
    file: 'marks-upload-template.csv',
    body: [
      'GR No,Roll No,Student Name,Subject,Exam,Marks,Total,Exam Date',
      'EXAMPLE-1,EX-1,Example Student,Mathematics,Monthly,42,50,15/09/2026',
      'EXAMPLE-1,EX-1,Example Student,ENGLISH,Half-Yearly,71,100,05/10/2026',
    ].join('\r\n'),
  },
  attendance: {
    file: 'attendance-upload-template.csv',
    body: [
      'GR No,Roll No,Student Name,Date,Status',
      'EXAMPLE-1,EX-1,Example Student,01/10/2026,Present',
      'EXAMPLE-1,EX-1,Example Student,02/10/2026,Absent',
      'EXAMPLE-1,EX-1,Example Student,03/10/2026,Late',
    ].join('\r\n'),
  },
}

export async function GET(_req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const t = TEMPLATES[(await params).kind]
  if (!t) return NextResponse.json({ error: 'Unknown template.' }, { status: 404 })
  return new NextResponse(t.body + '\r\n', {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${t.file}"` },
  })
}
