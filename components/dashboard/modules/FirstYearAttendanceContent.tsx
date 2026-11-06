'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, XCircle, Clock3, Send, AlertTriangle, MessageSquare, Loader2 } from 'lucide-react'
import { submitClassAttendanceAction } from '@/lib/actions/attendance'
import { FACULTIES, YEAR_LABEL, YEAR_SLUG, subjectsForFaculty } from '@/lib/attendance/first-year-subjects'
import { FIRST_YEAR_SECTIONS, dayName, longDate, type FirstYearSelection } from '@/lib/attendance/first-year-selection'
import type { SubjectRoster, SubjectStatus } from '@/lib/attendance/subject-roster'

type Status = Exclude<SubjectStatus, 'unmarked'>

const INITIALS = (name: string) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

const STATUS_CONFIG: Record<Status, { label: string; icon: typeof CheckCircle2; active: string; inactive: string }> = {
  present: { label: 'Present', icon: CheckCircle2, active: 'bg-success text-white border-success shadow-sm', inactive: 'bg-success-bg text-success border-success/20 hover:border-success/40' },
  absent:  { label: 'Absent',  icon: XCircle,      active: 'bg-danger text-white border-danger shadow-sm',    inactive: 'bg-danger-bg text-danger border-danger/20 hover:border-danger/40' },
  late:    { label: 'Late',    icon: Clock3,       active: 'bg-warning text-white border-warning shadow-sm',  inactive: 'bg-warning-bg text-warning border-warning/20 hover:border-warning/40' },
}
const STATUSES: Status[] = ['present', 'absent', 'late']

const CHIP = 'px-3.5 py-2 rounded-xl border text-[13px] font-medium transition-colors cursor-pointer'
const CHIP_ON = 'bg-ink-700 text-white border-ink-700'
const CHIP_OFF = 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'

type Props = {
  /** Route prefix for this dashboard — lets Super Admin render the identical screen in its own shell. */
  basePath?: string
  selection: FirstYearSelection
  roster: SubjectRoster | null
}

// First and Second Year attend by faculty and subject, not for a fixed full day: pick the
// class, the date, the faculty and the subject, and only the students who study
// that subject are listed (Physics → every faculty, Biology → Pre-Medical only…).
export default function FirstYearAttendanceContent({ basePath = '/attendance', selection, roster }: Props) {
  const router = useRouter()
  const [navigating, startNav] = useTransition()
  const todayStr = new Date().toISOString().slice(0, 10)
  const { grade, section, classDate, faculty, subject } = selection
  const yearLabel = YEAR_LABEL[grade]

  // Everyone starts as Present — the marker taps the absentees — except students
  // already marked for this subject on this date, who keep what was saved.
  const [records, setRecords] = useState<Record<string, Status>>(() =>
    Object.fromEntries((roster?.students ?? []).map((s) => [s.id, s.status === 'unmarked' ? 'present' : s.status])),
  )
  const [dirty, setDirty] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const alreadyMarked = (roster?.students ?? []).some((s) => s.status !== 'unmarked')

  function go(next: Partial<{ section: string; date: string; faculty: string | null; subject: string }>) {
    const merged = {
      section: next.section ?? section,
      date: next.date ?? classDate,
      faculty: next.faculty === undefined ? faculty : next.faculty,
      subject: next.subject ?? subject,
    }
    // A faculty change can leave a subject that faculty doesn't study — drop it.
    const allowed = subjectsForFaculty(FACULTIES.find((f) => f === merged.faculty) ?? null, grade)
    const params = new URLSearchParams({ section: merged.section, date: merged.date })
    if (merged.faculty) params.set('faculty', merged.faculty)
    if (merged.subject && allowed.includes(merged.subject)) params.set('subject', merged.subject)
    startNav(() => router.replace(`${basePath}/${YEAR_SLUG[grade]}?${params.toString()}`))
  }

  const students = roster?.students ?? []
  const counts = {
    present: students.filter((s) => records[s.id] === 'present').length,
    absent: students.filter((s) => records[s.id] === 'absent').length,
    late: students.filter((s) => records[s.id] === 'late').length,
  }

  function setStatus(id: string, status: Status) {
    setRecords((prev) => ({ ...prev, [id]: status }))
    setDirty(true)
    setError(null)
  }

  function markAll(status: Status) {
    setRecords(Object.fromEntries(students.map((s) => [s.id, status])))
    setDirty(true)
    setError(null)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    const outcome = await submitClassAttendanceAction({
      classDate,
      subject,
      classLabel: `${yearLabel} ${section}`,
      records: students.map((s) => ({ studentId: s.id, studentName: s.name, status: records[s.id] })),
    })
    setSubmitting(false)
    if (!outcome.ok) { setError(outcome.error); return }
    setDirty(false)
    setToast(outcome.notifiedCount > 0
      ? `Saved. ${outcome.notifiedCount} absence notice${outcome.notifiedCount > 1 ? 's' : ''} sent to parents.`
      : 'Saved.')
    setTimeout(() => setToast(null), 4000)
    router.refresh()
  }

  const stepLabel = 'block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2'

  return (
    <>
      <div>
        <Link href={basePath} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Attendance
        </Link>
        <h1 className="text-[20px] font-bold text-neutral-900">{yearLabel} · Subject-wise Attendance</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">Pick the class, date, faculty and subject — only the students who study that subject are listed</p>
      </div>

      {/* Selection steps */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-5 space-y-5">
        <div>
          <span className={stepLabel}>1 · Class</span>
          <div className="flex flex-wrap gap-2">
            {FIRST_YEAR_SECTIONS.map((s) => (
              <button key={s} type="button" onClick={() => go({ section: s })} className={`${CHIP} ${s === section ? CHIP_ON : CHIP_OFF}`}>{yearLabel} {s}</button>
            ))}
          </div>
        </div>

        <div>
          <span className={stepLabel}>2 · Date and day</span>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="date"
              value={classDate}
              max={todayStr}
              onChange={(e) => e.target.value && go({ date: e.target.value })}
              className="text-[13px] font-mono border border-neutral-200 rounded-xl px-3 py-2 bg-white text-neutral-800 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10"
              aria-label="Date"
            />
            <span className="text-[13px] font-medium text-neutral-700">{dayName(classDate)}, {longDate(classDate)}</span>
          </div>
        </div>

        <div>
          <span className={stepLabel}>3 · Faculty</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => go({ faculty: null })} className={`${CHIP} ${faculty === null ? CHIP_ON : CHIP_OFF}`}>All faculties</button>
            {FACULTIES.map((f) => (
              <button key={f} type="button" onClick={() => go({ faculty: f })} className={`${CHIP} ${f === faculty ? CHIP_ON : CHIP_OFF}`}>{f}</button>
            ))}
          </div>
        </div>

        <div>
          <span className={stepLabel}>4 · Subject</span>
          <div className="flex flex-wrap gap-2">
            {subjectsForFaculty(faculty, grade).map((s) => (
              <button key={s} type="button" onClick={() => go({ subject: s })} className={`${CHIP} ${s === subject ? CHIP_ON : CHIP_OFF}`}>{s}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Roster */}
      <div className={`bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden transition-opacity ${navigating ? 'opacity-60' : ''}`}>
        {!roster ? (
          <div className="px-6 py-12 text-center">
            <p className="text-[14px] font-semibold text-neutral-600">Choose a subject to see the students</p>
            <p className="text-[12.5px] text-neutral-400 mt-1">The list shows {yearLabel} {section} students who study the subject you pick.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 flex-wrap px-6 py-4 border-b border-neutral-100">
              <div>
                <h2 className="text-[14px] font-semibold text-neutral-900">{yearLabel} {section} · {subject}{faculty ? ` · ${faculty}` : ''}</h2>
                <p className="text-[12px] text-neutral-500 mt-0.5">
                  {dayName(classDate)}, {longDate(classDate)} · <span className="font-mono">{students.length}</span> student{students.length === 1 ? '' : 's'}
                  {alreadyMarked && <span className="ml-2 text-ink-600 font-medium">· already marked — changes update the saved record</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => markAll('present')} disabled={students.length === 0} className="text-[11.5px] font-medium text-success bg-success-bg hover:bg-success/15 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">All Present</button>
              </div>
            </div>

            {roster.unplaced > 0 && (
              <div className="flex items-start gap-2.5 px-6 py-3 bg-warning-bg border-b border-warning/20 text-[12.5px] text-warning">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>
                  {roster.unplaced} student{roster.unplaced === 1 ? ' in this class has' : 's in this class have'} no faculty set, so they cannot be listed for {subject}. Set the faculty on their student record to include them.
                </span>
              </div>
            )}

            {students.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-[13px] font-medium text-neutral-500">No students in {yearLabel} {section} study {subject}{faculty ? ` in ${faculty}` : ''}</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {students.map((s) => (
                  <div key={s.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-neutral-50/60 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-ink-100 text-ink-700 flex items-center justify-center font-mono text-[11px] font-bold shrink-0">{INITIALS(s.name)}</div>
                      <div className="min-w-0">
                        <span className="block text-[13.5px] font-medium text-neutral-900 truncate">{s.name}</span>
                        <span className="block text-[11px] font-mono text-neutral-400">
                          {s.gr ?? s.roll}
                          {s.stream && <span className="font-sans ml-2 text-neutral-500">{s.stream}</span>}
                        </span>
                      </div>
                    </div>
                    {s.notified && records[s.id] === 'absent' && !dirty && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-success bg-success-bg px-2 py-1 rounded-lg shrink-0">
                        <MessageSquare size={11} /> Notified
                      </span>
                    )}
                    <div className="flex items-center gap-2 shrink-0">
                      {STATUSES.map((status) => {
                        const cfg = STATUS_CONFIG[status]
                        const Icon = cfg.icon
                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() => setStatus(s.id, status)}
                            aria-pressed={records[s.id] === status}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12px] font-semibold transition-all cursor-pointer ${records[s.id] === status ? cfg.active : cfg.inactive}`}
                          >
                            <Icon size={13} strokeWidth={2.5} />
                            <span className="hidden sm:inline">{cfg.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 flex-wrap px-6 py-4 border-t border-neutral-100 bg-neutral-50/50">
              <div className="flex items-center gap-4 text-[12px] text-neutral-600">
                <span><span className="font-mono font-semibold text-success">{counts.present}</span> Present</span>
                <span><span className="font-mono font-semibold text-danger">{counts.absent}</span> Absent</span>
                <span><span className="font-mono font-semibold text-warning">{counts.late}</span> Late</span>
              </div>
              <div className="flex items-center gap-3">
                {error && <span className="text-[12.5px] text-danger">{error}</span>}
                {!dirty && alreadyMarked && !error && <span className="flex items-center gap-1.5 text-[13px] font-semibold text-success"><CheckCircle2 size={15} /> Saved</span>}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || students.length === 0 || (!dirty && alreadyMarked)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ink-700 text-white text-[13px] font-semibold hover:bg-ink-800 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  {submitting ? 'Saving…' : alreadyMarked ? 'Update Attendance' : 'Submit Attendance'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-neutral-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl">
          <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center shrink-0"><CheckCircle2 size={14} className="text-success" /></div>
          <p className="text-[13px]">{toast}</p>
        </div>
      )}
    </>
  )
}
