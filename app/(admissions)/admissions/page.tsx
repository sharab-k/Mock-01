'use client'

import { useState } from 'react'
import StatCard from '@/components/dashboard/StatCard'
import { Users, UserPlus, Inbox, KeyRound, FileText, Copy, Check, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

const STATS = [
  { label: 'Total Students',    value: '247', icon: <Users size={22} />,    iconBg: 'bg-ink-100',    iconColor: 'text-ink-600', sub: '↑ 12 this month', subUp: true, href: '/admissions/students'  },
  { label: 'New Registrations', value: '12',  icon: <UserPlus size={22} />, iconBg: 'bg-success-bg', iconColor: 'text-success', sub: '3 enrolled today',              href: '/admissions/students'  },
  { label: 'Pending Enquiries', value: '14',  icon: <Inbox size={22} />,    iconBg: 'bg-danger-bg',  iconColor: 'text-danger',  sub: '3 new today',                   href: '/admissions/enquiries' },
  { label: 'Parent IDs Issued', value: '231', icon: <KeyRound size={22} />, iconBg: 'bg-warning-bg', iconColor: 'text-warning', sub: 'Auto-dispatched on enrolment'                                  },
]

const ENQUIRIES = [
  { parent: 'Rashid Iqbal',   phone: '+92 300 1234567', program: 'Primary',       msg: 'Looking to enroll my 7-year-old daughter in primary school. She has no prior formal schooling.', date: '24 Jun', status: 'Unread'          },
  { parent: 'Aisha Siddiqui', phone: '+92 321 7654321', program: 'Matriculation', msg: 'My son is transferring from DPS. He has completed Grade 8 and will be joining Grade 9.', date: '23 Jun', status: 'Contacted'              },
  { parent: 'Tariq Mehmood',  phone: '+92 333 1112223', program: 'Intermediate',  msg: 'Enquiring about available science subjects for F.Sc. Does the academy offer Physics and Chemistry together?', date: '22 Jun', status: 'Unread' },
  { parent: 'Maria Ahmed',    phone: '+92 311 9998887', program: 'Middle School', msg: 'Would like to visit the campus first before making a decision. Please advise on available timings.', date: '21 Jun', status: 'Awaiting Visit' },
  { parent: 'Khalid Farooq',  phone: '+92 345 6667778', program: 'Primary',       msg: 'We have three children to enroll together — aged 6, 8, and 9. Enquiring about sibling discounts.', date: '20 Jun', status: 'Contacted'     },
]

const PIPELINE = [
  { name: 'Zara Hussain', roll: 'JE-2026-047', programme: 'Middle School', parentName: 'Kamil Hussain' as string | null, credentialSent: true,  pdfReady: true,  date: '24 Jun 2026' },
  { name: 'Ahmed Ali',    roll: 'JE-2026-001', programme: 'Matriculation', parentName: 'Ali Hassan'    as string | null, credentialSent: true,  pdfReady: true,  date: '15 Jan 2026' },
  { name: 'Sara Khan',    roll: 'JE-2026-002', programme: 'Primary',       parentName: 'Yasmin Khan'   as string | null, credentialSent: true,  pdfReady: true,  date: '14 Jan 2026' },
  { name: 'Bilal Raza',   roll: 'JE-2026-003', programme: 'Intermediate',  parentName: 'Rashid Raza'   as string | null, credentialSent: true,  pdfReady: true,  date: '12 Jan 2026' },
  { name: 'Fatima Noor',  roll: 'JE-2026-004', programme: 'Middle School', parentName: 'Noor Ahmed'    as string | null, credentialSent: true,  pdfReady: false, date: '10 Jan 2026' },
  { name: 'Usman Sheikh', roll: 'JE-2026-005', programme: 'Matriculation', parentName: null,                             credentialSent: false, pdfReady: false, date: '8 Jan 2026'  },
]

const INITIALS = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

const STATUS_STYLE: Record<string, string> = {
  Unread:          'bg-ink-100 text-ink-700',
  Contacted:       'bg-success-bg text-success',
  'Awaiting Visit':'bg-warning-bg text-warning',
}

export default function AdmissionsDashboard() {
  const [expandedEnquiry, setExpandedEnquiry] = useState<number | null>(null)
  const [copiedPhone, setCopiedPhone]         = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm]     = useState<string | null>(null)

  const copyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone)
      setCopiedPhone(phone)
      setTimeout(() => setCopiedPhone(null), 1500)
    } catch { /* clipboard blocked */ }
  }

  return (
    <>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[20px] font-bold text-neutral-900">Admissions Pipeline</h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">Student registration, parent credential dispatch, and institutional PDF records.</p>
        </div>
        <a
          href="/admissions/students/new"
          className="flex items-center gap-2 px-4 py-2 bg-ink-700 text-white text-[13px] font-semibold rounded-xl hover:bg-ink-800 transition-colors no-underline shrink-0"
        >
          <UserPlus size={14} /> Enrol Student
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {STATS.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Registration pipeline */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div>
            <h2 className="text-[14px] font-semibold text-neutral-900">Student Registration Pipeline</h2>
            <p className="text-[11.5px] text-neutral-400 mt-0.5">Delete records with confirmation · parent IDs auto-dispatched on enrolment</p>
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
                <th className="px-4 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Delete</th>
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
                  <td className="px-4 py-3.5 text-neutral-600">
                    {s.parentName ?? <span className="text-neutral-400 italic text-[12px]">Not assigned</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    {s.credentialSent ? (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-success">
                        <KeyRound size={11} /> Dispatched
                      </span>
                    ) : (
                      <button className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-600 hover:text-ink-800 bg-ink-50 border border-ink-100 px-2.5 py-1 rounded-lg transition-colors">
                        <KeyRound size={11} /> Issue Now
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {s.pdfReady ? (
                      <button className="flex items-center gap-1 text-[11.5px] font-medium text-ink-600 hover:text-ink-800 transition-colors">
                        <FileText size={12} /> Download
                      </button>
                    ) : (
                      <span className="text-[11px] text-neutral-400">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {deleteConfirm === s.roll ? (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setDeleteConfirm(null)} className="text-[11px] text-neutral-500 hover:text-neutral-700 font-medium">
                          Cancel
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-[11px] font-semibold text-white bg-danger hover:bg-danger/90 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          Confirm
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(s.roll)}
                        className="text-neutral-300 hover:text-danger transition-colors p-1.5 rounded-lg hover:bg-danger-bg"
                        title="Delete student record"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enquiries — expandable rows, phone copy */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div>
            <h2 className="text-[14px] font-semibold text-neutral-900">Incoming Enquiries</h2>
            <p className="text-[11.5px] text-neutral-400 mt-0.5">Click any row to expand the full message</p>
          </div>
          <a href="/admissions/enquiries" className="text-[12px] text-ink-600 hover:text-ink-800 no-underline font-medium">View all →</a>
        </div>
        <div className="divide-y divide-neutral-100">
          {ENQUIRIES.map((e, i) => (
            <div key={i}>
              {/* Row */}
              <div
                className="flex items-start gap-4 px-6 py-4 hover:bg-neutral-50 transition-colors cursor-pointer select-none"
                onClick={() => setExpandedEnquiry(expandedEnquiry === i ? null : i)}
              >
                <div className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">
                  {INITIALS(e.parent)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-neutral-900 text-[13px]">{e.parent}</span>
                    <span className="text-[11px] text-neutral-400">{e.program}</span>
                    <span className="text-neutral-300">·</span>
                    <span className="text-[11px] text-neutral-400">{e.date}</span>
                  </div>
                  {/* Phone + copy */}
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[11px] font-mono text-neutral-500">{e.phone}</span>
                    <button
                      onClick={(ev) => { ev.stopPropagation(); copyPhone(e.phone) }}
                      className="text-neutral-300 hover:text-ink-600 transition-colors p-0.5 rounded"
                      title="Copy phone number"
                    >
                      {copiedPhone === e.phone
                        ? <Check size={11} className="text-success" />
                        : <Copy size={11} />
                      }
                    </button>
                  </div>
                  {/* Message — truncated in collapsed state */}
                  <p className={`text-[12px] text-neutral-500 mt-1.5 leading-relaxed ${expandedEnquiry === i ? '' : 'truncate'}`}>
                    {e.msg}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 mt-0.5">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLE[e.status] ?? 'bg-neutral-100 text-neutral-500'}`}>
                    {e.status}
                  </span>
                  {expandedEnquiry === i
                    ? <ChevronUp size={14} className="text-neutral-400" />
                    : <ChevronDown size={14} className="text-neutral-400" />
                  }
                </div>
              </div>

              {/* Expanded actions */}
              {expandedEnquiry === i && (
                <div className="px-6 pb-4 pt-2 bg-neutral-50 border-t border-neutral-100">
                  <div className="flex items-center gap-2 mt-1">
                    <a
                      href={`tel:${e.phone}`}
                      onClick={(ev) => ev.stopPropagation()}
                      className="flex items-center gap-1.5 text-[12px] font-medium text-ink-600 hover:text-ink-800 bg-white border border-neutral-200 px-3 py-1.5 rounded-lg transition-colors no-underline"
                    >
                      Call {e.parent.split(' ')[0]}
                    </a>
                    <a
                      href="/admissions/students/new"
                      onClick={(ev) => ev.stopPropagation()}
                      className="flex items-center gap-1.5 text-[12px] font-semibold text-white bg-ink-700 hover:bg-ink-800 px-3 py-1.5 rounded-lg transition-colors no-underline"
                    >
                      <UserPlus size={12} /> Enrol Student
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
