'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, Clock3, ChevronDown, Send, RotateCcw } from 'lucide-react'

type Status = 'present' | 'absent' | 'late'

type Student = {
  name: string
  roll: string
  initials: string
}

type ClassData = {
  id: string
  label: string
  time: string
  room: string
  students: Student[]
}

const CLASSES: ClassData[] = [
  {
    id: 'viii-a',
    label: 'Class VIII-A',
    time: '10:30 – 11:15',
    room: 'R-203',
    students: [
      { name: 'Fatima Noor',    roll: 'JE-2026-004', initials: 'FN' },
      { name: 'Ali Baig',       roll: 'JE-2026-009', initials: 'AB' },
      { name: 'Zara Hussain',   roll: 'JE-2026-015', initials: 'ZH' },
      { name: 'Omar Farhan',    roll: 'JE-2026-021', initials: 'OF' },
      { name: 'Nadia Sheikh',   roll: 'JE-2026-027', initials: 'NS' },
      { name: 'Kamil Raza',     roll: 'JE-2026-033', initials: 'KR' },
      { name: 'Sadia Malik',    roll: 'JE-2026-039', initials: 'SM' },
      { name: 'Irfan Qureshi',  roll: 'JE-2026-045', initials: 'IQ' },
    ],
  },
  {
    id: 'x-b',
    label: 'Class X-B',
    time: '12:00 – 12:45',
    room: 'R-101',
    students: [
      { name: 'Usman Sheikh',   roll: 'JE-2026-005', initials: 'US' },
      { name: 'Layla Ahmed',    roll: 'JE-2026-011', initials: 'LA' },
      { name: 'Hamza Tariq',    roll: 'JE-2026-017', initials: 'HT' },
      { name: 'Amina Farooq',   roll: 'JE-2026-023', initials: 'AF' },
      { name: 'Dawood Mir',     roll: 'JE-2026-029', initials: 'DM' },
      { name: 'Rida Iqbal',     roll: 'JE-2026-035', initials: 'RI' },
    ],
  },
]

const STATUS_CONFIG: Record<Status, {
  label: string
  icon: typeof CheckCircle2
  active: string
  inactive: string
  dot: string
}> = {
  present: {
    label:    'Present',
    icon:     CheckCircle2,
    active:   'bg-success text-white border-success shadow-sm',
    inactive: 'bg-success-bg text-success border-success/20 hover:border-success/40',
    dot:      'bg-success',
  },
  absent: {
    label:    'Absent',
    icon:     XCircle,
    active:   'bg-danger text-white border-danger shadow-sm',
    inactive: 'bg-danger-bg text-danger border-danger/20 hover:border-danger/40',
    dot:      'bg-danger',
  },
  late: {
    label:    'Late',
    icon:     Clock3,
    active:   'bg-warning text-white border-warning shadow-sm',
    inactive: 'bg-warning-bg text-warning border-warning/20 hover:border-warning/40',
    dot:      'bg-warning',
  },
}

function initRecord(students: Student[]): Record<string, Status> {
  return Object.fromEntries(students.map(s => [s.roll, 'present' as Status]))
}

export default function AttendanceMarker() {
  const [activeClassId, setActiveClassId] = useState(CLASSES[0].id)
  const [records, setRecords] = useState<Record<string, Record<string, Status>>>(
    Object.fromEntries(CLASSES.map(c => [c.id, initRecord(c.students)]))
  )
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({})
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const activeClass = CLASSES.find(c => c.id === activeClassId)!
  const classRecord = records[activeClassId]

  const counts = {
    present: Object.values(classRecord).filter(s => s === 'present').length,
    absent:  Object.values(classRecord).filter(s => s === 'absent').length,
    late:    Object.values(classRecord).filter(s => s === 'late').length,
  }

  function setStatus(roll: string, status: Status) {
    setRecords(prev => ({
      ...prev,
      [activeClassId]: { ...prev[activeClassId], [roll]: status },
    }))
    // clear submitted state if they edit after submitting
    setSubmitted(prev => ({ ...prev, [activeClassId]: false }))
  }

  function markAll(status: Status) {
    const all = Object.fromEntries(activeClass.students.map(s => [s.roll, status]))
    setRecords(prev => ({ ...prev, [activeClassId]: all }))
    setSubmitted(prev => ({ ...prev, [activeClassId]: false }))
  }

  function handleSubmit() {
    // TODO: POST to /api/attendance with classRecord when Supabase is configured
    setSubmitted(prev => ({ ...prev, [activeClassId]: true }))
  }

  const isSubmitted = !!submitted[activeClassId]

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
        <div>
          <h2 className="text-[14px] font-semibold text-neutral-900">Mark Attendance</h2>
          <p className="text-[12px] text-neutral-500 mt-0.5">Today — 24 Jun 2026</p>
        </div>

        {/* Class selector */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 transition-colors text-[13px] font-medium text-neutral-800"
          >
            <span>{activeClass.label}</span>
            <span className="text-[11px] text-neutral-400 font-mono">{activeClass.time}</span>
            <ChevronDown size={13} className="text-neutral-400 ml-1" />
          </button>
          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl border border-neutral-200 shadow-3 z-20 overflow-hidden py-1">
                {CLASSES.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setActiveClassId(c.id); setDropdownOpen(false) }}
                    className={[
                      'w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors text-[13px]',
                      c.id === activeClassId
                        ? 'bg-ink-50 text-ink-800 font-semibold'
                        : 'text-neutral-700 hover:bg-neutral-50',
                    ].join(' ')}
                  >
                    <span>{c.label}</span>
                    <span className="text-[11px] text-neutral-400 font-mono">{c.time}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-0 border-b border-neutral-100">
        {(['present', 'absent', 'late'] as Status[]).map((s, i) => {
          const cfg = STATUS_CONFIG[s]
          const Icon = cfg.icon
          return (
            <div
              key={s}
              className={`flex-1 flex items-center gap-2.5 px-5 py-3 ${i < 2 ? 'border-r border-neutral-100' : ''}`}
            >
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                s === 'present' ? 'bg-success-bg' : s === 'absent' ? 'bg-danger-bg' : 'bg-warning-bg'
              }`}>
                <Icon size={14} className={
                  s === 'present' ? 'text-success' : s === 'absent' ? 'text-danger' : 'text-warning'
                } />
              </span>
              <div>
                <span className="block text-[18px] font-bold text-neutral-900 leading-none">{counts[s]}</span>
                <span className="block text-[11px] text-neutral-500 mt-0.5">{cfg.label}</span>
              </div>
            </div>
          )
        })}

        {/* Quick actions */}
        <div className="px-5 py-3 flex items-center gap-2 shrink-0">
          <button
            onClick={() => markAll('present')}
            className="text-[11.5px] font-medium text-success hover:text-success bg-success-bg hover:bg-success/15 px-3 py-1.5 rounded-lg transition-colors"
          >
            All Present
          </button>
          <button
            onClick={() => { markAll('present'); setSubmitted(prev => ({ ...prev, [activeClassId]: false })) }}
            className="text-[11.5px] font-medium text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 px-2.5 py-1.5 rounded-lg transition-colors"
            aria-label="Reset"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Student rows */}
      <div className="divide-y divide-neutral-100">
        {activeClass.students.map((student) => {
          const current = classRecord[student.roll]
          return (
            <div
              key={student.roll}
              className="flex items-center gap-4 px-6 py-3.5 hover:bg-neutral-50/60 transition-colors"
            >
              {/* Avatar + name */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={[
                  'w-9 h-9 rounded-full flex items-center justify-center font-mono text-[11px] font-bold shrink-0 transition-colors',
                  current === 'present' ? 'bg-success-bg text-success'
                  : current === 'absent' ? 'bg-danger-bg text-danger'
                  : 'bg-warning-bg text-warning',
                ].join(' ')}>
                  {student.initials}
                </div>
                <div className="min-w-0">
                  <span className="block text-[13.5px] font-medium text-neutral-900 truncate">{student.name}</span>
                  <span className="block text-[11px] font-mono text-neutral-400">{student.roll}</span>
                </div>
              </div>

              {/* Status buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {(['present', 'absent', 'late'] as Status[]).map((status) => {
                  const cfg = STATUS_CONFIG[status]
                  const Icon = cfg.icon
                  const isActive = current === status
                  return (
                    <button
                      key={status}
                      onClick={() => setStatus(student.roll, status)}
                      disabled={isSubmitted}
                      className={[
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12px] font-semibold transition-all',
                        isActive ? cfg.active : cfg.inactive,
                        isSubmitted ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
                      ].join(' ')}
                    >
                      <Icon size={13} strokeWidth={2.5} />
                      <span className="hidden sm:inline">{cfg.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer — submit */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-100 bg-neutral-50/50">
        <div className="flex items-center gap-3">
          {(['present', 'absent', 'late'] as Status[]).map(s => (
            <span key={s} className="flex items-center gap-1.5 text-[12px] text-neutral-600">
              <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s].dot}`} />
              {counts[s]} {STATUS_CONFIG[s].label}
            </span>
          ))}
        </div>

        {isSubmitted ? (
          <div className="flex items-center gap-2 text-[13px] font-semibold text-success">
            <CheckCircle2 size={16} />
            Attendance submitted
          </div>
        ) : (
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ink-700 text-white text-[13px] font-semibold hover:bg-ink-800 transition-colors"
          >
            <Send size={13} />
            Submit Attendance
          </button>
        )}
      </div>
    </div>
  )
}
