'use client'

import { useState } from 'react'
import StatCard from '@/components/dashboard/StatCard'
import {
  Users, UserCog, CalendarCheck, AlertOctagon, Activity,
  AlertTriangle, UserPlus, ArrowUpCircle, X, ChevronRight,
} from 'lucide-react'

const STATS = [
  { label: 'Total Students',    value: '186', icon: <Users size={22} />,        iconBg: 'bg-ink-100',    iconColor: 'text-ink-600', sub: '↑ 12 enrolled this month', subUp: true,  href: '/super-admin/students'   },
  { label: 'Sub-Administrators',value: '8',   icon: <UserCog size={22} />,      iconBg: 'bg-warning-bg', iconColor: 'text-warning', sub: '1 inactive account',       subUp: false, href: '/super-admin/staff'      },
  { label: "Today's Attendance",value: '91%', icon: <CalendarCheck size={22} />,iconBg: 'bg-success-bg', iconColor: 'text-success', sub: '↑ 2.1% vs last week',      subUp: true,  href: '/super-admin/attendance' },
  { label: 'Flagged Events',    value: '1',   icon: <AlertOctagon size={22} />, iconBg: 'bg-danger-bg',  iconColor: 'text-danger',  sub: 'Review required',                        href: '/super-admin/audit'      },
]

const ADMIN_PROFILES = [
  { name: 'Ms. Asma Tahir',    role: 'Admissions Admin', email: 'a.tahir@jeacademy.edu.pk',   lastLogin: '24 Jun 2026, 08:14', status: 'Active'   },
  { name: 'Mr. Junaid Karim',  role: 'Attendance Admin', email: 'j.karim@jeacademy.edu.pk',   lastLogin: '24 Jun 2026, 08:01', status: 'Active'   },
  { name: 'Ms. Rida Farooq',   role: 'Marks Admin',      email: 'r.farooq@jeacademy.edu.pk',  lastLogin: '23 Jun 2026, 14:32', status: 'Active'   },
  { name: 'Mr. Bilal Chaudhry',role: 'Attendance Admin', email: 'b.chaudhry@jeacademy.edu.pk',lastLogin: '22 Jun 2026, 09:10', status: 'Inactive' },
  { name: 'Ms. Huma Zaidi',    role: 'Admissions Admin', email: 'h.zaidi@jeacademy.edu.pk',   lastLogin: '24 Jun 2026, 07:55', status: 'Active'   },
]

const AUDIT_LOG = [
  { actor: 'Ms. Rida Farooq',   action: 'Edited marks',           detail: 'Ahmed Ali · Mathematics · Monthly',            time: '09:42 AM', flag: false },
  { actor: 'Mr. Junaid Karim',  action: 'Marked attendance',       detail: 'Grade 10-A · 24 Jun 2026',                     time: '08:35 AM', flag: false },
  { actor: 'Ms. Asma Tahir',    action: 'Enrolled student',        detail: 'Zara Hussain · JE-2026-047 · Grade 9-B',       time: '08:12 AM', flag: false },
  { actor: 'Ms. Asma Tahir',    action: 'Parent credentials sent', detail: 'Parent of Zara Hussain auto-generated',        time: '08:12 AM', flag: false },
  { actor: 'Mr. Bilal Chaudhry',action: 'Deleted record',          detail: 'Grade 11-A · 20 Jun 2026 — inactive account',  time: '23 Jun',   flag: true  },
  { actor: 'System',            action: 'WhatsApp alert sent',     detail: 'Absent: Usman Sheikh · parent notified',       time: '08:36 AM', flag: false },
  { actor: 'Ms. Rida Farooq',   action: 'Bulk marks upload',       detail: 'Physics Half-Yearly · Grade 11 · 31 students', time: '22 Jun',   flag: false },
]

const GRADE_COUNTS = [
  { label: 'Grade 9',  count: 52, color: 'bg-[#487A63]', from: null,       to: 'Grade 10' },
  { label: 'Grade 10', count: 48, color: 'bg-[#547B96]', from: 'Grade 9',  to: 'Grade 11' },
  { label: 'Grade 11', count: 46, color: 'bg-[#495F8D]', from: 'Grade 10', to: 'Grade 12' },
  { label: 'Grade 12', count: 40, color: 'bg-[#7E587E]', from: 'Grade 11', to: 'Graduated' },
]

const ROLE_DOT: Record<string, string> = {
  'Admissions Admin': 'bg-[#A26D53]',
  'Attendance Admin': 'bg-[#487A63]',
  'Marks Admin':      'bg-[#7E587E]',
}

const INITIALS = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

export default function SuperAdminDashboard() {
  const [showPromoteModal, setShowPromoteModal] = useState(false)
  const [promoteFrom,      setPromoteFrom]      = useState('Grade 9')
  const [promoted,         setPromoted]          = useState(false)

  const total       = GRADE_COUNTS.reduce((a, g) => a + g.count, 0)
  const selectedGrade = GRADE_COUNTS.find(g => g.label === promoteFrom)
  const promoteTo   = selectedGrade?.to ?? ''

  const handlePromote = () => {
    setPromoted(true)
    setTimeout(() => {
      setPromoted(false)
      setShowPromoteModal(false)
    }, 1800)
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-bold text-neutral-900">System Overview</h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">Master access — full system visibility · 24 Jun 2026</p>
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
                {ADMIN_PROFILES.map((a) => (
                  <tr key={a.email} className={`hover:bg-neutral-50 transition-colors ${a.status === 'Inactive' ? 'opacity-60' : ''}`}>
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
                        ? <button className="text-[11.5px] text-ink-600 hover:text-ink-800 font-medium transition-colors">Edit ↗</button>
                        : <button className="text-[11.5px] text-success hover:text-success/80 font-semibold transition-colors">Reactivate</button>
                      }
                    </td>
                  </tr>
                ))}
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
            {GRADE_COUNTS.map((g) => (
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
                  <div className={`h-full rounded-full ${g.color} transition-all`} style={{ width: `${(g.count / total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between">
            <span className="text-[12px] text-neutral-500">Total enrolled</span>
            <span className="text-[18px] font-bold text-neutral-900">{total}</span>
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
          {AUDIT_LOG.map((entry, i) => (
            <div key={i} className={`flex items-start gap-3 px-5 py-3.5 hover:bg-neutral-50 transition-colors ${entry.flag ? 'border-l-4 border-danger bg-danger-bg/25' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5 ${
                entry.actor === 'System' ? 'bg-ink-100 text-ink-500' : 'bg-ink-100 text-ink-700'
              }`}>
                {entry.actor === 'System' ? '⚙' : INITIALS(entry.actor)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-medium text-neutral-900">{entry.actor}</span>
                  <span className="text-[12px] text-neutral-500">{entry.action}</span>
                  {entry.flag && (
                    <span className="flex items-center gap-1 text-[10.5px] font-semibold text-danger bg-danger-bg border border-danger/20 px-2 py-0.5 rounded-full">
                      <AlertTriangle size={10} /> Flagged
                    </span>
                  )}
                </div>
                <span className="block text-[11.5px] text-neutral-400 truncate mt-0.5">{entry.detail}</span>
              </div>
              <span className="text-[11px] font-mono text-neutral-400 shrink-0 mt-0.5">{entry.time}</span>
            </div>
          ))}
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
                  {GRADE_COUNTS.filter(g => g.to !== 'Graduated').map(g => (
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
                    <p className="text-[13px] font-semibold text-neutral-700 mt-1">A · B · C</p>
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
    </>
  )
}
