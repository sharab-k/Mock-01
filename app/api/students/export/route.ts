import { NextResponse } from 'next/server'
import { GRADES, sectionsForGrade, type Grade } from '@/lib/students/constants'
import { requireExportRole, xlsxResponse } from '@/lib/exports/auth'
import { fetchClassExportRows } from '@/lib/exports/class-students'
import { XLSX_MIME, buildWorkbook } from '@/lib/exports/workbook'
import { logAction } from '@/lib/audit/log'

export const runtime = 'nodejs'

// One class section as an Excel sheet (e.g. grade 9, section G1): Roll No, Name, GR Number, Contact, Status.
// ?active=1 leaves out students who have left; by default they are included, marked Inactive.
export async function GET(request: Request) {
  const auth = await requireExportRole(request, ['super_admin', 'admissions_admin', 'attendance_admin', 'marks_admin'])
  if (!auth.ok) return auth.response

  const url = new URL(request.url)
  const grade = url.searchParams.get('grade') ?? ''
  const section = url.searchParams.get('section') ?? ''
  if (!GRADES.includes(grade as Grade) || !sectionsForGrade(grade as Grade).includes(section as never)) {
    return NextResponse.json({ error: 'Choose a valid class and section.' }, { status: 400 })
  }
  const activeOnly = url.searchParams.get('active') === '1'

  const rows = await fetchClassExportRows(auth.supabase, grade, section, !activeOnly)
  const bytes = await buildWorkbook({
    title: `Students - ${grade} ${section}`,
    sheetName: `${grade} ${section}`,
    columns: [
      { header: 'Sr', key: 'serial', width: 6, align: 'center' },
      { header: 'Roll No', key: 'roll', width: 16 },
      { header: 'Name', key: 'name', width: 32 },
      { header: 'GR Number', key: 'gr', width: 14 },
      { header: 'Contact', key: 'contact', width: 18 },
      { header: 'Status', key: 'status', width: 11, align: 'center' },
    ],
    rows: rows.map((r) => ({ ...r })),
    fill: (r, key) => (key === 'status' ? (r.status === 'Active' ? 'FFEAF5F0' : 'FFF7EBE9') : undefined),
  })

  await logAction(auth.supabase, auth.userId, `Exported class list - Grade ${grade} ${section} · ${rows.length} students`)
  return xlsxResponse(bytes, `students-${grade}-${section}.xlsx`, XLSX_MIME)
}
