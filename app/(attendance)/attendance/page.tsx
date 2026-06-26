import StatCard from '@/components/dashboard/StatCard'
import { UserCheck, UserX, Clock, Percent, MessageSquare } from 'lucide-react'

const STATS = [
  { label: 'Present Today',  value: '218', icon: <UserCheck size={22} />, iconBg: 'bg-success-bg', iconColor: 'text-success', sub: 'of 247 students', subUp: true  },
  { label: 'Absent Today',   value: '21',  icon: <UserX size={22} />,     iconBg: 'bg-danger-bg',  iconColor: 'text-danger',  sub: '↑ 4 vs yesterday'              },
  { label: 'Late Arrivals',  value: '8',   icon: <Clock size={22} />,     iconBg: 'bg-warning-bg', iconColor: 'text-warning', sub: 'Arrived after 8:30 AM'         },
  { label: 'Monthly Rate',   value: '91%', icon: <Percent size={22} />,   iconBg: 'bg-ink-100',    iconColor: 'text-ink-600', sub: '↑ 1.2% vs last month', subUp: true },
]

// Full daily class roster — real-time check-in view
const ROSTER = [
  { name: 'Ahmed Ali',      roll: 'JE-2026-001', class: 'X-A',   programme: 'Matriculation', status: 'Present' as const, alertSent: false },
  { name: 'Sara Khan',      roll: 'JE-2026-002', class: 'X-A',   programme: 'Matriculation', status: 'Late'    as const, alertSent: false },
  { name: 'Bilal Raza',     roll: 'JE-2026-003', class: 'XII-B', programme: 'Intermediate',  status: 'Present' as const, alertSent: false },
  { name: 'Fatima Noor',    roll: 'JE-2026-004', class: 'VIII-A',programme: 'Middle School', status: 'Present' as const, alertSent: false },
  { name: 'Usman Sheikh',   roll: 'JE-2026-005', class: 'X-A',   programme: 'Matriculation', status: 'Absent'  as const, alertSent: true  },
  { name: 'Hina Baig',      roll: 'JE-2026-018', class: 'VII-B', programme: 'Middle School', status: 'Absent'  as const, alertSent: true  },
  { name: 'Kamran Malik',   roll: 'JE-2026-031', class: 'V-A',   programme: 'Primary',       status: 'Absent'  as const, alertSent: true  },
  { name: 'Sana Mir',       roll: 'JE-2026-044', class: 'XII-B', programme: 'Intermediate',  status: 'Absent'  as const, alertSent: false },
  { name: 'Dawood Ilyas',   roll: 'JE-2026-057', class: 'IX-B',  programme: 'Matriculation', status: 'Absent'  as const, alertSent: true  },
  { name: 'Zunaira Hassan', roll: 'JE-2026-062', class: 'III-A', programme: 'Primary',       status: 'Late'    as const, alertSent: false },
  { name: 'Tariq Ansari',   roll: 'JE-2026-071', class: 'IX-B',  programme: 'Matriculation', status: 'Present' as const, alertSent: false },
  { name: 'Amna Farooq',    roll: 'JE-2026-079', class: 'VII-B', programme: 'Middle School', status: 'Present' as const, alertSent: false },
]

const WEEK = [
  { day: 'Mon', present: 231, total: 247 },
  { day: 'Tue', present: 238, total: 247 },
  { day: 'Wed', present: 225, total: 247 },
  { day: 'Thu', present: 241, total: 247 },
  { day: 'Fri', present: 218, total: 247 },
]

type Status = 'Present' | 'Absent' | 'Late'

const STATUS_STYLE: Record<Status, { pill: string; dot: string }> = {
  Present: { pill: 'bg-success-bg text-success',  dot: 'bg-success' },
  Absent:  { pill: 'bg-danger-bg text-danger',    dot: 'bg-danger'  },
  Late:    { pill: 'bg-warning-bg text-warning',  dot: 'bg-warning' },
}

const INITIALS = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

export default function AttendanceDashboard() {
  const absentCount = ROSTER.filter(s => s.status === 'Absent').length
  const alertPending = ROSTER.filter(s => s.status === 'Absent' && !s.alertSent).length

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
            {alertPending} absence alert{alertPending > 1 ? 's' : ''} pending dispatch
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {STATS.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Active daily class roster — 2/3 */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
            <div>
              <h2 className="text-[14px] font-semibold text-neutral-900">Active Class Roster</h2>
              <p className="text-[11.5px] text-neutral-400 mt-0.5">Single-click check-in · absence alerts auto-sent to parents</p>
            </div>
            <div className="flex items-center gap-2">
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
                  <th className="px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Alert Sent</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Check-In</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {ROSTER.map((s) => (
                  <tr key={s.roll} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${STATUS_STYLE[s.status].pill}`}>
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
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLE[s.status].pill}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLE[s.status].dot}`} />
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {s.status === 'Absent'
                        ? s.alertSent
                          ? <span className="flex items-center gap-1 text-[11px] font-semibold text-success"><MessageSquare size={11} /> Sent</span>
                          : <button className="flex items-center gap-1 text-[11.5px] font-semibold text-danger hover:text-danger/80 bg-danger-bg px-2.5 py-1 rounded-lg transition-colors">
                              <MessageSquare size={11} /> Send Alert
                            </button>
                        : <span className="text-[11px] text-neutral-300">—</span>
                      }
                    </td>
                    <td className="px-4 py-3.5">
                      <button className={`text-[12px] font-semibold px-3 py-1.5 rounded-xl transition-colors ${
                        s.status === 'Present'
                          ? 'bg-success text-white cursor-default'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-success-bg hover:text-success'
                      }`}>
                        {s.status === 'Present' ? '✓ In' : 'Check In'}
                      </button>
                    </td>
                  </tr>
                ))}
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
                    <span className="text-[12px] font-medium text-neutral-700 w-8">{d.day}</span>
                    <span className="text-[12px] text-neutral-500">{d.present}/{d.total}</span>
                    <span className={`text-[12px] font-semibold w-10 text-right ${pct >= 90 ? 'text-success' : 'text-warning'}`}>{pct}%</span>
                  </div>
                  <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-success' : 'bg-warning'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-6 pt-4 border-t border-neutral-100">
            <p className="text-[11.5px] text-neutral-400">Week average</p>
            <p className="text-[22px] font-bold text-neutral-900 mt-0.5">
              {Math.round(WEEK.reduce((a, d) => a + (d.present / d.total) * 100, 0) / WEEK.length)}%
            </p>
          </div>

          {/* Alert summary */}
          <div className="mt-4 pt-4 border-t border-neutral-100">
            <p className="text-[11.5px] text-neutral-400 mb-3">Absence alerts today</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[12px] text-neutral-600"><MessageSquare size={12} className="text-success" /> Sent</span>
                <span className="text-[12px] font-semibold text-neutral-900">{ROSTER.filter(s => s.status === 'Absent' && s.alertSent).length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[12px] text-neutral-600"><MessageSquare size={12} className="text-danger" /> Pending</span>
                <span className="text-[12px] font-semibold text-neutral-900">{alertPending}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
