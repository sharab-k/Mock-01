import StatCard from '@/components/dashboard/StatCard'
import { Users, UserCog, CalendarCheck, ShieldCheck, Activity, AlertTriangle } from 'lucide-react'

const STATS = [
  { label: 'Total Students',    value: '247', icon: <Users size={22} />,       iconBg: 'bg-ink-100',    iconColor: 'text-ink-600', sub: '↑ 12 enrolled this month', subUp: true },
  { label: 'Sub-Administrators',value: '8',   icon: <UserCog size={22} />,      iconBg: 'bg-warning-bg', iconColor: 'text-warning', sub: '3 admins · 5 operators'              },
  { label: "Today's Attendance",value: '91.3%',icon: <CalendarCheck size={22} />,iconBg: 'bg-success-bg',iconColor: 'text-success', sub: '↑ 2.1% vs last week', subUp: true    },
  { label: 'System Visibility', value: 'LIVE', icon: <ShieldCheck size={22} />, iconBg: 'bg-ink-100',    iconColor: 'text-ink-600', sub: 'All modules operational'              },
]

// Sub-administrator lifecycle
const ADMIN_PROFILES = [
  { name: 'Ms. Asma Tahir',    role: 'Admissions Admin',  email: 'a.tahir@jeacademy.edu.pk', lastLogin: '24 Jun 2026, 08:14', status: 'Active'   },
  { name: 'Mr. Junaid Karim',  role: 'Attendance Admin',  email: 'j.karim@jeacademy.edu.pk', lastLogin: '24 Jun 2026, 08:01', status: 'Active'   },
  { name: 'Ms. Rida Farooq',   role: 'Marks Admin',       email: 'r.farooq@jeacademy.edu.pk',lastLogin: '23 Jun 2026, 14:32', status: 'Active'   },
  { name: 'Mr. Bilal Chaudhry',role: 'Attendance Admin',  email: 'b.chaudhry@jeacademy.edu.pk',lastLogin: '22 Jun 2026, 09:10',status: 'Inactive' },
  { name: 'Ms. Huma Zaidi',    role: 'Admissions Admin',  email: 'h.zaidi@jeacademy.edu.pk', lastLogin: '24 Jun 2026, 07:55', status: 'Active'   },
]

// Master audit log
const AUDIT_LOG = [
  { actor: 'Ms. Rida Farooq',   action: 'Edited marks',          detail: 'Ahmed Ali · Mathematics · Monthly',     time: '09:42 AM', flag: false },
  { actor: 'Mr. Junaid Karim',  action: 'Marked attendance',      detail: 'Class X-A · 24 Jun 2026',               time: '08:35 AM', flag: false },
  { actor: 'Ms. Asma Tahir',    action: 'Enrolled student',       detail: 'Zara Hussain · JE-2026-047',            time: '08:12 AM', flag: false },
  { actor: 'Ms. Asma Tahir',    action: 'Parent credentials sent',detail: 'Parent of Zara Hussain auto-generated', time: '08:12 AM', flag: false },
  { actor: 'Mr. Bilal Chaudhry',action: 'Deleted attendance record',detail: 'Class VII-B · 20 Jun 2026',           time: '23 Jun',   flag: true  },
  { actor: 'System',            action: 'WhatsApp alert sent',    detail: 'Absent: Usman Sheikh · parent notified',time: '08:36 AM', flag: false },
  { actor: 'Ms. Rida Farooq',   action: 'Bulk marks upload',      detail: 'Physics Half-Yearly · 31 students',     time: '22 Jun',   flag: false },
]

const PROGRAMME_COUNTS = [
  { label: 'Primary',       count: 68, color: 'bg-ink-200' },
  { label: 'Middle School', count: 72, color: 'bg-ink-300' },
  { label: 'Matriculation', count: 61, color: 'bg-ink-500' },
  { label: 'Intermediate',  count: 46, color: 'bg-ink-700' },
]

const INITIALS = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

const ROLE_DOT: Record<string, string> = {
  'Admissions Admin': 'bg-[#A26D53]',
  'Attendance Admin': 'bg-[#487A63]',
  'Marks Admin':      'bg-[#7E587E]',
}

export default function SuperAdminDashboard() {
  const total = PROGRAMME_COUNTS.reduce((a, p) => a + p.count, 0)

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-neutral-900">System Overview</h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">Master access — full system visibility · 24 Jun 2026</p>
        </div>
        <span className="flex items-center gap-2 text-[12px] font-medium text-success bg-success-bg px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse inline-block" />
          All systems operational
        </span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {STATS.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Sub-admin lifecycle + enrolment */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Sub-admin lifecycle — 2/3 */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
            <div>
              <h2 className="text-[14px] font-semibold text-neutral-900">Sub-Administrator Profiles</h2>
              <p className="text-[11.5px] text-neutral-400 mt-0.5">Live lifecycle status — last login & account activity</p>
            </div>
            <a href="/super-admin/staff" className="text-[12px] text-ink-600 hover:text-ink-800 no-underline font-medium">Manage →</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-neutral-50 text-left">
                  <th className="px-6 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Administrator</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Last Login</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {ADMIN_PROFILES.map((a) => (
                  <tr key={a.email} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-ink-100 text-ink-700 flex items-center justify-center font-mono text-[10px] font-bold shrink-0">
                          {INITIALS(a.name)}
                        </div>
                        <div>
                          <span className="block font-medium text-neutral-900">{a.name}</span>
                          <span className="block text-[11px] text-neutral-400">{a.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-1.5 text-[12px] text-neutral-700">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ROLE_DOT[a.role] ?? 'bg-neutral-400'}`} />
                        {a.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[12px] font-mono text-neutral-500">{a.lastLogin}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${a.status === 'Active' ? 'bg-success-bg text-success' : 'bg-neutral-100 text-neutral-500'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <button className="text-[11.5px] text-ink-600 hover:text-ink-800 font-medium">Override ↗</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Enrolment by programme — 1/3 */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-6">
          <h2 className="text-[14px] font-semibold text-neutral-900 mb-5">Enrolment by Programme</h2>
          <div className="space-y-4">
            {PROGRAMME_COUNTS.map((p) => (
              <div key={p.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[13px] text-neutral-700">{p.label}</span>
                  <span className="text-[12px] font-mono font-semibold text-neutral-900">{p.count}</span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${p.color} transition-all`} style={{ width: `${(p.count / total) * 100}%` }} />
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <Activity size={16} className="text-ink-600" />
            <div>
              <h2 className="text-[14px] font-semibold text-neutral-900">Master Audit Log</h2>
              <p className="text-[11.5px] text-neutral-400 mt-0.5">All system-wide entries, edits, and overrides</p>
            </div>
          </div>
          <a href="/super-admin/audit" className="text-[12px] text-ink-600 hover:text-ink-800 no-underline font-medium">Full log →</a>
        </div>
        <div className="divide-y divide-neutral-100">
          {AUDIT_LOG.map((entry, i) => (
            <div key={i} className={`flex items-center gap-4 px-6 py-3.5 hover:bg-neutral-50 transition-colors ${entry.flag ? 'bg-danger-bg/30' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${entry.actor === 'System' ? 'bg-ink-100 text-ink-500' : 'bg-ink-100 text-ink-700'}`}>
                {entry.actor === 'System' ? '⚙' : INITIALS(entry.actor)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-medium text-neutral-900">{entry.actor}</span>
                  <span className="text-[12px] text-neutral-500">{entry.action}</span>
                  {entry.flag && <AlertTriangle size={12} className="text-danger shrink-0" />}
                </div>
                <span className="block text-[11.5px] text-neutral-400 truncate mt-0.5">{entry.detail}</span>
              </div>
              <span className="text-[11px] font-mono text-neutral-400 shrink-0">{entry.time}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
