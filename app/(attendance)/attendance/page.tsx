'use client'

import Link from 'next/link'
import StatCard from '@/components/dashboard/StatCard'
import { UserCheck, UserX, Clock, Percent, MessageSquare } from 'lucide-react'

const CLASS_STATS: Record<string, Record<string, { present: number; absent: number; late: number; total: number }>> = {
  '9':  {
    A: { present: 27, absent: 2, late: 1, total: 30 },
    B: { present: 22, absent: 5, late: 1, total: 28 },
    C: { present: 29, absent: 2, late: 1, total: 32 },
    D: { present: 24, absent: 2, late: 0, total: 26 },
  },
  '10': {
    A: { present: 29, absent: 1, late: 1, total: 31 },
    B: { present: 21, absent: 5, late: 1, total: 27 },
    C: { present: 27, absent: 1, late: 1, total: 29 },
    D: { present: 31, absent: 1, late: 1, total: 33 },
  },
  '11': {
    A: { present: 22, absent: 5, late: 1, total: 28 },
    B: { present: 28, absent: 1, late: 1, total: 30 },
    C: { present: 24, absent: 1, late: 1, total: 26 },
    D: { present: 27, absent: 1, late: 1, total: 29 },
  },
  '12': {
    A: { present: 20, absent: 3, late: 1, total: 24 },
    B: { present: 22, absent: 4, late: 1, total: 27 },
    C: { present: 23, absent: 1, late: 1, total: 25 },
    D: { present: 21, absent: 1, late: 1, total: 23 },
  },
}

const WEEK = [
  { day: 'Mon', present: 174, total: 448, isToday: false },
  { day: 'Tue', present: 400, total: 448, isToday: false },
  { day: 'Wed', present: 391, total: 448, isToday: false },
  { day: 'Thu', present: 413, total: 448, isToday: false },
  { day: 'Fri', present: 382, total: 448, isToday: true  },
]

const ALL_CLASSES   = Object.values(CLASS_STATS).flatMap(g => Object.values(g))
const TOTAL_PRESENT = ALL_CLASSES.reduce((a, c) => a + c.present, 0)
const TOTAL_ABSENT  = ALL_CLASSES.reduce((a, c) => a + c.absent,  0)
const TOTAL_LATE    = ALL_CLASSES.reduce((a, c) => a + c.late,    0)
const TOTAL_ALL     = ALL_CLASSES.reduce((a, c) => a + c.total,   0)
const GLOBAL_RATE   = Math.round((TOTAL_PRESENT / TOTAL_ALL) * 100)
const ALERTS_PENDING = 3

const STATS = [
  { label: 'Present Today',   value: String(TOTAL_PRESENT), icon: <UserCheck size={22} />, iconBg: 'bg-success-bg', iconColor: 'text-success', sub: `of ${TOTAL_ALL} enrolled`, subUp: true },
  { label: 'Absent Today',    value: String(TOTAL_ABSENT),  icon: <UserX size={22} />,     iconBg: 'bg-danger-bg',  iconColor: 'text-danger',  sub: `${ALERTS_PENDING} alerts pending` },
  { label: 'Late Arrivals',   value: String(TOTAL_LATE),    icon: <Clock size={22} />,     iconBg: 'bg-warning-bg', iconColor: 'text-warning', sub: 'After 8:30 AM' },
  { label: 'Attendance Rate', value: `${GLOBAL_RATE}%`,     icon: <Percent size={22} />,   iconBg: 'bg-ink-100',    iconColor: 'text-ink-600', sub: '↑ 1.2% vs last week', subUp: true },
]

function rateStyle(rate: number): { badge: string; bar: string } {
  if (rate >= 90) return { badge: 'text-success', bar: 'bg-success' }
  if (rate >= 75) return { badge: 'text-warning', bar: 'bg-warning' }
  return             { badge: 'text-danger',  bar: 'bg-danger'  }
}

export default function AttendanceDashboard() {
  const weekAvg = Math.round(WEEK.reduce((a, d) => a + (d.present / d.total) * 100, 0) / WEEK.length)

  return (
    <>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[20px] font-bold text-neutral-900">Attendance Dashboard</h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">Select a class to mark and view today's roster — 24 Jun 2026</p>
        </div>
        {ALERTS_PENDING > 0 && (
          <div className="flex items-center gap-2 px-3.5 py-2 bg-danger-bg border border-danger/20 rounded-xl text-[12.5px] font-medium text-danger">
            <MessageSquare size={13} />{ALERTS_PENDING} alert{ALERTS_PENDING > 1 ? 's' : ''} pending
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 gap-3">
          <div>
            <h2 className="text-[14px] font-semibold text-neutral-900">Today's Class Overview</h2>
            <p className="text-[11.5px] text-neutral-400 mt-0.5 hidden sm:block">Click a class to mark attendance and view the full roster</p>
          </div>
          <span className="text-[12px] font-mono text-neutral-400 shrink-0">{TOTAL_ALL} students</span>
        </div>
        <div className="p-5 space-y-5">
          {(['9', '10', '11', '12'] as const).map(grade => (
            <div key={grade}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Grade {grade}</span>
                <div className="flex-1 h-px bg-neutral-100" />
                <span className="text-[10px] font-mono text-neutral-400">
                  {Object.values(CLASS_STATS[grade]).reduce((a, c) => a + c.total, 0)} students
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(['A', 'B', 'C', 'D'] as const).map(section => {
                  const c    = CLASS_STATS[grade][section]
                  const rate = Math.round((c.present / c.total) * 100)
                  const st   = rateStyle(rate)
                  return (
                    <Link
                      key={section}
                      href={`/attendance/${grade}/${section}`}
                      className="group relative flex flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white no-underline py-6 px-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-ink-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400 focus-visible:ring-offset-2"
                      aria-label={`Grade ${grade} Section ${section} — ${rate}% present`}
                    >
                      <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-2xl overflow-hidden bg-neutral-100">
                        <div className={`h-full transition-all duration-300 ${st.bar}`} style={{ width: `${rate}%` }} />
                      </div>
                      <span className="font-mono leading-none select-none">
                        <span className="text-[26px] font-bold text-ink-700">{grade}</span>
                        <span className="text-[20px] font-semibold text-ink-400">{section}</span>
                      </span>
                      <span className={`text-[13px] font-bold mt-1.5 tabular-nums font-mono ${st.badge}`}>{rate}%</span>
                      {c.absent > 0
                        ? <span className="text-[10.5px] font-medium mt-0.5 text-danger tabular-nums">{c.absent} absent</span>
                        : <span className="text-[10.5px] font-medium mt-0.5 text-neutral-300">All present</span>
                      }
                      <span className="absolute top-3 right-3.5 text-[11px] text-neutral-200 group-hover:text-ink-400 transition-colors font-medium">→</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[14px] font-semibold text-neutral-900">This Week</h2>
          <div className="text-right">
            <p className="text-[11px] text-neutral-400">Week average</p>
            <p className="text-[18px] font-bold text-neutral-900 font-mono">{weekAvg}%</p>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {WEEK.map(d => {
            const pct = Math.round((d.present / d.total) * 100)
            return (
              <div key={d.day} className="flex flex-col items-center gap-2">
                <span className={`text-[11px] font-semibold font-mono tabular-nums ${pct >= 90 ? 'text-success' : 'text-warning'}`}>{pct}%</span>
                <div className={`w-full rounded-lg overflow-hidden ${d.isToday ? 'bg-ink-50' : 'bg-neutral-100'}`} style={{ height: 80 }}>
                  <div
                    className={`w-full rounded-lg transition-all ${pct >= 90 ? 'bg-success' : 'bg-warning'} ${d.isToday ? '' : 'opacity-50'}`}
                    style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
                  />
                </div>
                <div className="text-center">
                  <span className={`text-[12px] font-medium ${d.isToday ? 'text-ink-700 font-bold' : 'text-neutral-500'}`}>{d.day}</span>
                  {d.isToday && <span className="block text-[9px] text-ink-400 mt-0.5">today</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
