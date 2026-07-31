'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Clock3, XCircle } from 'lucide-react'
import type { AttendanceMonth } from '@/lib/student/attendance-history'

type AttStatus = 'Present' | 'Late' | 'Absent'

const ATT_CFG: Record<AttStatus, { icon: typeof CheckCircle2; ring: string; bg: string; text: string }> = {
  Present: { icon: CheckCircle2, ring: 'border-success', bg: 'bg-success-bg', text: 'text-success' },
  Late:    { icon: Clock3,       ring: 'border-warning', bg: 'bg-warning-bg', text: 'text-warning' },
  Absent:  { icon: XCircle,      ring: 'border-danger',  bg: 'bg-danger-bg',  text: 'text-danger'  },
}

export default function StudentAttendanceContent({ studentId, months }: { studentId: string; months: AttendanceMonth[] }) {
  const [monthIdx, setMonthIdx] = useState(months.length - 1)
  const selected = months[monthIdx]
  const days = selected?.days ?? []

  const present = days.filter((d) => d.status === 'Present').length
  const late = days.filter((d) => d.status === 'Late').length
  const absent = days.filter((d) => d.status === 'Absent').length
  const rate = days.length > 0 ? Math.round(((present + late * 0.5) / days.length) * 100) : 0

  return (
    <>
      <div>
        <Link href={`/student/${studentId}`} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Dashboard
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-[20px] font-bold text-neutral-900">My Attendance</h1>
            <p className="text-[13px] text-neutral-500 mt-0.5">Full history</p>
          </div>
          {months.length > 0 && (
            <select value={monthIdx} onChange={(e) => setMonthIdx(Number(e.target.value))} className="text-[12.5px] border border-neutral-200 rounded-xl px-3 py-2.5 text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
              {months.map((m, i) => <option key={`${m.year}-${m.monthIndex}`} value={i}>{m.label} {m.year}</option>)}
            </select>
          )}
        </div>
      </div>

      {months.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 py-16 text-center text-[13px] text-neutral-400">No attendance recorded yet.</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-5 text-center">
              <p className="text-[26px] font-bold font-mono text-success leading-none mb-1">{present}</p>
              <p className="text-[11.5px] text-neutral-400">Present</p>
            </div>
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-5 text-center">
              <p className="text-[26px] font-bold font-mono text-warning leading-none mb-1">{late}</p>
              <p className="text-[11.5px] text-neutral-400">Late</p>
            </div>
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-5 text-center">
              <p className="text-[26px] font-bold font-mono text-danger leading-none mb-1">{absent}</p>
              <p className="text-[11.5px] text-neutral-400">Absent</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[14px] font-semibold text-neutral-900">{selected.label} {selected.year}</h2>
              <span className={`text-[15px] font-bold font-mono ${rate >= 90 ? 'text-success' : rate >= 75 ? 'text-warning' : 'text-danger'}`}>{rate}%</span>
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2.5">
              {days.map((d, i) => {
                const cfg = ATT_CFG[d.status]
                const Icon = cfg.icon
                return (
                  <div key={`${d.date}-${i}`} className="flex flex-col items-center gap-1">
                    <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center ${cfg.ring} ${cfg.bg}`}>
                      <Icon size={13} strokeWidth={2.5} className={cfg.text} />
                    </div>
                    <span className="text-[9.5px] font-mono text-neutral-400">{d.date}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </>
  )
}
