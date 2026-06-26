'use client'

import { useState } from 'react'
import StatCard from '@/components/dashboard/StatCard'
import { UserCheck, UserX, Clock, Percent, MessageSquare } from 'lucide-react'

const STATS = [
  { label: 'Present Today', value: '218', icon: <UserCheck size={22} />, iconBg: 'bg-success-bg', iconColor: 'text-success', sub: 'of 247 students', subUp: true   },
  { label: 'Absent Today',  value: '21',  icon: <UserX size={22} />,     iconBg: 'bg-danger-bg',  iconColor: 'text-danger',  sub: '↑ 4 vs yesterday'              },
  { label: 'Late Arrivals', value: '8',   icon: <Clock size={22} />,     iconBg: 'bg-warning-bg', iconColor: 'text-warning', sub: 'Arrived after 8:30 AM'         },
  { label: 'Monthly Rate',  value: '91%', icon: <Percent size={22} />,   iconBg: 'bg-ink-100',    iconColor: 'text-ink-600', sub: '↑ 1.2% vs last month', subUp: true },
]

type Status = 'Present' | 'Absent' | 'Late'

const ROSTER_BASE = [
  { name: 'Ahmed Ali',      roll: 'JE-2026-001', class: 'X-A',    programme: 'Matriculation', status: 'Present' as Status, alertSent: false },
  { name: 'Sara Khan',      roll: 'JE-2026-002', class: 'X-A',    programme: 'Matriculation', status: 'Late'    as Status, alertSent: false },
  { name: 'Bilal Raza',     roll: 'JE-2026-003', class: 'XII-B',  programme: 'Intermediate',  status: 'Present' as Status, alertSent: false },
  { name: 'Fatima Noor',    roll: 'JE-2026-004', class: 'VIII-A', programme: 'Middle School', status: 'Present' as Status, alertSent: false },
  { name: 'Usman Sheikh',   roll: 'JE-2026-005', class: 'X-A',    programme: 'Matriculation', status: 'Absent'  as Status, alertSent: true  },
  { name: 'Hina Baig',      roll: 'JE-2026-018', class: 'VII-B',  programme: 'Middle School', status: 'Absent'  as Status, alertSent: true  },
  { name: 'Kamran Malik',   roll: 'JE-2026-031', class: 'V-A',    programme: 'Primary',       status: 'Absent'  as Status, alertSent: true  },
  { name: 'Sana Mir',       roll: 'JE-2026-044', class: 'XII-B',  programme: 'Intermediate',  status: 'Absent'  as Status, alertSent: false },
  { name: 'Dawood Ilyas',   roll: 'JE-2026-057', class: 'IX-B',   programme: 'Matriculation', status: 'Absent'  as Status, alertSent: true  },
  { name: 'Zunaira Hassan', roll: 'JE-2026-062', class: 'III-A',  programme: 'Primary',       status: 'Late'    as Status, alertSent: false },
  { name: 'Tariq Ansari',   roll: 'JE-2026-071', class: 'IX-B',   programme: 'Matriculation', status: 'Present' as Status, alertSent: false },
  { name: 'Amna Farooq',    roll: 'JE-2026-079', class: 'VII-B',  programme: 'Middle School', status: 'Present' as Status, alertSent: false },
]

const WEEK = [
  { day: 'Mon', present: 231, total: 247, isToday: false },
  { day: 'Tue', present: 238, total: 247, isToday: false },
  { day: 'Wed', present: 225, total: 247, isToday: false },
  { day: 'Thu', present: 241, total: 247, isToday: false },
  { day: 'Fri', present: 218, total: 247, isToday: true  },
]

const STATUS_STYLE: Record<Status, { pill: string; dot: string }> = {
  Present: { pill: 'bg-success-bg text-success', dot: 'bg-success' },
  Absent:  { pill: 'bg-danger-bg text-danger',   dot: 'bg-danger'  },
  Late:    { pill: 'bg-warning-bg text-warning', dot: 'bg-warning' },
}

// Sort: Absent first, Late second, Present last
const STATUS_ORDER: Record<Status, number> = { Absent: 0, Late: 1, Present: 2 }

const INITIALS = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

const ALL_CLASSES = ['All Classes', ...Array.from(new Set(ROSTER_BASE.map(s => s.class))).sort()]

export default function AttendanceDashboard() {
  const [classFilter, setClassFilter] = useState('All Classes')
  const [statuses, setStatuses] = useState<Record<string, Status>>(
    () => Object.fromEntries(ROSTER_BASE.map(s => [s.roll, s.status]))
  )
  const [alerts, setAlerts] = useState<Record<string, boolean>>(
    () => Object.fromEntries(ROSTER_BASE.map(s => [s.roll, s.alertSent]))
  )

  const cycleStatus = (roll: string) => {
    setStatuses(prev => {
      const next: Record<Status, Status> = { Present: 'Absent', Absent: 'Present', Late: 'Present' }
      return { ...prev, [roll]: next[prev[roll]] }
    })
  }

  const sendAlert = (roll: string) => {
    setAlerts(prev => ({ ...prev, [roll]: true }))
  }

  const filteredRoster = ROSTER_BASE
    .filter(s => classFilter === 'All Classes' || s.class === classFilter)
    .slice()
    .sort((a, b) => STATUS_ORDER[statuses[a.roll]] - STATUS_ORDER[statuses[b.roll]])

  const absentCount  = filteredRoster.filter(s => statuses[s.roll] === 'Absent').length
  const alertPending = ROSTER_BASE.filter(s => statuses[s.roll] === 'Absent' && !alerts[s.roll]).length

  return (
    <>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[20px] font-bold text-neutral-900">Attendance</h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">Real-time class roster management — 24 Jun 2026</p>
        </div>
        {alertPending > 0 && (
          <div className="flex items-center gap-2 px-3.5 py-2 bg-danger-bg border border-danger/20 rounded-xl text-[12.5px] font-medium text-danger">
            <MessageSquare size={13} />
            {alertPending} absence alert{alertPending > 1 ? 's' : ''} pending
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {STATS.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Active daily roster — 2/3 */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 gap-3 flex-wrap">
            <div>
              <h2 className="text-[14px] font-semibold text-neutral-900">Active Class Roster</h2>
              <p className="text-[11.5px] text-neutral-400 mt-0.5">Click status pill to toggle · absent rows sorted to top</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="text-[12px] border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer"
              >
                {ALL_CLASSES.map(c => <option key={c}>{c}</option>)}
              </select>
              <span className="text-[11px] text-neutral-400">{absentCount} absent</span>
              <a href="/attendance/roster" className="text-[12px] text-ink-600 hover:text-ink-800 no-underline font-medium">Full roster →</a>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-neutral-50 text-left">
                  <th className="px-6 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Student</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Class</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Alert</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Check-In</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredRoster.map((s) => {
                  const current  = statuses[s.roll]
                  const alertSent = alerts[s.roll]
                  return (
                    <tr key={s.roll} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          {/* Avatar always ink — never colors based on status */}
                          <div className="w-8 h-8 rounded-full bg-ink-100 text-ink-700 flex items-center justify-center font-mono text-[10px] font-bold shrink-0">
                            {INITIALS(s.name)}
                          </div>
                          <div>
                            <span className="block font-medium text-neutral-900">{s.name}</span>
                            <span className="block text-[11px] font-mono text-neutral-400">{s.roll}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-neutral-600 font-mono text-[12px]">{s.class}</td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => cycleStatus(s.roll)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold hover:opacity-80 cursor-pointer transition-opacity ${STATUS_STYLE[current].pill}`}
                          title="Click to toggle status"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLE[current].dot}`} />
                          {current}
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        {current === 'Absent'
                          ? alertSent
                            ? <span className="flex items-center gap-1 text-[11px] font-semibold text-success">
                                <MessageSquare size={11} /> Sent
                              </span>
                            : <button
                                onClick={() => sendAlert(s.roll)}
                                className="flex items-center gap-1 text-[11.5px] font-semibold text-ink-700 hover:text-ink-900 bg-ink-50 border border-ink-100 px-2.5 py-1 rounded-lg transition-colors"
                              >
                                <MessageSquare size={11} /> Send Alert
                              </button>
                          : <span className="text-[11px] text-neutral-300">—</span>
                        }
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => cycleStatus(s.roll)}
                          className={`text-[12px] font-semibold px-3 py-1.5 rounded-xl transition-colors ${
                            current === 'Present'
                              ? 'bg-success text-white'
                              : 'bg-neutral-100 text-neutral-600 hover:bg-success-bg hover:text-success'
                          }`}
                        >
                          {current === 'Present' ? '✓ In' : 'Check In'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Weekly trend — 1/3 */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-6">
          <h2 className="text-[14px] font-semibold text-neutral-900 mb-5">This Week</h2>
          <div className="space-y-3">
            {WEEK.map((d) => {
              const pct = Math.round((d.present / d.total) * 100)
              return (
                <div key={d.day}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[12px] font-medium ${d.isToday ? 'text-ink-700 font-bold' : 'text-neutral-700'}`}>
                      {d.day}{d.isToday && <span className="ml-1 text-[10px] text-ink-400 font-semibold">today</span>}
                    </span>
                    <span className="text-[11.5px] text-neutral-500 font-mono">{d.present}/{d.total}</span>
                    <span className={`text-[12px] font-semibold font-mono w-10 text-right ${pct >= 90 ? 'text-success' : 'text-warning'}`}>{pct}%</span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${d.isToday ? 'bg-ink-50' : 'bg-neutral-100'}`}>
                    <div
                      className={`h-full rounded-full ${pct >= 90 ? 'bg-success' : 'bg-warning'} ${d.isToday ? '' : 'opacity-60'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-100">
            <p className="text-[11.5px] text-neutral-400">Week average</p>
            <p className="text-[22px] font-bold text-neutral-900 mt-0.5 font-mono">
              {Math.round(WEEK.reduce((a, d) => a + (d.present / d.total) * 100, 0) / WEEK.length)}%
            </p>
          </div>

          {/* Alert summary */}
          <div className="mt-4 pt-4 border-t border-neutral-100">
            <p className="text-[11.5px] text-neutral-400 mb-3">Absence alerts today</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[12px] text-neutral-600">
                  <MessageSquare size={12} className="text-success" /> Sent
                </span>
                <span className="text-[12px] font-semibold font-mono text-neutral-900">
                  {ROSTER_BASE.filter(s => statuses[s.roll] === 'Absent' && alerts[s.roll]).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[12px] text-neutral-600">
                  <MessageSquare size={12} className="text-danger" /> Pending
                </span>
                <span className="text-[12px] font-semibold font-mono text-neutral-900">{alertPending}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
