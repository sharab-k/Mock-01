import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { fetchStudentRecord } from '@/lib/students/record'
import { gradeTextClass } from '@/lib/marks/letter-grade'
import ReportDownloadButton from '@/components/dashboard/ReportDownloadButton'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const fmtDate = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const monthKey = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`
const STATUS_CLASS = { present: 'bg-success-bg text-success', absent: 'bg-danger-bg text-danger', late: 'bg-warning-bg text-warning' } as const

function groupBy<T>(items: T[], key: (t: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>()
  for (const i of items) {
    const k = key(i)
    map.set(k, [...(map.get(k) ?? []), i])
  }
  return Array.from(map)
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-neutral-900">{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, value, mono }: { label: string; value: string | number | null | undefined; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-neutral-600">{label}</dt>
      <dd className={`text-sm text-neutral-900 ${mono ? 'font-mono' : ''}`}>{value === null || value === undefined || value === '' ? '—' : value}</dd>
    </div>
  )
}

export default async function StudentRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const res = await fetchStudentRecord(id)
  if (!res.ok) notFound()
  const { student: s, parents, subjects, attendance, marks, marksSummary, fees } = res.record
  const attByMonth = groupBy(attendance.days, (d) => monthKey(d.date))
  const marksByMonth = groupBy(marks, (m) => monthKey(m.date))

  return (
    <div className="max-w-4xl space-y-4">
      <Link href="/super-admin/search" className="inline-flex items-center gap-1 text-sm text-ink-700 hover:underline"><ArrowLeft className="h-4 w-4" /> Back to search</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{s.fullName}</h1>
          <p className="font-mono text-xs text-neutral-600">GR {s.grNumber ?? '—'} · Roll {s.rollNumber} · Grade {s.grade}-{s.section}</p>
        </div>
        <ReportDownloadButton studentId={s.id} variant="full" />
      </div>

      <Section title="Profile">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Programme" value={s.program} />
          <Field label="Stream" value={s.stream} />
          <Field label="Status" value={s.status} />
          <Field label="Enrolled" value={fmtDate(s.enrollmentDate)} mono />
          <Field label="Registration no." value={s.registrationNumber} mono />
          <Field label="Late enrollment" value={s.isLateEnrollment ? 'Yes' : 'No'} />
          <Field label="Address" value={s.address} />
          <Field label="Guardian profession" value={s.guardianProfession} />
          <Field label="Previous school" value={s.previousSchool} />
          <Field label="Last qualification" value={s.lastQualification} />
          <Field label="Registration fee" value={s.registrationFee} mono />
          <Field label="Tuition fee" value={s.tuitionFee} mono />
        </dl>
      </Section>

      <Section title="Parents">
        {parents.length === 0 ? <p className="text-sm text-neutral-600">No parent account linked.</p> : (
          <ul className="space-y-2">
            {parents.map((p) => (
              <li key={p.email} className="text-sm text-neutral-900">
                <span className="font-medium">{p.name}</span> · <span className="font-mono">{p.email}</span> · <span className="font-mono">{p.phone}</span>
                {p.secondaryPhone ? <span className="font-mono"> · {p.secondaryPhone}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Subjects">
        {subjects.length === 0 ? <p className="text-sm text-neutral-600">No subjects on file.</p> : (
          <p className="text-sm text-neutral-900">{subjects.map((x) => x.name).join(' · ')}</p>
        )}
      </Section>

      <Section title={`Attendance — ${attendance.summary.total} days recorded`}>
        <div className="mb-3 flex flex-wrap gap-4 text-sm">
          <span className="text-success">Present {attendance.summary.present}</span>
          <span className="text-warning">Late {attendance.summary.late}</span>
          <span className="text-danger">Absent {attendance.summary.absent}</span>
          <span className="font-mono text-neutral-900">{attendance.summary.pct === null ? '—' : `${attendance.summary.pct}%`}</span>
        </div>
        {attByMonth.length === 0 ? <p className="text-sm text-neutral-600">No attendance recorded yet.</p> : attByMonth.map(([month, days], i) => (
          <details key={month} className="border-t border-neutral-200 py-2" open={i === 0}>
            <summary className="cursor-pointer text-sm font-medium text-neutral-900">
              {month} <span className="font-normal text-neutral-600">· {days.filter((d) => d.status !== 'absent').length}/{days.length} attended</span>
            </summary>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {days.map((d) => (
                <span key={d.date} className={`rounded px-2 py-0.5 font-mono text-xs ${STATUS_CLASS[d.status]}`} title={d.status}>{d.date.slice(8)} {d.status[0].toUpperCase()}</span>
              ))}
            </div>
          </details>
        ))}
      </Section>

      <Section title={`Marks — ${marks.length} results${marksSummary.average !== null ? ` · average ${marksSummary.average}% (${marksSummary.grade})` : ''}`}>
        {marksSummary.bySubject.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {marksSummary.bySubject.map((b) => (
              <span key={b.subject} className="rounded bg-neutral-100 px-2 py-1 text-xs text-neutral-900">
                {b.subject} <span className="font-mono">{b.average}%</span> <span className={gradeTextClass(b.grade)}>{b.grade}</span>
              </span>
            ))}
          </div>
        )}
        {marksByMonth.length === 0 ? <p className="text-sm text-neutral-600">No marks recorded yet.</p> : marksByMonth.map(([month, rows]) => (
          <div key={month} className="border-t border-neutral-200 py-2">
            <p className="mb-1 text-sm font-medium text-neutral-900">{month}</p>
            <table className="w-full text-sm">
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} className="text-neutral-900">
                    <td className="w-28 py-1 font-mono text-xs text-neutral-600">{fmtDate(m.date)}</td>
                    <td className="py-1">{m.subject}<span className="text-neutral-600"> · {m.title}</span></td>
                    <td className="py-1 text-right font-mono">{m.score}/{m.max}</td>
                    <td className="w-14 py-1 text-right font-mono">{Math.round(m.pct)}%</td>
                    <td className={`w-12 py-1 text-right font-medium ${gradeTextClass(m.grade)}`}>{m.grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </Section>

      <Section title="Fee history">
        {fees.length === 0 ? <p className="text-sm text-neutral-600">No fee records.</p> : (
          <div className="flex flex-wrap gap-1.5">
            {fees.map((f) => (
              <span key={`${f.year}-${f.month}`} className={`rounded px-2 py-0.5 text-xs ${f.status === 'paid' ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'}`}>
                {MONTHS[f.month - 1].slice(0, 3)} {f.year} · {f.status}
              </span>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
