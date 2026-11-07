import Link from 'next/link'
import { ArrowLeft, CalendarRange, Download } from 'lucide-react'
import { GRADES, sectionsForGrade, type Grade } from '@/lib/students/constants'
import { fetchMonthlyReport } from '@/lib/attendance/monthly-report'
import { createClient } from '@/lib/supabase/server'
import ClassMonthPicker from './ClassMonthPicker'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const CELL: Record<string, string> = {
  P: 'bg-success-bg text-success',
  A: 'bg-danger-bg text-danger',
  L: 'bg-warning-bg text-warning',
  LV: 'bg-ink-100 text-ink-700',
}

type Props = { backHref: string; searchParams: { grade?: string; section?: string; month?: string } }

// Shared by the attendance portal and the Super Admin portal: pick a class and a month, read the month sheet,
// download it as Excel. Past months are read straight from the saved records, so history never goes away.
export default async function MonthlyAttendanceReport({ backHref, searchParams }: Props) {
  const now = new Date().toISOString().slice(0, 7)
  const grade = GRADES.includes(searchParams.grade as Grade) ? (searchParams.grade as string) : '9'
  const sections = sectionsForGrade(grade as Grade)
  const section = sections.includes(searchParams.section as never) ? (searchParams.section as string) : sections[0]!
  const month = searchParams.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.month) && searchParams.month <= now ? searchParams.month : now
  const asked = Boolean(searchParams.grade && searchParams.section && searchParams.month)
  const [year, m] = month.split('-').map(Number) as [number, number]

  const report = asked ? await fetchMonthlyReport(await createClient(), grade, section, year, m) : null
  const download = `/api/attendance/monthly-report?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}&month=${month}`

  return (
    <>
      <div>
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 no-underline mb-4"><ArrowLeft size={13} /> Attendance</Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center shrink-0"><CalendarRange size={18} className="text-ink-600" /></div>
          <div>
            <h1 className="text-[20px] font-bold text-neutral-900">Monthly attendance</h1>
            <p className="text-[13px] text-neutral-500 mt-0.5">Pick a class and a month to review every day, and download it as an Excel sheet.</p>
          </div>
        </div>
      </div>

      <ClassMonthPicker grade={grade} section={section} month={month} maxMonth={now} />

      {report && (
        <section className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-[15px] font-bold text-neutral-900">Grade {grade} · Section {section} · {MONTHS[m - 1]} {year}</h2>
              <p className="text-[12px] text-neutral-500 mt-0.5"><span className="font-mono">{report.students.length}</span> student{report.students.length === 1 ? '' : 's'} · P present · A absent · L late · LV leave · 3/4 = attended / periods (by-subject days) · blank = not marked</p>
            </div>
            {report.students.length > 0 && (
              <a href={download} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-700 bg-ink-50 hover:bg-ink-100 px-3 py-2 rounded-xl no-underline"><Download size={14} /> Download Excel</a>
            )}
          </div>

          {report.students.length === 0 ? (
            <p className="px-5 py-10 text-center text-[13px] text-neutral-400">No students or attendance for this class in {MONTHS[m - 1]} {year}.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="text-[12px] border-collapse">
                <thead>
                  <tr className="bg-neutral-50">
                    <th className="sticky left-0 z-10 bg-neutral-50 px-2 py-2 text-left font-semibold text-neutral-500">#</th>
                    <th className="sticky left-[34px] z-10 bg-neutral-50 px-2 py-2 text-left font-semibold text-neutral-500">GR</th>
                    <th className="sticky left-[104px] z-10 bg-neutral-50 px-2 py-2 text-left font-semibold text-neutral-500 min-w-[170px]">Name</th>
                    {report.weekdays.map((w, i) => (
                      <th key={i} className={`px-0 py-1 text-center font-mono font-semibold w-7 ${w === 'S' && new Date(Date.UTC(year, m - 1, i + 1)).getUTCDay() === 0 ? 'text-danger' : 'text-neutral-500'}`}>
                        <span className="block">{i + 1}</span><span className="block text-[9px] font-normal opacity-70">{w}</span>
                      </th>
                    ))}
                    <th className="px-2 py-2 text-center font-semibold text-success">P</th>
                    <th className="px-2 py-2 text-center font-semibold text-warning">L</th>
                    <th className="px-2 py-2 text-center font-semibold text-danger">A</th>
                    <th className="px-2 py-2 text-center font-semibold text-ink-700">LV</th>
                    <th className="px-2 py-2 text-center font-semibold text-neutral-700">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {report.students.map((s) => (
                    <tr key={s.id} className={s.inactive ? 'opacity-60' : ''}>
                      <td className="sticky left-0 bg-white px-2 py-1.5 font-mono text-neutral-400">{s.serial}</td>
                      <td className="sticky left-[34px] bg-white px-2 py-1.5 font-mono text-neutral-600 whitespace-nowrap">{s.gr || '—'}</td>
                      <td className="sticky left-[104px] bg-white px-2 py-1.5 font-medium text-neutral-900 whitespace-nowrap">{s.name}{s.inactive && <span className="ml-1.5 text-[10px] text-neutral-400">(inactive)</span>}</td>
                      {s.days.map((d, i) => (
                        <td key={i} className="p-0.5 text-center">
                          {d ? <span className={`block rounded px-0.5 py-1 font-mono text-[10.5px] font-semibold ${CELL[d] ?? 'bg-neutral-100 text-neutral-700'}`}>{d}</span> : <span className="block py-1 text-neutral-200">·</span>}
                        </td>
                      ))}
                      <td className="px-2 py-1.5 text-center font-mono text-success">{s.present}</td>
                      <td className="px-2 py-1.5 text-center font-mono text-warning">{s.late}</td>
                      <td className="px-2 py-1.5 text-center font-mono text-danger">{s.absent}</td>
                      <td className="px-2 py-1.5 text-center font-mono text-ink-700">{s.leave}</td>
                      <td className="px-2 py-1.5 text-center font-mono font-semibold">{s.pct === null ? '—' : `${s.pct}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  )
}
