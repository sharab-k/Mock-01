'use client'

import { useState } from 'react'
import StatCard from '@/components/dashboard/StatCard'
import {
  UserCheck, UserX, Clock, Percent, MessageSquare, X,
  CalendarCheck, BookOpen, TrendingUp, AlertCircle,
} from 'lucide-react'

// ── Types & constants ─────────────────────────────────────────────────────────
type Status = 'Present' | 'Absent' | 'Late'

const STATUS_STYLE: Record<Status, { pill: string; dot: string }> = {
  Present: { pill: 'bg-success-bg text-success', dot: 'bg-success' },
  Absent:  { pill: 'bg-danger-bg text-danger',   dot: 'bg-danger'  },
  Late:    { pill: 'bg-warning-bg text-warning', dot: 'bg-warning' },
}
const STATUS_ORDER: Record<Status, number> = { Absent: 0, Late: 1, Present: 2 }

const GRADES    = ['All Grades', '9', '10', '11', '12']
const SECTIONS  = ['All Sections', 'A', 'B', 'C']
const INITIALS  = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

// ── Mock data ─────────────────────────────────────────────────────────────────
const ROSTER_BASE = [
  { name: 'Ahmed Ali',      roll: 'JE-2026-001', grade: '10', section: 'A', status: 'Present' as Status, alertSent: false },
  { name: 'Sara Khan',      roll: 'JE-2026-002', grade: '9',  section: 'A', status: 'Late'    as Status, alertSent: false },
  { name: 'Bilal Raza',     roll: 'JE-2026-003', grade: '12', section: 'A', status: 'Present' as Status, alertSent: false },
  { name: 'Fatima Noor',    roll: 'JE-2026-004', grade: '11', section: 'B', status: 'Present' as Status, alertSent: false },
  { name: 'Usman Sheikh',   roll: 'JE-2026-005', grade: '10', section: 'B', status: 'Absent'  as Status, alertSent: true  },
  { name: 'Hina Baig',      roll: 'JE-2026-018', grade: '9',  section: 'B', status: 'Absent'  as Status, alertSent: true  },
  { name: 'Kamran Malik',   roll: 'JE-2026-031', grade: '12', section: 'B', status: 'Absent'  as Status, alertSent: true  },
  { name: 'Sana Mir',       roll: 'JE-2026-044', grade: '12', section: 'A', status: 'Absent'  as Status, alertSent: false },
  { name: 'Dawood Ilyas',   roll: 'JE-2026-057', grade: '11', section: 'A', status: 'Absent'  as Status, alertSent: true  },
  { name: 'Zunaira Hassan', roll: 'JE-2026-062', grade: '9',  section: 'C', status: 'Late'    as Status, alertSent: false },
  { name: 'Tariq Ansari',   roll: 'JE-2026-071', grade: '11', section: 'B', status: 'Present' as Status, alertSent: false },
  { name: 'Amna Farooq',    roll: 'JE-2026-079', grade: '10', section: 'C', status: 'Present' as Status, alertSent: false },
]

const STUDENT_PROFILES: Record<string, {
  attendance: { present: number; absent: number; late: number; total: number }
  marks: { subject: string; score: number; grade: string }[]
  phone: string; tier: string
}> = {
  'JE-2026-001': { attendance: { present: 21, absent: 2, late: 1, total: 24 }, marks: [{ subject: 'Mathematics', score: 87, grade: 'A' }, { subject: 'English', score: 82, grade: 'A-' }, { subject: 'Physics', score: 74, grade: 'B' }], phone: '+92 300 1234567', tier: 'Distinction' },
  'JE-2026-002': { attendance: { present: 18, absent: 4, late: 2, total: 24 }, marks: [{ subject: 'Mathematics', score: 63, grade: 'C+' }, { subject: 'English', score: 79, grade: 'B+' }, { subject: 'Biology', score: 71, grade: 'B' }], phone: '+92 321 9876543', tier: 'Pass' },
  'JE-2026-003': { attendance: { present: 23, absent: 0, late: 1, total: 24 }, marks: [{ subject: 'Mathematics', score: 91, grade: 'A+' }, { subject: 'Chemistry', score: 88, grade: 'A' }, { subject: 'Physics', score: 85, grade: 'A' }], phone: '+92 333 4567890', tier: 'Distinction' },
  'JE-2026-004': { attendance: { present: 20, absent: 3, late: 1, total: 24 }, marks: [{ subject: 'Mathematics', score: 78, grade: 'B+' }, { subject: 'English', score: 84, grade: 'A-' }], phone: '+92 311 2345678', tier: 'Merit' },
  'JE-2026-005': { attendance: { present: 16, absent: 7, late: 1, total: 24 }, marks: [{ subject: 'Mathematics', score: 55, grade: 'C' }, { subject: 'English', score: 62, grade: 'C+' }], phone: '+92 345 5678901', tier: 'Pass' },
  'JE-2026-018': { attendance: { present: 17, absent: 5, late: 2, total: 24 }, marks: [{ subject: 'Mathematics', score: 60, grade: 'C+' }, { subject: 'Urdu', score: 75, grade: 'B' }], phone: '+92 301 6789012', tier: 'Pass' },
  'JE-2026-031': { attendance: { present: 15, absent: 8, late: 1, total: 24 }, marks: [{ subject: 'Chemistry', score: 72, grade: 'B' }, { subject: 'Biology', score: 79, grade: 'B+' }], phone: '+92 312 7890123', tier: 'Merit' },
  'JE-2026-044': { attendance: { present: 19, absent: 4, late: 1, total: 24 }, marks: [{ subject: 'Urdu', score: 88, grade: 'A' }, { subject: 'English', score: 76, grade: 'B+' }], phone: '+92 323 8901234', tier: 'Merit' },
  'JE-2026-057': { attendance: { present: 14, absent: 9, late: 1, total: 24 }, marks: [{ subject: 'Physics', score: 58, grade: 'C' }, { subject: 'Mathematics', score: 65, grade: 'C+' }], phone: '+92 334 9012345', tier: 'Pass' },
  'JE-2026-062': { attendance: { present: 19, absent: 2, late: 3, total: 24 }, marks: [{ subject: 'Urdu', score: 82, grade: 'A-' }, { subject: 'English', score: 78, grade: 'B+' }], phone: '+92 345 0123456', tier: 'Merit' },
  'JE-2026-071': { attendance: { present: 22, absent: 1, late: 1, total: 24 }, marks: [{ subject: 'Mathematics', score: 80, grade: 'A-' }, { subject: 'Physics', score: 77, grade: 'B+' }], phone: '+92 300 1234560', tier: 'Merit' },
  'JE-2026-079': { attendance: { present: 21, absent: 2, late: 1, total: 24 }, marks: [{ subject: 'Mathematics', score: 69, grade: 'B-' }, { subject: 'Biology', score: 74, grade: 'B' }], phone: '+92 321 2345670', tier: 'Merit' },
}

const WEEK = [
  { day: 'Mon', present: 174, total: 186, isToday: false },
  { day: 'Tue', present: 180, total: 186, isToday: false },
  { day: 'Wed', present: 171, total: 186, isToday: false },
  { day: 'Thu', present: 183, total: 186, isToday: false },
  { day: 'Fri', present: 162, total: 186, isToday: true  },
]

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AttendanceDashboard() {
  const [gradeFilter,     setGradeFilter]     = useState('All Grades')
  const [sectionFilter,   setSectionFilter]   = useState('All Sections')
  const [statuses,        setStatuses]        = useState<Record<string, Status>>(
    () => Object.fromEntries(ROSTER_BASE.map(s => [s.roll, s.status]))
  )
  const [alerts, setAlerts] = useState<Record<string, boolean>>(
    () => Object.fromEntries(ROSTER_BASE.map(s => [s.roll, s.alertSent]))
  )
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)

  const cycleStatus = (roll: string) => {
    setStatuses(prev => {
      const next: Record<Status, Status> = { Present: 'Absent', Absent: 'Present', Late: 'Present' }
      return { ...prev, [roll]: next[prev[roll]] }
    })
  }

  const filteredRoster = ROSTER_BASE
    .filter(s => {
      const g = gradeFilter   === 'All Grades'   || s.grade   === gradeFilter
      const sc = sectionFilter === 'All Sections' || s.section === sectionFilter
      return g && sc
    })
    .slice()
    .sort((a, b) => STATUS_ORDER[statuses[a.roll]] - STATUS_ORDER[statuses[b.roll]])

  const presentCount = filteredRoster.filter(s => statuses[s.roll] === 'Present').length
  const absentCount  = filteredRoster.filter(s => statuses[s.roll] === 'Absent').length
  const lateCount    = filteredRoster.filter(s => statuses[s.roll] === 'Late').length
  const total        = filteredRoster.length
  const rate         = total > 0 ? Math.round((presentCount / total) * 100) : 0
  const alertPending = ROSTER_BASE.filter(s => statuses[s.roll] === 'Absent' && !alerts[s.roll]).length

  const STATS = [
    { label: 'Present Today',  value: String(presentCount), icon: <UserCheck size={22} />, iconBg: 'bg-success-bg', iconColor: 'text-success', sub: `of ${total} enrolled`, subUp: true },
    { label: 'Absent Today',   value: String(absentCount),  icon: <UserX size={22} />,     iconBg: 'bg-danger-bg',  iconColor: 'text-danger',  sub: alertPending > 0 ? `${alertPending} alerts pending` : 'All alerts sent' },
    { label: 'Late Arrivals',  value: String(lateCount),    icon: <Clock size={22} />,     iconBg: 'bg-warning-bg', iconColor: 'text-warning', sub: 'After 8:30 AM' },
    { label: 'Attendance Rate',value: `${rate}%`,           icon: <Percent size={22} />,   iconBg: 'bg-ink-100',    iconColor: 'text-ink-600', sub: '↑ 1.2% vs last week', subUp: true },
  ]

  const ps = selectedStudent ? ROSTER_BASE.find(s => s.roll === selectedStudent) : null
  const pd = selectedStudent ? STUDENT_PROFILES[selectedStudent] : null
  const pst = selectedStudent ? statuses[selectedStudent] : null

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[20px] font-bold text-neutral-900">Attendance Dashboard</h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">Real-time class roster — 24 Jun 2026</p>
        </div>
        {alertPending > 0 && (
          <div className="flex items-center gap-2 px-3.5 py-2 bg-danger-bg border border-danger/20 rounded-xl text-[12.5px] font-medium text-danger">
            <MessageSquare size={13} />{alertPending} alert{alertPending > 1 ? 's' : ''} pending
          </div>
        )}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-[12px] font-medium text-neutral-500 shrink-0">Grade</label>
          <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} className="text-[13px] border border-neutral-200 rounded-xl px-3 py-2 text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-ink-200 cursor-pointer min-w-[130px]">
            {GRADES.map(g => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[12px] font-medium text-neutral-500 shrink-0">Section</label>
          <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)} className="text-[13px] border border-neutral-200 rounded-xl px-3 py-2 text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-ink-200 cursor-pointer min-w-[130px]">
            {SECTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        {(gradeFilter !== 'All Grades' || sectionFilter !== 'All Sections') && (
          <button onClick={() => { setGradeFilter('All Grades'); setSectionFilter('All Sections') }} className="text-[11.5px] text-ink-600 font-medium">Clear ×</button>
        )}
        <span className="text-[12px] text-neutral-400 ml-auto">{absentCount} absent · {lateCount} late</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Roster — 2/3 */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 gap-3">
            <div>
              <h2 className="text-[14px] font-semibold text-neutral-900">Active Class Roster</h2>
              <p className="text-[11.5px] text-neutral-400 mt-0.5 hidden sm:block">Tap student name to view full profile</p>
            </div>
            <a href="/teacher/roster" className="text-[12px] text-ink-600 hover:text-ink-800 no-underline font-medium shrink-0">Full roster →</a>
          </div>

          {filteredRoster.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center px-6">
              <UserCheck size={32} className="text-neutral-200 mb-3" />
              <p className="text-[14px] font-semibold text-neutral-500">No students match this filter</p>
              <button onClick={() => { setGradeFilter('All Grades'); setSectionFilter('All Sections') }} className="mt-3 text-[12.5px] text-ink-600 font-medium">Clear filters →</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[460px]">
                <thead>
                  <tr className="bg-neutral-50 text-left">
                    <th className="px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Student</th>
                    <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider hidden sm:table-cell">Grade</th>
                    <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider hidden md:table-cell">Alert</th>
                    <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Mark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredRoster.map((s) => {
                    const cur  = statuses[s.roll]
                    const alrt = alerts[s.roll]
                    return (
                      <tr key={s.roll} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="px-5 py-3">
                          <button onClick={() => setSelectedStudent(s.roll)} className="flex items-center gap-3 w-full text-left group">
                            <div className="w-8 h-8 rounded-full bg-ink-100 text-ink-700 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 group-hover:bg-ink-200 transition-colors">
                              {INITIALS(s.name)}
                            </div>
                            <div className="min-w-0">
                              <span className="block font-medium text-neutral-900 group-hover:text-ink-700 transition-colors truncate">{s.name}</span>
                              <span className="block text-[11px] font-mono text-neutral-400">{s.roll}</span>
                            </div>
                          </button>
                        </td>
                        <td className="px-3 py-3 hidden sm:table-cell">
                          <span className="inline-flex bg-ink-50 text-ink-700 text-[11px] font-semibold px-2 py-0.5 rounded-full font-mono">{s.grade}-{s.section}</span>
                        </td>
                        <td className="px-3 py-3">
                          <button onClick={() => cycleStatus(s.roll)} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold hover:opacity-80 transition-opacity cursor-pointer ${STATUS_STYLE[cur].pill}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLE[cur].dot}`} />{cur}
                          </button>
                        </td>
                        <td className="px-3 py-3 hidden md:table-cell">
                          {cur === 'Absent'
                            ? alrt
                              ? <span className="flex items-center gap-1 text-[11px] text-success font-semibold"><MessageSquare size={11} /> Sent</span>
                              : <button onClick={() => setAlerts(p => ({ ...p, [s.roll]: true }))} className="flex items-center gap-1 text-[11.5px] font-semibold text-ink-700 bg-ink-50 border border-ink-100 px-2.5 py-1 rounded-lg hover:bg-ink-100 transition-colors"><MessageSquare size={11} /> Alert</button>
                            : <span className="text-[11px] text-neutral-300">—</span>
                          }
                        </td>
                        <td className="px-3 py-3">
                          <button onClick={() => cycleStatus(s.roll)} className={`text-[12px] font-semibold px-3 py-1.5 rounded-xl transition-colors min-w-[68px] ${cur === 'Present' ? 'bg-success text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-success-bg hover:text-success'}`}>
                            {cur === 'Present' ? '✓ In' : 'Check In'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Weekly chart — 1/3 */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-5">
          <h2 className="text-[14px] font-semibold text-neutral-900 mb-5">This Week</h2>
          <div className="space-y-3">
            {WEEK.map(d => {
              const pct = Math.round((d.present / d.total) * 100)
              return (
                <div key={d.day}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[12px] font-medium w-10 ${d.isToday ? 'text-ink-700 font-bold' : 'text-neutral-700'}`}>
                      {d.day}{d.isToday && <span className="ml-1 text-[9px] text-ink-400">now</span>}
                    </span>
                    <span className="text-[11px] text-neutral-400 font-mono">{d.present}/{d.total}</span>
                    <span className={`text-[12px] font-semibold font-mono w-10 text-right ${pct >= 90 ? 'text-success' : 'text-warning'}`}>{pct}%</span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${d.isToday ? 'bg-ink-50' : 'bg-neutral-100'}`}>
                    <div className={`h-full rounded-full ${pct >= 90 ? 'bg-success' : 'bg-warning'} ${d.isToday ? '' : 'opacity-60'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-5 pt-4 border-t border-neutral-100">
            <p className="text-[11.5px] text-neutral-400">Week average</p>
            <p className="text-[22px] font-bold text-neutral-900 mt-0.5 font-mono">
              {Math.round(WEEK.reduce((a, d) => a + (d.present / d.total) * 100, 0) / WEEK.length)}%
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-neutral-100">
            <p className="text-[11.5px] text-neutral-400 mb-3">Today&apos;s breakdown</p>
            <div className="space-y-2">
              {(['Present', 'Late', 'Absent'] as Status[]).map(st => (
                <div key={st} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[12px] text-neutral-600">
                    <span className={`w-2 h-2 rounded-full ${STATUS_STYLE[st].dot}`} />{st}
                  </span>
                  <span className="text-[12px] font-semibold font-mono text-neutral-900">
                    {ROSTER_BASE.filter(s => statuses[s.roll] === st).length}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Student profile modal */}
      {selectedStudent && ps && pd && pst && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={() => setSelectedStudent(null)} />
          <div
            className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 max-h-[92dvh] overflow-y-auto"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
          >
            {/* Drag handle (mobile) */}
            <div className="w-10 h-1 bg-neutral-200 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

            <div className="px-6 pt-4 pb-5 border-b border-neutral-100">
              <button onClick={() => setSelectedStudent(null)} className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:bg-neutral-100 transition-colors">
                <X size={16} />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-ink-100 text-ink-700 flex items-center justify-center font-mono text-[16px] font-bold shrink-0">
                  {INITIALS(ps.name)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-[16px] font-bold text-neutral-900">{ps.name}</h3>
                  <p className="text-[12px] font-mono text-neutral-400 mt-0.5">{ps.roll}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[11px] font-mono bg-ink-50 text-ink-700 px-2 py-0.5 rounded-full font-semibold">Grade {ps.grade}-{ps.section}</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLE[pst].pill}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLE[pst].dot}`} />{pst} today
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Attendance summary */}
              <div>
                <h4 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <CalendarCheck size={12} /> Attendance This Term
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Present', val: pd.attendance.present, cls: 'bg-success-bg text-success' },
                    { label: 'Late',    val: pd.attendance.late,    cls: 'bg-warning-bg text-warning' },
                    { label: 'Absent',  val: pd.attendance.absent,  cls: 'bg-danger-bg text-danger'   },
                    { label: 'Rate',    val: `${Math.round((pd.attendance.present / pd.attendance.total) * 100)}%`, cls: 'bg-ink-50 text-ink-700' },
                  ].map(item => (
                    <div key={item.label} className={`rounded-2xl p-3 text-center ${item.cls}`}>
                      <p className="text-[18px] font-bold leading-none mb-1">{item.val}</p>
                      <p className="text-[10px] font-semibold opacity-70">{item.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-ink-400" style={{ width: `${Math.round((pd.attendance.present / pd.attendance.total) * 100)}%` }} />
                </div>
                <p className="text-[10.5px] text-neutral-400 mt-1 text-right">{pd.attendance.present}/{pd.attendance.total} days</p>
              </div>

              {/* Marks */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen size={12} /> Recent Marks
                  </h4>
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                    pd.tier === 'Distinction' ? 'bg-success-bg text-success' :
                    pd.tier === 'Merit'       ? 'bg-ink-100 text-ink-700'    : 'bg-warning-bg text-warning'
                  }`}>{pd.tier}</span>
                </div>
                <div className="space-y-2.5">
                  {pd.marks.map(m => (
                    <div key={m.subject} className="flex items-center gap-3">
                      <span className="text-[12px] text-neutral-700 w-24 shrink-0 truncate">{m.subject}</span>
                      <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${m.score >= 80 ? 'bg-success' : m.score >= 65 ? 'bg-ink-400' : 'bg-warning'}`} style={{ width: `${m.score}%` }} />
                      </div>
                      <span className="text-[12px] font-mono font-semibold text-neutral-700 w-8 text-right shrink-0">{m.score}</span>
                      <span className={`text-[12px] font-bold font-mono w-6 text-right shrink-0 ${m.grade.startsWith('A') ? 'text-success' : m.grade.startsWith('B') ? 'text-ink-600' : 'text-warning'}`}>{m.grade}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div className="bg-neutral-50 rounded-2xl p-4 flex items-center gap-3">
                <TrendingUp size={15} className="text-ink-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-neutral-700">Parent Contact</p>
                  <p className="text-[12px] font-mono text-neutral-500 mt-0.5">{pd.phone}</p>
                </div>
                <a href={`tel:${pd.phone}`} className="text-[12px] font-medium text-ink-600 hover:text-ink-800 bg-white border border-neutral-200 px-3 py-1.5 rounded-xl transition-colors no-underline">Call</a>
              </div>

              {/* Quick mark actions */}
              <div className="flex items-center gap-3">
                <button onClick={() => { setStatuses(p => ({ ...p, [selectedStudent]: 'Present' })); setSelectedStudent(null) }} className="flex-1 py-3 text-[13px] font-semibold bg-success text-white rounded-xl hover:bg-success/90 transition-colors">Mark Present</button>
                <button onClick={() => { setStatuses(p => ({ ...p, [selectedStudent]: 'Absent' })); setSelectedStudent(null) }} className="flex-1 py-3 text-[13px] font-semibold bg-danger-bg text-danger rounded-xl hover:bg-danger/10 transition-colors">Mark Absent</button>
              </div>

              {pst === 'Absent' && !alerts[selectedStudent] && (
                <button onClick={() => { setAlerts(p => ({ ...p, [selectedStudent]: true })); setSelectedStudent(null) }} className="w-full flex items-center justify-center gap-2 py-2.5 text-[13px] font-medium text-ink-700 bg-ink-50 border border-ink-100 rounded-xl hover:bg-ink-100 transition-colors">
                  <MessageSquare size={14} /> Send Absence Alert to Parent
                </button>
              )}
              {pst === 'Absent' && alerts[selectedStudent] && (
                <div className="flex items-center gap-2 justify-center text-[12px] text-success">
                  <AlertCircle size={13} /> Alert already sent to parent
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
