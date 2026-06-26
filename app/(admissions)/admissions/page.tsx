import StatCard from '@/components/dashboard/StatCard'
import { Users, UserPlus, Inbox, KeyRound, FileText } from 'lucide-react'

const STATS = [
  { label: 'Total Students',     value: '247',  icon: <Users size={22} />,    iconBg: 'bg-ink-100',    iconColor: 'text-ink-600', sub: '↑ 12 this month', subUp: true  },
  { label: 'New Registrations',  value: '12',   icon: <UserPlus size={22} />, iconBg: 'bg-success-bg', iconColor: 'text-success', sub: '3 enrolled today'              },
  { label: 'Pending Enquiries',  value: '14',   icon: <Inbox size={22} />,    iconBg: 'bg-danger-bg',  iconColor: 'text-danger',  sub: '3 new today'                   },
  { label: 'Parent IDs Issued',  value: '231',  icon: <KeyRound size={22} />, iconBg: 'bg-warning-bg', iconColor: 'text-warning', sub: 'Auto-dispatched on enrolment'  },
]

const ENQUIRIES = [
  { parent: 'Rashid Iqbal',    phone: '+92 300 1234567', program: 'Primary',       msg: 'Looking to enroll my 7-year-old daughter.', date: '24 Jun', status: 'New'       },
  { parent: 'Aisha Siddiqui',  phone: '+92 321 7654321', program: 'Matriculation', msg: 'My son is transferring from DPS.',           date: '23 Jun', status: 'Contacted' },
  { parent: 'Tariq Mehmood',   phone: '+92 333 1112223', program: 'Intermediate',  msg: 'Enquiring about science subjects.',          date: '22 Jun', status: 'New'       },
  { parent: 'Maria Ahmed',     phone: '+92 311 9998887', program: 'Middle School', msg: 'Would like to visit the campus first.',      date: '21 Jun', status: 'Pending'   },
  { parent: 'Khalid Farooq',   phone: '+92 345 6667778', program: 'Primary',       msg: 'Three children to enroll together.',         date: '20 Jun', status: 'Contacted' },
]

// Registration pipeline — each student with parent credential dispatch status
const PIPELINE = [
  { name: 'Zara Hussain',   roll: 'JE-2026-047', programme: 'Middle School', parentName: 'Kamil Hussain', credentialSent: true,  pdfReady: true,  date: '24 Jun 2026' },
  { name: 'Ahmed Ali',      roll: 'JE-2026-001', programme: 'Matriculation', parentName: 'Ali Hassan',    credentialSent: true,  pdfReady: true,  date: '15 Jan 2026' },
  { name: 'Sara Khan',      roll: 'JE-2026-002', programme: 'Primary',       parentName: 'Yasmin Khan',   credentialSent: true,  pdfReady: true,  date: '14 Jan 2026' },
  { name: 'Bilal Raza',     roll: 'JE-2026-003', programme: 'Intermediate',  parentName: 'Rashid Raza',   credentialSent: true,  pdfReady: true,  date: '12 Jan 2026' },
  { name: 'Fatima Noor',    roll: 'JE-2026-004', programme: 'Middle School', parentName: 'Noor Ahmed',    credentialSent: true,  pdfReady: false, date: '10 Jan 2026' },
  { name: 'Usman Sheikh',   roll: 'JE-2026-005', programme: 'Matriculation', parentName: '—',              credentialSent: false, pdfReady: false, date: '8 Jan 2026'  },
]

const INITIALS = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

const STATUS_STYLE: Record<string, string> = {
  New:       'bg-ink-100 text-ink-700',
  Contacted: 'bg-success-bg text-success',
  Pending:   'bg-warning-bg text-warning',
}

export default function AdmissionsDashboard() {
  return (
    <>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[20px] font-bold text-neutral-900">Admissions Pipeline</h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">Student registration, parent credential dispatch, and institutional PDF records.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a href="/admissions/students/new" className="flex items-center gap-2 px-4 py-2 bg-ink-700 text-white text-[13px] font-semibold rounded-xl hover:bg-ink-800 transition-colors no-underline">
            <UserPlus size={14} /> Enrol Student
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {STATS.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Registration pipeline */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div>
            <h2 className="text-[14px] font-semibold text-neutral-900">Student Registration Pipeline</h2>
            <p className="text-[11.5px] text-neutral-400 mt-0.5">Upload or delete records · parent IDs auto-dispatched on enrolment</p>
          </div>
          <a href="/admissions/students" className="text-[12px] text-ink-600 hover:text-ink-800 no-underline font-medium">All records →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-neutral-50 text-left">
                <th className="px-6 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Student</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Programme</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Parent</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Parent ID</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">PDF Record</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {PIPELINE.map((s) => (
                <tr key={s.roll} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-ink-100 text-ink-700 flex items-center justify-center font-mono text-[10px] font-bold shrink-0">
                        {INITIALS(s.name)}
                      </div>
                      <div>
                        <span className="block font-medium text-neutral-900">{s.name}</span>
                        <span className="block text-[11px] font-mono text-neutral-400">{s.roll}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-neutral-700">{s.programme}</td>
                  <td className="px-4 py-3.5 text-neutral-600">{s.parentName}</td>
                  <td className="px-4 py-3.5">
                    {s.credentialSent
                      ? <span className="flex items-center gap-1 text-[11px] font-semibold text-success">
                          <KeyRound size={11} /> Dispatched
                        </span>
                      : <span className="text-[11px] font-semibold text-danger">Not issued</span>
                    }
                  </td>
                  <td className="px-4 py-3.5">
                    {s.pdfReady
                      ? <button className="flex items-center gap-1 text-[11.5px] font-medium text-ink-600 hover:text-ink-800 transition-colors">
                          <FileText size={12} /> Download
                        </button>
                      : <span className="text-[11px] text-neutral-400">Pending</span>
                    }
                  </td>
                  <td className="px-4 py-3.5">
                    <button className="text-[11.5px] text-danger hover:text-danger font-medium opacity-60 hover:opacity-100 transition-opacity">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enquiries */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <h2 className="text-[14px] font-semibold text-neutral-900">Incoming Enquiries</h2>
          <a href="/admissions/enquiries" className="text-[12px] text-ink-600 hover:text-ink-800 no-underline font-medium">View all →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-neutral-50 text-left">
                <th className="px-6 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Parent / Guardian</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Programme</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Message</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {ENQUIRIES.map((e, i) => (
                <tr key={i} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center font-mono text-[10px] font-bold shrink-0">
                        {INITIALS(e.parent)}
                      </div>
                      <div>
                        <span className="block font-medium text-neutral-900">{e.parent}</span>
                        <span className="block text-[11px] text-neutral-400 font-mono">{e.phone}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-neutral-700">{e.program}</td>
                  <td className="px-4 py-3.5 text-neutral-500 max-w-xs truncate">{e.msg}</td>
                  <td className="px-4 py-3.5 text-neutral-400">{e.date}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLE[e.status] ?? ''}`}>
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
