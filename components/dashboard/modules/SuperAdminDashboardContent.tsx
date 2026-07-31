'use client'

import { useState } from 'react'
import StatCard from '@/components/dashboard/StatCard'
import {
  Users, UserCog, CalendarCheck, AlertOctagon, Activity,
  AlertTriangle, UserPlus, ArrowUpCircle, X, ChevronRight,
} from 'lucide-react'
import { setStaffActiveAction } from '@/lib/actions/staff'
import type { StaffMember } from '@/lib/staff/fetch'
import type { AuditEntry } from '@/lib/audit/fetch'

export type GradeCount = { label: string; count: number; color: string; to: string | null }

type Props = {
  totalStudents: number
  enrolledThisMonth: number
  subAdminCount: number
  inactiveSubAdminCount: number
  todaysAttendancePct: number | null
  attendanceDelta: number | null
  flaggedCount: number
  staffPreview: StaffMember[]
  gradeCounts: GradeCount[]
}

const ROLE_DOT: Record<string, string> = {
  'Admissions Admin': 'bg-[#A26D53]',
  'Attendance Admin': 'bg-[#487A63]',
  'Marks Admin': 'bg-[#7E587E]',
}

const INITIALS = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

function splitAction(action: string): { label: string; detail: string } {
  const i = action.indexOf(' — ')
  return i === -1 ? { label: action, detail: '' } : { label: action.slice(0, i), detail: action.slice(i + 3) }
}

export default function SuperAdminDashboardContent({
  totalStudents, enrolledThisMonth, subAdminCount, inactiveSubAdminCount,
  todaysAttendancePct, attendanceDelta, flaggedCount, staffPreview, gradeCounts, auditEntries,
}: Props & { auditEntries: AuditEntry[] }) {
  const [showPromoteModal, setShowPromoteModal] = useState(false)
  const [promoteFrom,      setPromoteFrom]      = useState(gradeCounts[0]?.label ?? '')
  const [promoted,         setPromoted]          = useState(false)
  const [staff,            setStaff]             = useState<StaffMember[]>(staffPreview)
  const [confirmTarget,    setConfirmTarget]     = useState<StaffMember | null>(null)
  const [toggling,         setToggling]          = useState(false)

  const totalGraded   = gradeCounts.reduce((a, g) => a + g.count, 0)
  const selectedGrade = gradeCounts.find(g => g.label === promoteFrom)
  const promoteTo     = selectedGrade?.to ?? ''

  const STATS = [
    {
      label: 'Total Students', value: String(totalStudents), icon: <Users size={22} />, iconBg: 'bg-ink-100', iconColor: 'text-ink-600',
      sub: enrolledThisMonth > 0 ? `↑ ${enrolledThisMonth} enrolled this month` : 'No new enrolments this month',
      subUp: enrolledThisMonth > 0, href: '/super-admin/students',
    },
    {
      label: 'Sub-Administrators', value: String(subAdminCount), icon: <UserCog size={22} />, iconBg: 'bg-warning-bg', iconColor: 'text-warning',
      sub: inactiveSubAdminCount > 0 ? `${inactiveSubAdminCount} inactive account${inactiveSubAdminCount === 1 ? '' : 's'}` : 'All accounts active',
      subUp: inactiveSubAdminCount === 0, href: '/super-admin/staff',
    },
    {
      label: "Today's Attendance", value: todaysAttendancePct !== null ? `${todaysAttendancePct}%` : '—', icon: <CalendarCheck size={22} />, iconBg: 'bg-success-bg', iconColor: 'text-success',
      sub: attendanceDelta !== null ? `${attendanceDelta >= 0 ? '↑' : '↓'} ${Math.abs(attendanceDelta)}% vs last week` : 'No attendance marked yet',
      subUp: attendanceDelta !== null ? attendanceDelta >= 0 : undefined, href: '/super-admin/attendance',
    },
    {
      label: 'Flagged Events', value: String(flaggedCount), icon: <AlertOctagon size={22} />, iconBg: 'bg-danger-bg', iconColor: 'text-danger',
      sub: flaggedCount > 0 ? 'Review required' : 'All clear', href: '/super-admin/audit',
    },
  ]

  const handlePromote = () => {
    setPromoted(true)
    setTimeout(() => {
      setPromoted(false)
      setShowPromoteModal(false)
    }, 1800)
  }

  const applyToggle = async () => {
    if (!confirmTarget) return
    setToggling(true)
    const outcome = await setStaffActiveAction({ id: confirmTarget.id, active: true })
    setToggling(false)
    if (outcome.ok) {
      setStaff(prev => prev.map(a => a.id === confirmTarget.id ? { ...a, status: 'Active' } : a))
    }
    setConfirmTarget(null)
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-bold text-neutral-900">System Overview</h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">Master access — full system visibility</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-2 text-[12px] font-medium text-success bg-success-bg px-3 py-1.5 rounded-full border border-success/20">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse inline-block" />
            All systems operational
          </span>
          <button
            onClick={() => setShowPromoteModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-neutral-200 text-neutral-700 text-[13px] font-medium rounded-xl hover:bg-neutral-50 transition-colors"
          >
            <ArrowUpCircle size={14} className="text-ink-600" /> Promote Students
          </button>
          <a
            href="/super-admin/staff/new"
            className="flex items-center gap-2 px-3.5 py-2 bg-ink-700 text-white text-[13px] font-semibold rounded-xl hover:bg-ink-800 transition-colors no-underline"
          >
            <UserPlus size={14} /> Add Administrator
          </a>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Sub-admin table + grade enrolment */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Sub-admin table — 2/3 */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 gap-3">
            <div>
              <h2 className="text-[14px] font-semibold text-neutral-900">Sub-Administrator Profiles</h2>
              <p className="text-[11.5px] text-neutral-400 mt-0.5">Live lifecycle status — last login &amp; account activity</p>
            </div>
            <a href="/super-admin/staff" className="text-[12px] text-ink-600 hover:text-ink-800 no-underline font-medium shrink-0">Manage →</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[520px]">
              <thead>
                <tr className="bg-neutral-50 text-left">
                  <th className="px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Administrator</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider hidden sm:table-cell">Role</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider hidden md:table-cell">Last Login</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {staff.map((a) => (
                  <tr key={a.id} className={`hover:bg-neutral-50 transition-colors ${a.status === 'Inactive' ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-ink-100 text-ink-700 flex items-center justify-center font-mono text-[10px] font-bold shrink-0">
                          {INITIALS(a.name)}
                        </div>
                        <div className="min-w-0">
                          <span className="block font-medium text-neutral-900 truncate">{a.name}</span>
                          <span className="block text-[11px] text-neutral-400 truncate sm:hidden">{a.role}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 hidden sm:table-cell">
                      <span className="flex items-center gap-1.5 text-[12px] text-neutral-700">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ROLE_DOT[a.role] ?? 'bg-neutral-400'}`} />
                        {a.role}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-[12px] font-mono text-neutral-500 hidden md:table-cell">{a.lastLogin}</td>
                    <td className="px-3 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        a.status === 'Active' ? 'bg-success-bg text-success' : 'bg-neutral-100 text-neutral-500'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      {a.status === 'Active'
                        ? <a href="/super-admin/staff" className="text-[11.5px] text-ink-600 hover:text-ink-800 font-medium transition-colors no-underline">Edit ↗</a>
                        : <button onClick={() => setConfirmTarget(a)} className="text-[11.5px] text-success hover:text-success/80 font-semibold transition-colors">Reactivate</button>
                      }
                    </td>
                  </tr>
                ))}
                {staff.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-[13px] text-neutral-400">No sub-administrator accounts yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Enrolment by grade — 1/3, scrollbar hidden */}
        <div
          className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-6 overflow-y-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
        >
          <style>{`.no-sb::-webkit-scrollbar{display:none}`}</style>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[14px] font-semibold text-neutral-900">Enrolment by Grade</h2>
            <button
              onClick={() => setShowPromoteModal(true)}
              className="flex items-center gap-1 text-[11.5px] text-ink-600 hover:text-ink-800 font-medium transition-colors"
            >
              <ArrowUpCircle size={12} /> Promote
            </button>
          </div>
          <div className="space-y-4">
            {gradeCounts.map((g) => (
              <div key={g.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${g.color}`} />
                    <span className="text-[13px] text-neutral-700">{g.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-mono font-semibold text-neutral-900">{g.count}</span>
                    {g.to && (
                      <span className="text-[10px] text-neutral-400 hidden sm:inline">→ {g.to}</span>
                    )}
                  </div>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${g.color} transition-all`} style={{ width: totalGraded > 0 ? `${(g.count / totalGraded) * 100}%` : '0%' }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between">
            <span className="text-[12px] text-neutral-500">Total enrolled</span>
            <span className="text-[18px] font-bold text-neutral-900">{totalGraded}</span>
          </div>
        </div>
      </div>

      {/* Master audit log */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Activity size={16} className="text-ink-600 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-[14px] font-semibold text-neutral-900">Master Audit Log</h2>
              <p className="text-[11.5px] text-neutral-400 mt-0.5 hidden sm:block">All system-wide entries, edits, and overrides</p>
            </div>
          </div>
          <a href="/super-admin/audit" className="text-[12px] text-ink-600 hover:text-ink-800 no-underline font-medium shrink-0">Full log →</a>
        </div>
        <div className="divide-y divide-neutral-100">
          {auditEntries.map((entry) => {
            const { label, detail } = splitAction(entry.action)
            return (
              <div key={entry.id} className={`flex items-start gap-3 px-5 py-3.5 hover:bg-neutral-50 transition-colors ${entry.flag ? 'border-l-4 border-danger bg-danger-bg/25' : ''}`}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5 bg-ink-100 text-ink-700">
                  {INITIALS(entry.actor)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-medium text-neutral-900">{entry.actor}</span>
                    <span className="text-[12px] text-neutral-500">{label}</span>
                    {entry.flag && (
                      <span className="flex items-center gap-1 text-[10.5px] font-semibold text-danger bg-danger-bg border border-danger/20 px-2 py-0.5 rounded-full">
                        <AlertTriangle size={10} /> Flagged
                      </span>
                    )}
                  </div>
                  {detail && <span className="block text-[11.5px] text-neutral-400 truncate mt-0.5">{detail}</span>}
                </div>
                <span className="text-[11px] font-mono text-neutral-400 shrink-0 mt-0.5">{entry.time}</span>
              </div>
            )
          })}
          {auditEntries.length === 0 && (
            <div className="px-5 py-10 text-center text-[13px] text-neutral-400">No audit entries yet.</div>
          )}
        </div>
      </div>

      {/* ── Promote Students Modal ─────────────────────────────────────── */}
      {showPromoteModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={() => !promoted && setShowPromoteModal(false)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-ink-100 flex items-center justify-center">
                  <ArrowUpCircle size={18} className="text-ink-600" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-neutral-900">Promote Students</h3>
                  <p className="text-[11.5px] text-neutral-400 mt-0.5">Move passing students to next grade</p>
                </div>
              </div>
              <button
                onClick={() => setShowPromoteModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Source grade selector */}
              <div>
                <label className="block text-[12px] font-semibold text-neutral-700 mb-2">From Grade</label>
                <select
                  value={promoteFrom}
                  onChange={e => setPromoteFrom(e.target.value)}
                  className="w-full text-[13px] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-ink-300 cursor-pointer"
                >
                  {gradeCounts.filter(g => g.to !== 'Graduated').map(g => (
                    <option key={g.label}>{g.label}</option>
                  ))}
                </select>
              </div>

              {/* Summary card */}
              <div className="bg-ink-50 border border-ink-100 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1">
                    <p className="text-[11px] text-neutral-400 mb-1">From</p>
                    <p className="text-[14px] font-bold text-neutral-900">{promoteFrom}</p>
                  </div>
                  <ChevronRight size={20} className="text-ink-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[11px] text-neutral-400 mb-1">To</p>
                    <p className="text-[14px] font-bold text-neutral-900">{promoteTo}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-ink-100">
                  <div>
                    <p className="text-[11px] text-neutral-400">Eligible students</p>
                    <p className="text-[20px] font-bold text-ink-700">
                      {selectedGrade?.count ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-neutral-400">Sections</p>
                    <p className="text-[13px] font-semibold text-neutral-700 mt-1">A · B · C · D</p>
                  </div>
                </div>
              </div>

              {/* Warning note */}
              <div className="flex items-start gap-2.5 bg-warning-bg border border-warning/20 rounded-xl p-3.5">
                <AlertTriangle size={14} className="text-warning mt-0.5 shrink-0" />
                <p className="text-[11.5px] text-warning leading-relaxed">
                  This action promotes all eligible students simultaneously. Individual transfers can be done from the student profile.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => setShowPromoteModal(false)}
                  className="flex-1 py-3 text-[13px] font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePromote}
                  disabled={promoted}
                  className={`flex-1 py-3 text-[13px] font-semibold rounded-xl transition-all ${
                    promoted
                      ? 'bg-success text-white cursor-default'
                      : 'bg-ink-700 text-white hover:bg-ink-800'
                  }`}
                >
                  {promoted ? '✓ Promoted' : `Promote ${selectedGrade?.count ?? 0} Students`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={() => !toggling && setConfirmTarget(null)} />
          <div className="relative w-full sm:max-w-sm bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-success-bg flex items-center justify-center">
                  <UserCog size={18} className="text-success" />
                </div>
                <h3 className="text-[15px] font-bold text-neutral-900">Reactivate account?</h3>
              </div>
              <button onClick={() => setConfirmTarget(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-[13px] text-neutral-600 leading-relaxed mb-5">
                {confirmTarget.name} will regain portal access with their existing credentials.
              </p>
              <div className="flex items-center gap-3">
                <button onClick={() => setConfirmTarget(null)} disabled={toggling} className="flex-1 py-3 text-[13px] font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors disabled:opacity-60">Cancel</button>
                <button onClick={applyToggle} disabled={toggling} className="flex-1 py-3 text-[13px] font-semibold rounded-xl text-white bg-success hover:bg-success/90 transition-colors disabled:opacity-60">{toggling ? 'Saving…' : 'Reactivate'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
