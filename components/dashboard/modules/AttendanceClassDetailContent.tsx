'use client'

import { useState } from 'react'
import Link from 'next/link'
import StatCard from '@/components/dashboard/StatCard'
import {
  ArrowLeft, UserCheck, UserX, Clock, Percent,
  MessageSquare, CalendarCheck, AlertCircle, X,
} from 'lucide-react'
import { markAttendanceAction } from '@/lib/actions/attendance'
import { sectionsForGrade, type Grade, type Section } from '@/lib/students/constants'

export type Status = 'unmarked' | 'present' | 'absent' | 'late'

export type RosterStudent = {
  id: string
  name: string
  roll: string
  grade: string
  section: string
  status: Status
  parentPhone: string | null
  alertStatus: 'sent' | 'failed' | null
  termAttendance: { present: number; absent: number; late: number; total: number }
}

const STATUS_LABEL: Record<Status, string> = { unmarked: 'Unmarked', present: 'Present', absent: 'Absent', late: 'Late' }
const STATUS_STYLE: Record<Status, { pill: string; dot: string }> = {
  unmarked: { pill: 'bg-neutral-100 text-neutral-500', dot: 'bg-neutral-300' },
  present:  { pill: 'bg-success-bg text-success', dot: 'bg-success' },
  absent:   { pill: 'bg-danger-bg text-danger',   dot: 'bg-danger'  },
  late:     { pill: 'bg-warning-bg text-warning', dot: 'bg-warning' },
}
const STATUS_ORDER: Record<Status, number> = { unmarked: 0, absent: 1, late: 2, present: 3 }
const NEXT_STATUS: Record<Status, 'present' | 'absent'> = { unmarked: 'present', present: 'absent', absent: 'present', late: 'present' }
const INITIALS = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

const VALID_GRADES = ['9', '10', '11', '12']

type Props = {
  grade: string
  section: string
  /** Route prefix for this dashboard's own links — lets Super Admin render the
   *  identical class-detail view within its own shell. */
  basePath?: string
  students: RosterStudent[]
}

export default function AttendanceClassDetailContent({ grade, section, basePath = '/attendance', students: initialStudents }: Props) {
  const [roster, setRoster] = useState<RosterStudent[]>(initialStudents)
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const isValid = VALID_GRADES.includes(grade) && sectionsForGrade(grade as Grade).includes(section as Section)

  if (!isValid) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-[15px] font-semibold text-neutral-600">Invalid class: Grade {grade} · Section {section}</p>
        <Link href={basePath} className="mt-4 text-[13px] font-medium text-ink-600 hover:text-ink-800">← Back to Attendance</Link>
      </div>
    )
  }

  const setStatus = async (id: string, status: 'present' | 'absent' | 'late') => {
    const student = roster.find(s => s.id === id)
    if (!student || pending[id]) return
    const previous = student.status
    setPending(p => ({ ...p, [id]: true }))
    setRoster(prev => prev.map(s => s.id === id ? { ...s, status } : s))

    const outcome = await markAttendanceAction({ studentId: id, studentName: student.name, status })

    setPending(p => ({ ...p, [id]: false }))
    if (!outcome.ok) setRoster(prev => prev.map(s => s.id === id ? { ...s, status: previous } : s))
  }

  const cycleStatus = (id: string) => {
    const student = roster.find(s => s.id === id)
    if (!student) return
    setStatus(id, NEXT_STATUS[student.status])
  }

  const sorted = [...roster].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])

  const presentCount = roster.filter(s => s.status === 'present').length
  const absentCount  = roster.filter(s => s.status === 'absent').length
  const lateCount    = roster.filter(s => s.status === 'late').length
  const total        = roster.length
  const rate         = total > 0 ? Math.round((presentCount / total) * 100) : 0
  const EMPTY        = total === 0

  const STATS = [
    { label: 'Present',         value: String(presentCount), icon: <UserCheck size={22} />, iconBg: 'bg-success-bg', iconColor: 'text-success', sub: `of ${total} in class`, subUp: true },
    { label: 'Absent',          value: String(absentCount),  icon: <UserX size={22} />,     iconBg: 'bg-danger-bg',  iconColor: 'text-danger',  sub: 'Absence alerts sent automatically' },
    { label: 'Late',            value: String(lateCount),    icon: <Clock size={22} />,     iconBg: 'bg-warning-bg', iconColor: 'text-warning', sub: 'After 8:30 AM' },
    { label: 'Attendance Rate', value: `${rate}%`,           icon: <Percent size={22} />,   iconBg: 'bg-ink-100',    iconColor: 'text-ink-600', sub: `Grade ${grade} · Section ${section}` },
  ]

  const selected = selectedId ? roster.find(s => s.id === selectedId) ?? null : null

  return (
    <>
      <div>
        <Link href={basePath} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Attendance
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ink-700 flex items-center justify-center shrink-0">
              <span className="text-white font-mono text-[13px] font-bold">{grade}{section}</span>
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-neutral-900">Grade {grade} · Section {section}</h1>
              <p className="text-[13px] text-neutral-500 mt-0.5">
                {EMPTY ? 'No students on roster yet' : `${total} student${total !== 1 ? 's' : ''} · today`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {!EMPTY && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {STATS.map(s => <StatCard key={s.label} {...s} />)}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 gap-3">
          <div>
            <h2 className="text-[14px] font-semibold text-neutral-900">Class Roster</h2>
            <p className="text-[11.5px] text-neutral-400 mt-0.5 hidden sm:block">Tap student name for full profile · click status to cycle it</p>
          </div>
          <Link href={`${basePath}/roster`} className="text-[12px] text-ink-600 hover:text-ink-800 no-underline font-medium shrink-0">Export →</Link>
        </div>

        {EMPTY ? (
          <div className="flex flex-col items-center py-16 text-center px-8">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
              <UserCheck size={24} className="text-neutral-300" />
            </div>
            <p className="text-[15px] font-semibold text-neutral-600 mb-1">No roster for {grade}{section}</p>
            <p className="text-[13px] text-neutral-400">Students will appear here once enrolled in this class.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[460px]">
              <thead>
                <tr className="bg-neutral-50 text-left">
                  <th className="px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Student</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider hidden md:table-cell">Alert</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Mark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {sorted.map(s => (
                  <tr key={s.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="px-5 py-3">
                      <button onClick={() => setSelectedId(s.id)} className="flex items-center gap-3 w-full text-left group">
                        <div className="w-8 h-8 rounded-full bg-ink-100 text-ink-700 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 group-hover:bg-ink-200 transition-colors">
                          {INITIALS(s.name)}
                        </div>
                        <div className="min-w-0">
                          <span className="block font-medium text-neutral-900 group-hover:text-ink-700 transition-colors truncate">{s.name}</span>
                          <span className="block text-[11px] font-mono text-neutral-400">{s.roll}</span>
                        </div>
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => cycleStatus(s.id)}
                        disabled={pending[s.id]}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-opacity cursor-pointer disabled:opacity-50 ${STATUS_STYLE[s.status].pill}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLE[s.status].dot}`} />{STATUS_LABEL[s.status]}
                      </button>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      {s.status === 'absent' && s.alertStatus === 'sent' && (
                        <span className="flex items-center gap-1 text-[11px] text-success font-semibold"><MessageSquare size={11} /> Notified</span>
                      )}
                      {s.status === 'absent' && s.alertStatus === 'failed' && (
                        <span className="flex items-center gap-1 text-[11px] text-danger font-semibold" title="WhatsApp/SMS alert failed — contact the parent directly"><MessageSquare size={11} /> Alert failed</span>
                      )}
                      {(s.status !== 'absent' || s.alertStatus === null) && (
                        <span className="text-[11px] text-neutral-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => cycleStatus(s.id)}
                        disabled={pending[s.id]}
                        className={`text-[12px] font-semibold px-3 py-1.5 rounded-xl transition-colors min-w-[68px] disabled:opacity-50 ${s.status === 'present' ? 'bg-success text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-success-bg hover:text-success'}`}
                      >
                        {s.status === 'present' ? '✓ In' : 'Check In'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={() => setSelectedId(null)} />
          <div
            className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 max-h-[92dvh] overflow-y-auto"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
          >
            <div className="w-10 h-1 bg-neutral-200 rounded-full mx-auto mt-3 mb-1 sm:hidden" />
            <div className="px-6 pt-4 pb-5 border-b border-neutral-100">
              <button onClick={() => setSelectedId(null)} className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:bg-neutral-100 transition-colors">
                <X size={16} />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-ink-100 text-ink-700 flex items-center justify-center font-mono text-[16px] font-bold shrink-0">
                  {INITIALS(selected.name)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-[16px] font-bold text-neutral-900">{selected.name}</h3>
                  <p className="text-[12px] font-mono text-neutral-400 mt-0.5">{selected.roll}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[11px] font-mono bg-ink-50 text-ink-700 px-2 py-0.5 rounded-full font-semibold">Grade {selected.grade}-{selected.section}</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLE[selected.status].pill}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLE[selected.status].dot}`} />{STATUS_LABEL[selected.status]} today
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div>
                <h4 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <CalendarCheck size={12} /> Attendance This Term
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Present', val: selected.termAttendance.present, cls: 'bg-success-bg text-success' },
                    { label: 'Late',    val: selected.termAttendance.late,    cls: 'bg-warning-bg text-warning' },
                    { label: 'Absent',  val: selected.termAttendance.absent,  cls: 'bg-danger-bg text-danger'   },
                    { label: 'Rate',    val: `${selected.termAttendance.total > 0 ? Math.round((selected.termAttendance.present / selected.termAttendance.total) * 100) : 0}%`, cls: 'bg-ink-50 text-ink-700' },
                  ].map(item => (
                    <div key={item.label} className={`rounded-2xl p-3 text-center ${item.cls}`}>
                      <p className="text-[18px] font-bold leading-none mb-1">{item.val}</p>
                      <p className="text-[10px] font-semibold opacity-70">{item.label}</p>
                    </div>
                  ))}
                </div>
                {selected.termAttendance.total > 0 && (
                  <>
                    <div className="mt-3 h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-ink-400" style={{ width: `${Math.round((selected.termAttendance.present / selected.termAttendance.total) * 100)}%` }} />
                    </div>
                    <p className="text-[10.5px] text-neutral-400 mt-1 text-right">{selected.termAttendance.present}/{selected.termAttendance.total} days marked</p>
                  </>
                )}
              </div>
              {selected.parentPhone && (
                <div className="bg-neutral-50 rounded-2xl p-4 flex items-center gap-3">
                  <AlertCircle size={15} className="text-ink-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-neutral-700">Parent Contact</p>
                    <p className="text-[12px] font-mono text-neutral-500 mt-0.5">{selected.parentPhone}</p>
                  </div>
                  <a href={`tel:${selected.parentPhone}`} className="text-[12px] font-medium text-ink-600 hover:text-ink-800 bg-white border border-neutral-200 px-3 py-1.5 rounded-xl transition-colors no-underline">Call</a>
                </div>
              )}
              <div className="flex items-center gap-3">
                <button onClick={() => { setStatus(selected.id, 'present'); setSelectedId(null) }} className="flex-1 py-3 text-[13px] font-semibold bg-success text-white rounded-xl hover:bg-success/90 transition-colors">Mark Present</button>
                <button onClick={() => { setStatus(selected.id, 'absent'); setSelectedId(null) }} className="flex-1 py-3 text-[13px] font-semibold bg-danger-bg text-danger rounded-xl hover:bg-danger/10 transition-colors">Mark Absent</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
