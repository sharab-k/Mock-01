'use client'

import Link from 'next/link'
import { useState } from 'react'
import StatCard from '@/components/dashboard/StatCard'
import { UserCheck, UserX, Clock, Percent, MessageSquare, TrendingUp } from 'lucide-react'
import { sectionsForGrade } from '@/lib/students/constants'

export type ClassAttendanceStat = { present: number; absent: number; late: number; total: number }
export type DayAttendanceStat = { day: string; date: string; present: number; absent: number; late: number; total: number; isToday: boolean }

function rateStyle(rate: number): { badge: string; bar: string } {
  if (rate >= 90) return { badge: 'text-success', bar: 'bg-success' }
  if (rate >= 75) return { badge: 'text-warning', bar: 'bg-warning' }
  return             { badge: 'text-danger',  bar: 'bg-danger'  }
}

function rate(c: { present: number; total: number }): number {
  return c.total > 0 ? Math.round((c.present / c.total) * 100) : 0
}

type Props = {
  /** Route prefix for this dashboard's own links — lets Super Admin render the
   *  identical dashboard within its own shell instead of a simplified duplicate. */
  basePath?: string
  todayLabel: string
  classStats: Record<string, Record<string, ClassAttendanceStat>>
  week: DayAttendanceStat[]
  lastWeekAvg: number
  failedAlertsToday: number
}

export default function AttendanceDashboardContent({ basePath = '/attendance', todayLabel, classStats, week, lastWeekAvg, failedAlertsToday }: Props) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)

  const allClasses  = Object.values(classStats).flatMap(g => Object.values(g))
  const totalPresent = allClasses.reduce((a, c) => a + c.present, 0)
  const totalAbsent  = allClasses.reduce((a, c) => a + c.absent, 0)
  const totalLate    = allClasses.reduce((a, c) => a + c.late, 0)
  const totalAll     = allClasses.reduce((a, c) => a + c.total, 0)
  const globalRate   = rate({ present: totalPresent, total: totalAll })

  const STATS = [
    { label: 'Present Today',   value: String(totalPresent), icon: <UserCheck size={22} />, iconBg: 'bg-success-bg', iconColor: 'text-success', sub: `of ${totalAll} enrolled`, subUp: true },
    { label: 'Absent Today',    value: String(totalAbsent),  icon: <UserX size={22} />,     iconBg: 'bg-danger-bg',  iconColor: 'text-danger',  sub: failedAlertsToday > 0 ? `${failedAlertsToday} alert${failedAlertsToday > 1 ? 's' : ''} failed` : 'Alerts sent' },
    { label: 'Late Arrivals',   value: String(totalLate),    icon: <Clock size={22} />,     iconBg: 'bg-warning-bg', iconColor: 'text-warning', sub: 'After 8:30 AM' },
    { label: 'Attendance Rate', value: `${globalRate}%`,     icon: <Percent size={22} />,   iconBg: 'bg-ink-100',    iconColor: 'text-ink-600', sub: 'Marked so far today' },
  ]

  const weekAvg  = week.length > 0 ? Math.round(week.reduce((a, d) => a + rate(d), 0) / week.length) : 0
  const weekDelta = weekAvg - lastWeekAvg
  const bestDay   = week.reduce((a, d) => rate(d) > rate(a) ? d : a, week[0])
  const worstDay  = week.reduce((a, d) => rate(d) < rate(a) ? d : a, week[0])

  return (
    <>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[20px] font-bold text-neutral-900">Attendance Dashboard</h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">Select a class to mark and view today&apos;s roster — {todayLabel}</p>
        </div>
        {failedAlertsToday > 0 && (
          <div className="flex items-center gap-2 px-3.5 py-2 bg-danger-bg border border-danger/20 rounded-xl text-[12.5px] font-medium text-danger">
            <MessageSquare size={13} />{failedAlertsToday} alert{failedAlertsToday > 1 ? 's' : ''} failed
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
          <span className="text-[12px] font-mono text-neutral-400 shrink-0">{totalAll} students</span>
        </div>
        <div className="p-5 space-y-5">
          {(['9', '10', '11', '12'] as const).map(grade => (
            <div key={grade}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Grade {grade}</span>
                <div className="flex-1 h-px bg-neutral-100" />
                <span className="text-[10px] font-mono text-neutral-400">
                  {Object.values(classStats[grade]).reduce((a, c) => a + c.total, 0)} students
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {sectionsForGrade(grade).map(section => {
                  const c   = classStats[grade][section]
                  const pct = rate(c)
                  const st  = rateStyle(pct)
                  return (
                    <Link
                      key={section}
                      href={`${basePath}/${grade}/${section}`}
                      className="group relative flex flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white no-underline py-6 px-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-ink-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400 focus-visible:ring-offset-2"
                      aria-label={`Grade ${grade} Section ${section} — ${pct}% present`}
                    >
                      <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-2xl overflow-hidden bg-neutral-100">
                        <div className={`h-full transition-all duration-300 ${st.bar}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="font-mono leading-none select-none">
                        <span className="text-[26px] font-bold text-ink-700">{grade}</span>
                        <span className="text-[20px] font-semibold text-ink-400">{section}</span>
                      </span>
                      <span className={`text-[13px] font-bold mt-1.5 tabular-nums font-mono ${st.badge}`}>{pct}%</span>
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
            <p className="text-[11.5px] text-neutral-400 mt-0.5">{week[0]?.date} – {week[week.length - 1]?.date}</p>
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

        {/* Chart — horizontal bar graph */}
        <div className="mb-5">

          {/* Scale header */}
          <div className="flex items-center mb-3" style={{ paddingLeft: 84, paddingRight: 60 }}>
            <div className="flex-1 relative h-4">
              {[0, 25, 50, 75].map(pct => (
                <span
                  key={pct}
                  className="absolute text-[9px] font-mono text-neutral-300 -translate-x-1/2 select-none"
                  style={{ left: `${pct}%` }}
                >{pct === 0 ? '0' : `${pct}%`}</span>
              ))}
              <span
                className="absolute text-[9px] font-mono text-neutral-400 font-semibold -translate-x-1/2 select-none"
                style={{ left: '90%' }}
              >90%</span>
            </div>
          </div>

          {/* Rows */}
          <div className="space-y-1.5">
            {week.map(d => {
              const pct        = rate(d)
              const presentPct = d.total > 0 ? (d.present / d.total) * 100 : 0
              const latePct    = d.total > 0 ? (d.late    / d.total) * 100 : 0
              const isHovered  = hoveredDay === d.day
              const st         = rateStyle(pct)

              return (
                <div
                  key={d.day}
                  className={`flex items-center gap-3 rounded-xl transition-all duration-150 cursor-default select-none ${
                    d.isToday
                      ? 'bg-ink-50/70 px-3 py-2 -mx-3'
                      : isHovered
                        ? 'bg-neutral-50 px-1 -mx-1 py-1'
                        : 'px-1 -mx-1 py-1'
                  }`}
                  onMouseEnter={() => setHoveredDay(d.day)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  {/* Day label */}
                  <div className="w-[68px] shrink-0">
                    <div className="flex items-center gap-1.5">
                      {d.isToday && <span className="w-1.5 h-1.5 rounded-full bg-ink-500 shrink-0" />}
                      <span className={`text-[13px] font-semibold leading-none ${d.isToday ? 'text-ink-700' : 'text-neutral-600'}`}>
                        {d.day}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400 block mt-0.5 pl-[11px]">{d.date}</span>
                  </div>

                  {/* Bar */}
                  <div
                    className="flex-1 relative"
                    style={{ height: d.isToday ? 34 : 28 }}
                  >
                    {/* Vertical gridlines */}
                    {[25, 50, 75].map(pct => (
                      <div
                        key={pct}
                        className="absolute top-0 bottom-0 w-px bg-neutral-100 pointer-events-none"
                        style={{ left: `${pct}%` }}
                      />
                    ))}
                    {/* 90% target vertical line */}
                    <div
                      className="absolute top-[-4px] bottom-[-4px] pointer-events-none z-10"
                      style={{ left: '90%' }}
                    >
                      <div className="w-px h-full border-l-2 border-dashed border-neutral-300/80" />
                    </div>

                    {/* Track */}
                    <div className={`absolute inset-0 rounded-full ${d.isToday ? 'bg-ink-100/50' : 'bg-neutral-100'}`} />

                    {/* Present fill */}
                    <div
                      className={`absolute top-0 left-0 bottom-0 ${st.bar} transition-all duration-700 ease-out ${
                        latePct > 0 ? 'rounded-l-full' : 'rounded-full'
                      } ${d.isToday ? '' : 'opacity-75'}`}
                      style={{ width: `${presentPct}%` }}
                    />

                    {/* Late strip */}
                    {latePct > 0 && (
                      <div
                        className={`absolute top-0 bottom-0 bg-warning rounded-r-full transition-all duration-700 ease-out ${
                          d.isToday ? 'opacity-85' : 'opacity-55'
                        }`}
                        style={{ left: `${presentPct}%`, width: `${latePct}%` }}
                      />
                    )}

                    {/* Today ring */}
                    {d.isToday && (
                      <div className="absolute inset-0 rounded-full ring-2 ring-ink-400/70 pointer-events-none" />
                    )}

                    {/* Tooltip — floats above row */}
                    {isHovered && (
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-30 pointer-events-none">
                        <div className="bg-neutral-900 text-white rounded-xl px-3 py-2 shadow-xl whitespace-nowrap">
                          <p className="text-[9.5px] font-semibold text-neutral-400 mb-1.5 tracking-widest uppercase">{d.day} · {d.date}</p>
                          <div className="flex items-center gap-2.5 text-[11px] font-mono">
                            <span className="flex items-center gap-1 text-success font-semibold">
                              <span className="w-1.5 h-1.5 rounded-sm bg-success inline-block" />{d.present}P
                            </span>
                            <span className="flex items-center gap-1 text-warning font-semibold">
                              <span className="w-1.5 h-1.5 rounded-sm bg-warning inline-block" />{d.late}L
                            </span>
                            <span className="flex items-center gap-1 text-danger/80 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-sm bg-danger/60 inline-block" />{d.absent}A
                            </span>
                          </div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-neutral-900" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Rate + absent count */}
                  <div className="w-[52px] shrink-0 text-right">
                    <span className={`text-[12.5px] font-bold font-mono tabular-nums leading-none ${st.badge}`}>{pct}%</span>
                    <span className={`block text-[10px] font-mono tabular-nums mt-0.5 ${d.absent > 0 ? 'text-danger/60' : 'text-success/70'}`}>
                      {d.absent > 0 ? `${d.absent}↓` : '✓'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
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
            <span className="font-semibold font-mono text-success">{bestDay.day} {rate(bestDay)}%</span>
            <span className="text-neutral-200">·</span>
            <span className="text-neutral-400">Low:</span>
            <span className="font-semibold font-mono text-danger">{worstDay.day} {rate(worstDay)}%</span>
          </div>
        </div>
      </div>
    </>
  )
}
