'use client'

import Link from 'next/link'
import { useState } from 'react'
import StatCard from '@/components/dashboard/StatCard'
import { UserCheck, UserX, Clock, Percent, MessageSquare, TrendingUp } from 'lucide-react'

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
  { day: 'Mon', date: '23 Jun', present: 174, absent: 256, late: 18, total: 448, isToday: false },
  { day: 'Tue', date: '24 Jun', present: 400, absent:  36, late: 12, total: 448, isToday: false },
  { day: 'Wed', date: '25 Jun', present: 391, absent:  42, late: 15, total: 448, isToday: false },
  { day: 'Thu', date: '26 Jun', present: 413, absent:  22, late: 13, total: 448, isToday: false },
  { day: 'Fri', date: '27 Jun', present: 382, absent:  48, late: 18, total: 448, isToday: true  },
]

const LAST_WEEK_AVG = 76

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

const BAR_H = 148

export default function AttendanceDashboard() {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)

  const weekAvg  = Math.round(WEEK.reduce((a, d) => a + (d.present / d.total) * 100, 0) / WEEK.length)
  const weekDelta = weekAvg - LAST_WEEK_AVG
  const bestDay   = WEEK.reduce((a, d) => (d.present / d.total) > (a.present / a.total) ? d : a)
  const worstDay  = WEEK.reduce((a, d) => (d.present / d.total) < (a.present / a.total) ? d : a)

  return (
    <>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[20px] font-bold text-neutral-900">Attendance Dashboard</h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">Select a class to mark and view today&apos;s roster — 24 Jun 2026</p>
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

      {/* ── Class / Section grid ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 gap-3">
          <div>
            <h2 className="text-[14px] font-semibold text-neutral-900">Today&apos;s Class Overview</h2>
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

      {/* ── This Week ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-5 sm:p-6">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h2 className="text-[14px] font-semibold text-neutral-900">This Week</h2>
            <p className="text-[11.5px] text-neutral-400 mt-0.5">23 – 27 Jun 2026</p>
          </div>
          <div className="flex items-end gap-3 shrink-0">
            {/* Trend chip */}
            <div className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold ${weekDelta >= 0 ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'}`}>
              <TrendingUp size={11} />
              {weekDelta >= 0 ? '+' : ''}{weekDelta}% vs last wk
            </div>
            {/* Big avg */}
            <div className="text-right">
              <p className="text-[10.5px] text-neutral-400 mb-0.5">Week average</p>
              <p className="text-[26px] font-bold text-neutral-900 font-mono leading-none tabular-nums">{weekAvg}%</p>
            </div>
          </div>
        </div>

        {/* Chart — rate labels row */}
        <div className="grid grid-cols-5 gap-2 sm:gap-4 mb-2">
          {WEEK.map(d => {
            const rate = Math.round((d.present / d.total) * 100)
            const st   = rateStyle(rate)
            return (
              <div key={d.day} className="flex justify-center">
                <span className={`text-[11.5px] font-bold font-mono tabular-nums ${st.badge}`}>{rate}%</span>
              </div>
            )
          })}
        </div>

        {/* Chart — bar area */}
        <div className="relative mb-2" style={{ height: BAR_H }}>

          {/* Horizontal gridlines */}
          {[25, 50, 75].map(pct => (
            <div
              key={pct}
              className="absolute left-0 right-0 border-t border-neutral-100 pointer-events-none"
              style={{ bottom: `${pct}%` }}
            />
          ))}

          {/* 90% target line */}
          <div
            className="absolute left-0 right-0 z-10 pointer-events-none"
            style={{ bottom: '90%' }}
          >
            <div className="w-full border-t border-dashed border-neutral-300" />
            <span className="absolute right-0 top-0 -translate-y-full text-[8.5px] font-mono text-neutral-300 pb-0.5">90%</span>
          </div>

          {/* Bars */}
          <div className="grid grid-cols-5 gap-2 sm:gap-4 h-full">
            {WEEK.map(d => {
              const presentPct = (d.present / d.total) * 100
              const latePct    = (d.late    / d.total) * 100
              const rate       = Math.round((d.present / d.total) * 100)
              const isHovered  = hoveredDay === d.day
              const st         = rateStyle(rate)

              return (
                <div
                  key={d.day}
                  className="relative h-full flex items-end justify-center"
                  onMouseEnter={() => setHoveredDay(d.day)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  {/* Bar track + fill — centered, narrower than column */}
                  <div
                    className={`relative h-full transition-all duration-150 ${
                      d.isToday || isHovered ? 'w-[62%]' : 'w-[54%]'
                    }`}
                  >
                    {/* Track (full-height guide) */}
                    <div
                      className={`absolute inset-0 rounded-t-xl rounded-b-md transition-colors ${
                        d.isToday ? 'bg-ink-50' : 'bg-neutral-100'
                      }`}
                    />

                    {/* Late strip — sits on top of present, gets rounded cap */}
                    {latePct > 0 && (
                      <div
                        className={`absolute left-0 right-0 rounded-t-xl bg-warning transition-all duration-700 ${
                          d.isToday ? 'opacity-90' : 'opacity-55'
                        }`}
                        style={{ bottom: `${presentPct}%`, height: `${latePct}%` }}
                      />
                    )}

                    {/* Present fill — fills from bottom */}
                    <div
                      className={`absolute bottom-0 left-0 right-0 rounded-b-md ${st.bar} transition-all duration-700 ${
                        latePct === 0 ? 'rounded-t-xl' : ''
                      } ${d.isToday ? '' : 'opacity-70'}`}
                      style={{ height: `${presentPct}%` }}
                    />

                    {/* Today indicator ring */}
                    {d.isToday && (
                      <div className="absolute inset-0 rounded-t-xl rounded-b-md ring-2 ring-ink-400 ring-offset-0 pointer-events-none" />
                    )}
                  </div>

                  {/* Tooltip */}
                  {isHovered && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 z-30 pointer-events-none"
                      style={{ bottom: 'calc(100% + 8px)' }}
                    >
                      <div className="bg-neutral-900 text-white rounded-xl px-3 py-2 shadow-xl whitespace-nowrap">
                        <p className="text-[9.5px] font-semibold text-neutral-400 mb-1.5 tracking-widest uppercase">{d.day} · {d.date}</p>
                        <div className="flex items-center gap-2.5 text-[11px] font-mono">
                          <span className="flex items-center gap-1 text-success font-semibold">
                            <span className="w-1.5 h-1.5 rounded-sm bg-success inline-block" />{d.present}
                          </span>
                          <span className="flex items-center gap-1 text-warning font-semibold">
                            <span className="w-1.5 h-1.5 rounded-sm bg-warning inline-block" />{d.late}
                          </span>
                          <span className="flex items-center gap-1 text-danger/80 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-sm bg-danger/60 inline-block" />{d.absent}
                          </span>
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-neutral-900" />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Chart — day labels row */}
        <div className="grid grid-cols-5 gap-2 sm:gap-4 mb-5">
          {WEEK.map(d => (
            <div key={d.day} className="text-center space-y-0.5 pt-1.5">
              <span className={`block text-[12px] font-medium leading-none ${d.isToday ? 'text-ink-700 font-bold' : 'text-neutral-500'}`}>
                {d.day}
              </span>
              <span className="block text-[10px] font-mono text-neutral-400 tabular-nums leading-none">
                {d.present}<span className="text-neutral-300">/{d.total}</span>
              </span>
              {d.isToday && (
                <span className="block text-[9px] font-bold text-ink-500 uppercase tracking-widest leading-none pt-0.5">Today</span>
              )}
            </div>
          ))}
        </div>

        {/* Footer — legend + insights */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-100 flex-wrap gap-y-2 gap-x-4">
          {/* Legend */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-[3px] bg-success" />
              <span className="text-[11px] text-neutral-500">Present</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-[3px] bg-warning opacity-80" />
              <span className="text-[11px] text-neutral-500">Late</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-[3px] bg-neutral-200" />
              <span className="text-[11px] text-neutral-500">Absent</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <div className="w-5 h-px border-t border-dashed border-neutral-400" />
              <span className="text-[11px] text-neutral-400">90% target</span>
            </div>
          </div>

          {/* Best / Worst */}
          <div className="flex items-center gap-2.5 text-[11px]">
            <span className="text-neutral-400">Best:</span>
            <span className="font-semibold font-mono text-success">{bestDay.day} {Math.round((bestDay.present / bestDay.total) * 100)}%</span>
            <span className="text-neutral-200">·</span>
            <span className="text-neutral-400">Low:</span>
            <span className="font-semibold font-mono text-danger">{worstDay.day} {Math.round((worstDay.present / worstDay.total) * 100)}%</span>
          </div>
        </div>
      </div>
    </>
  )
}
