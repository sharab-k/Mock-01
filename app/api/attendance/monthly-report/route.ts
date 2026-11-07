import { NextResponse } from 'next/server'
import { GRADES, sectionsForGrade, type Grade } from '@/lib/students/constants'
import { requireExportRole, xlsxResponse } from '@/lib/exports/auth'
import { XLSX_MIME, buildWorkbook, type SheetColumn } from '@/lib/exports/workbook'
import { fetchMonthlyReport } from '@/lib/attendance/monthly-report'
import { logAction } from '@/lib/audit/log'

export const runtime = 'nodejs'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const FILL: Record<string, string> = { P: 'FFEAF5F0', A: 'FFF7EBE9', L: 'FFF7F0E3', LV: 'FFE8EBF3' }

// A class attendance sheet for one month as Excel: serial, GR, name, one column per day, then totals.
// Super Admin and the attendance staff only.
export async function GET(request: Request) {
  const auth = await requireExportRole(request, ['super_admin', 'attendance_admin'])
  if (!auth.ok) return auth.response

  const url = new URL(request.url)
  const grade = url.searchParams.get('grade') ?? ''
  const section = url.searchParams.get('section') ?? ''
  const month = url.searchParams.get('month') ?? ''
  if (!GRADES.includes(grade as Grade) || !sectionsForGrade(grade as Grade).includes(section as never) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return NextResponse.json({ error: 'Choose a class, a section and a month.' }, { status: 400 })
  }
  const [year, m] = month.split('-').map(Number) as [number, number]

  const report = await fetchMonthlyReport(auth.supabase, grade, section, year, m)
  const dayCols: SheetColumn[] = report.weekdays.map((w, i) => ({ header: `${i + 1}\n${w}`, key: `d${i + 1}`, width: 4.5, align: 'center' }))
  const bytes = await buildWorkbook({
    title: `Attendance - ${grade} ${section} - ${MONTHS[m - 1]} ${year}`,
    sheetName: `${MONTHS[m - 1]!.slice(0, 3)} ${year} ${grade}${section}`,
    columns: [
      { header: 'Sr', key: 'serial', width: 5, align: 'center' },
      { header: 'GR No', key: 'gr', width: 12 },
      { header: 'Name', key: 'name', width: 28 },
      ...dayCols,
      { header: 'Present', key: 'present', width: 9, align: 'center' },
      { header: 'Late', key: 'late', width: 7, align: 'center' },
      { header: 'Absent', key: 'absent', width: 8, align: 'center' },
      { header: 'Leave', key: 'leave', width: 7, align: 'center' },
      { header: '%', key: 'pct', width: 7, align: 'center' },
    ],
    rows: report.students.map((s) => ({
      serial: s.serial, gr: s.gr, name: s.inactive ? `${s.name} (inactive)` : s.name,
      ...Object.fromEntries(s.days.map((d, i) => [`d${i + 1}`, d])),
      present: s.present, late: s.late, absent: s.absent, leave: s.leave, pct: s.pct === null ? '' : s.pct,
    })),
    fill: (r, key) => (/^d\d+$/.test(key) ? FILL[String(r[key])] : undefined),
  })

  await logAction(auth.supabase, auth.userId, `Exported monthly attendance - Grade ${grade} ${section} · ${MONTHS[m - 1]} ${year}`)
  return xlsxResponse(bytes, `attendance-${grade}-${section}-${month}.xlsx`, XLSX_MIME)
}
