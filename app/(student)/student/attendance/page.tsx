'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Clock3, XCircle } from 'lucide-react'

type AttStatus = 'Present' | 'Late' | 'Absent'

const ATT_CFG: Record<AttStatus, { icon: typeof CheckCircle2; ring: string; bg: string; text: string }> = {
  Present: { icon: CheckCircle2, ring: 'border-success', bg: 'bg-success-bg', text: 'text-success' },
  Late:    { icon: Clock3,       ring: 'border-warning', bg: 'bg-warning-bg', text: 'text-warning' },
  Absent:  { icon: XCircle,      ring: 'border-danger',  bg: 'bg-danger-bg',  text: 'text-danger'  },
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June']

function genMonth(seed: number): { date: number; status: AttStatus }[] {
  const days: { date: number; status: AttStatus }[] = []
  for (let d = 1; d <= 22; d++) {
    const r = (d * 7 + seed * 13) % 20
    const status: AttStatus = r < 2 ? 'Absent' : r < 5 ? 'Late' : 'Present'
    days.push({ date: d, status })
  }
  return days
}

export default function StudentAttendancePage() {
  const [monthIdx, setMonthIdx] = useState(MONTHS.length - 1)
  const days = genMonth(monthIdx)

  const present = days.filter((d) => d.status === 'Present').length
  const late = days.filter((d) => d.status === 'Late').length
  const absent = days.filter((d) => d.status === 'Absent').length
  const rate = Math.round(((present + late * 0.5) / days.length) * 100)

  return (
    <>
      <div>
        <Link href="/student" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Dashboard
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-[20px] font-bold text-neutral-900">My Attendance</h1>
            <p className="text-[13px] text-neutral-500 mt-0.5">Full history, term 2025–26</p>
          </div>
          <select value={monthIdx} onChange={(e) => setMonthIdx(Number(e.target.value))} className="text-[12.5px] border border-neutral-200 rounded-xl px-3 py-2.5 text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
            {MONTHS.map((m, i) => <option key={m} value={i}>{m} 2026</option>)}
          </select>
        </div>
      </div>

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
          <h2 className="text-[14px] font-semibold text-neutral-900">{MONTHS[monthIdx]} 2026</h2>
          <span className={`text-[15px] font-bold font-mono ${rate >= 90 ? 'text-success' : rate >= 75 ? 'text-warning' : 'text-danger'}`}>{rate}%</span>
        </div>
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-2.5">
          {days.map((d) => {
            const cfg = ATT_CFG[d.status]
            const Icon = cfg.icon
            return (
              <div key={d.date} className="flex flex-col items-center gap-1">
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
  )
}
