'use client'

import { useState, useMemo } from 'react'
import StatCard from '@/components/dashboard/StatCard'
import {
  Users, UserPlus, Inbox, KeyRound, FileText, Copy, Check,
  Trash2, ChevronDown, ChevronUp, Pencil, ArrowUpCircle, X, ChevronRight, AlertTriangle,
} from 'lucide-react'

// ── Data ──────────────────────────────────────────────────────────────────────
const PIPELINE_BASE = [
  { name: 'Zara Hussain',  roll: 'JE-2026-047', grade: '9',  section: 'B', parentName: 'Kamil Hussain'  as string | null, credentialSent: true,  pdfReady: true,  date: '24 Jun 2026' },
  { name: 'Ahmed Ali',     roll: 'JE-2026-001', grade: '10', section: 'A', parentName: 'Ali Hassan'     as string | null, credentialSent: true,  pdfReady: true,  date: '15 Jan 2026' },
  { name: 'Sara Khan',     roll: 'JE-2026-002', grade: '9',  section: 'A', parentName: 'Yasmin Khan'    as string | null, credentialSent: true,  pdfReady: true,  date: '14 Jan 2026' },
  { name: 'Bilal Raza',    roll: 'JE-2026-003', grade: '12', section: 'A', parentName: 'Rashid Raza'    as string | null, credentialSent: true,  pdfReady: true,  date: '12 Jan 2026' },
  { name: 'Fatima Noor',   roll: 'JE-2026-004', grade: '11', section: 'B', parentName: 'Noor Ahmed'     as string | null, credentialSent: true,  pdfReady: false, date: '10 Jan 2026' },
  { name: 'Usman Sheikh',  roll: 'JE-2026-005', grade: '10', section: 'B', parentName: null,                              credentialSent: false, pdfReady: false, date: '8 Jan 2026'  },
  { name: 'Hina Baig',     roll: 'JE-2026-018', grade: '9',  section: 'C', parentName: 'Tariq Baig'     as string | null, credentialSent: true,  pdfReady: true,  date: '6 Jan 2026'  },
  { name: 'Kamran Malik',  roll: 'JE-2026-031', grade: '12', section: 'B', parentName: 'Saleem Malik'   as string | null, credentialSent: true,  pdfReady: true,  date: '4 Jan 2026'  },
  { name: 'Dawood Ilyas',  roll: 'JE-2026-057', grade: '11', section: 'A', parentName: 'Ilyas Qureshi'  as string | null, credentialSent: true,  pdfReady: false, date: '2 Jan 2026'  },
]

const ENQUIRIES = [
  { parent: 'Rashid Iqbal',   phone: '+92 300 1234567', grade: '9',  msg: 'Looking to enroll my son in Grade 9 Sciences. He passed his 8th grade with distinction.', date: '24 Jun', status: 'Unread'         },
  { parent: 'Aisha Siddiqui', phone: '+92 321 7654321', grade: '10', msg: 'My son is transferring from DPS. He completed Grade 9 and will be joining Grade 10.',         date: '23 Jun', status: 'Contacted'       },
  { parent: 'Tariq Mehmood',  phone: '+92 333 1112223', grade: '11', msg: 'Enquiring about F.Sc sciences for Grade 11. Does the academy offer Phy, Chem, Bio together?', date: '22 Jun', status: 'Unread'         },
  { parent: 'Maria Ahmed',    phone: '+92 311 9998887', grade: '12', msg: 'Would like to visit campus for Grade 12 admission. Please advise on available timings.',      date: '21 Jun', status: 'Awaiting Visit' },
  { parent: 'Khalid Farooq',  phone: '+92 345 6667778', grade: '9',  msg: 'We have two children looking to join Grade 9 and Grade 10. Enquiring about sibling policy.',  date: '20 Jun', status: 'Contacted'      },
]

const GRADES    = ['All Grades', '9', '10', '11', '12']
const SECTIONS  = ['All Sections', 'A', 'B', 'C']

const INITIALS = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

const STATUS_STYLE: Record<string, string> = {
  Unread:          'bg-ink-100 text-ink-700',
  Contacted:       'bg-success-bg text-success',
  'Awaiting Visit':'bg-warning-bg text-warning',
}

type Student = typeof PIPELINE_BASE[number]

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdmissionsDashboard() {
  const [gradeFilter,     setGradeFilter]     = useState('All Grades')
  const [sectionFilter,   setSectionFilter]   = useState('All Sections')
  const [expandedEnquiry, setExpandedEnquiry] = useState<number | null>(null)
  const [copiedPhone,     setCopiedPhone]     = useState<string | null>(null)
  const [deleteConfirm,   setDeleteConfirm]   = useState<string | null>(null)
  const [editStudent,     setEditStudent]     = useState<Student | null>(null)
  const [showPromote,     setShowPromote]     = useState(false)
  const [promoteFrom,     setPromoteFrom]     = useState('9')
  const [promoted,        setPromoted]        = useState(false)

  const filteredPipeline = useMemo(() => PIPELINE_BASE.filter(s => {
    const gradeOk   = gradeFilter   === 'All Grades'   || s.grade   === gradeFilter
    const sectionOk = sectionFilter === 'All Sections' || s.section === sectionFilter
    return gradeOk && sectionOk
  }), [gradeFilter, sectionFilter])

  const filteredEnquiries = useMemo(() => ENQUIRIES.filter(e =>
    gradeFilter === 'All Grades' || e.grade === gradeFilter
  ), [gradeFilter])

  // Dynamic stats based on filter
  const totalStudents = filteredPipeline.length
  const newReg        = filteredPipeline.filter(s => s.date.includes('24 Jun') || s.date.includes('23 Jun')).length
  const pendingEnq    = filteredEnquiries.filter(e => e.status === 'Unread' || e.status === 'Awaiting Visit').length
  const parentIds     = filteredPipeline.filter(s => s.credentialSent).length

  const STATS = [
    { label: 'Students Enrolled', value: String(totalStudents), icon: <Users size={22} />,    iconBg: 'bg-ink-100',    iconColor: 'text-ink-600', sub: `${newReg} recent`,       subUp: newReg > 0 },
    { label: 'New Registrations', value: String(newReg),        icon: <UserPlus size={22} />, iconBg: 'bg-success-bg', iconColor: 'text-success', sub: 'This week'                                   },
    { label: 'Pending Enquiries', value: String(pendingEnq),    icon: <Inbox size={22} />,    iconBg: 'bg-danger-bg',  iconColor: 'text-danger',  sub: 'Need follow-up'                              },
    { label: 'Parent IDs Issued', value: String(parentIds),     icon: <KeyRound size={22} />, iconBg: 'bg-warning-bg', iconColor: 'text-warning', sub: 'Auto-dispatched on enrolment'               },
  ]

  const copyPhone = async (phone: string) => {
    try { await navigator.clipboard.writeText(phone); setCopiedPhone(phone); setTimeout(() => setCopiedPhone(null), 1500) } catch { /* blocked */ }
  }

  const handlePromote = () => {
    setPromoted(true)
    setTimeout(() => { setPromoted(false); setShowPromote(false) }, 1800)
  }

  const promoteTo = promoteFrom === '9' ? '10' : promoteFrom === '10' ? '11' : promoteFrom === '11' ? '12' : 'Graduated'
  const promoteCount = PIPELINE_BASE.filter(s => s.grade === promoteFrom).length

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[20px] font-bold text-neutral-900">Admissions Pipeline</h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">Student registration, credentials dispatch, and PDF records.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowPromote(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-neutral-200 text-neutral-700 text-[13px] font-medium rounded-xl hover:bg-neutral-50 transition-colors"
          >
            <ArrowUpCircle size={14} className="text-ink-600" /> Transfer / Promote
          </button>
          <a href="/admissions/students/new" className="flex items-center gap-2 px-3.5 py-2 bg-ink-700 text-white text-[13px] font-semibold rounded-xl hover:bg-ink-800 transition-colors no-underline">
            <UserPlus size={14} /> Enrol Student
          </a>
        </div>
      </div>

      {/* ── Class + Section filters ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-[12px] font-medium text-neutral-500 shrink-0">Grade</label>
          <select
            value={gradeFilter}
            onChange={e => setGradeFilter(e.target.value)}
            className="text-[13px] border border-neutral-200 rounded-xl px-3 py-2 text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-ink-200 cursor-pointer min-w-[130px]"
          >
            {GRADES.map(g => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[12px] font-medium text-neutral-500 shrink-0">Section</label>
          <select
            value={sectionFilter}
            onChange={e => setSectionFilter(e.target.value)}
            className="text-[13px] border border-neutral-200 rounded-xl px-3 py-2 text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-ink-200 cursor-pointer min-w-[130px]"
          >
            {SECTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        {(gradeFilter !== 'All Grades' || sectionFilter !== 'All Sections') && (
          <button
            onClick={() => { setGradeFilter('All Grades'); setSectionFilter('All Sections') }}
            className="text-[11.5px] text-ink-600 hover:text-ink-800 font-medium"
          >
            Clear filters ×
          </button>
        )}
        <span className="text-[12px] text-neutral-400 ml-auto">
          {filteredPipeline.length} student{filteredPipeline.length !== 1 ? 's' : ''}
          {gradeFilter !== 'All Grades' && ` · Grade ${gradeFilter}`}
          {sectionFilter !== 'All Sections' && ` · Section ${sectionFilter}`}
        </span>
      </div>

      {/* ── KPI cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* ── Registration pipeline ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 gap-3">
          <div>
            <h2 className="text-[14px] font-semibold text-neutral-900">Student Registration Pipeline</h2>
            <p className="text-[11.5px] text-neutral-400 mt-0.5 hidden sm:block">Edit records · manage parent IDs · delete with confirmation</p>
          </div>
          <a href="/admissions/students" className="text-[12px] text-ink-600 hover:text-ink-800 no-underline font-medium shrink-0">All records →</a>
        </div>

        {filteredPipeline.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center px-8">
            <Users size={32} className="text-neutral-200 mb-3" />
            <p className="text-[14px] font-semibold text-neutral-500">No students in{gradeFilter !== 'All Grades' ? ` Grade ${gradeFilter}` : ''}{sectionFilter !== 'All Sections' ? ` Section ${sectionFilter}` : ''}</p>
            <button onClick={() => { setGradeFilter('All Grades'); setSectionFilter('All Sections') }} className="mt-3 text-[12.5px] text-ink-600 hover:text-ink-800 font-medium">Clear filters →</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[600px]">
              <thead>
                <tr className="bg-neutral-50 text-left">
                  <th className="px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Student</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Grade · Sec</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider hidden sm:table-cell">Parent</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Parent ID</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider hidden md:table-cell">PDF</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredPipeline.map((s) => (
                  <tr key={s.roll} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-ink-100 text-ink-700 flex items-center justify-center font-mono text-[10px] font-bold shrink-0">
                          {INITIALS(s.name)}
                        </div>
                        <div className="min-w-0">
                          <span className="block font-medium text-neutral-900 truncate">{s.name}</span>
                          <span className="block text-[11px] font-mono text-neutral-400">{s.roll}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="inline-flex items-center gap-1 bg-ink-50 text-ink-700 text-[11px] font-semibold px-2 py-0.5 rounded-full font-mono">
                        {s.grade}-{s.section}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-neutral-600 hidden sm:table-cell">
                      {s.parentName ?? <span className="text-neutral-400 italic text-[12px]">Not assigned</span>}
                    </td>
                    <td className="px-3 py-3.5">
                      {s.credentialSent
                        ? <span className="flex items-center gap-1 text-[11px] font-semibold text-success"><KeyRound size={11} /> Sent</span>
                        : <button className="flex items-center gap-1 text-[11.5px] font-semibold text-ink-600 hover:text-ink-800 bg-ink-50 border border-ink-100 px-2 py-1 rounded-lg transition-colors">
                            <KeyRound size={11} /> Issue
                          </button>
                      }
                    </td>
                    <td className="px-3 py-3.5 hidden md:table-cell">
                      {s.pdfReady
                        ? <button className="flex items-center gap-1 text-[11.5px] font-medium text-ink-600 hover:text-ink-800 transition-colors"><FileText size={12} /> Download</button>
                        : <span className="text-[11px] text-neutral-400">Pending</span>
                      }
                    </td>
                    {/* Edit + Delete */}
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setEditStudent(s)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-ink-600 hover:bg-ink-50 transition-colors"
                          title="Edit student record"
                        >
                          <Pencil size={13} />
                        </button>
                        {deleteConfirm === s.roll ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => setDeleteConfirm(null)} className="text-[11px] text-neutral-500 hover:text-neutral-700 font-medium">No</button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-[11px] font-semibold text-white bg-danger hover:bg-danger/90 px-2 py-0.5 rounded-lg transition-colors">Yes</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(s.roll)} className="p-1.5 rounded-lg text-neutral-300 hover:text-danger hover:bg-danger-bg transition-colors" title="Delete record">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Enquiries ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 gap-3">
          <div>
            <h2 className="text-[14px] font-semibold text-neutral-900">Incoming Enquiries</h2>
            <p className="text-[11.5px] text-neutral-400 mt-0.5 hidden sm:block">Click any row to expand · copy phone numbers instantly</p>
          </div>
          <a href="/admissions/enquiries" className="text-[12px] text-ink-600 hover:text-ink-800 no-underline font-medium shrink-0">View all →</a>
        </div>
        {filteredEnquiries.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-[13px] text-neutral-400">No enquiries for the selected grade filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filteredEnquiries.map((e, i) => (
              <div key={i}>
                <div className="flex items-start gap-3 px-5 py-4 hover:bg-neutral-50 transition-colors cursor-pointer select-none" onClick={() => setExpandedEnquiry(expandedEnquiry === i ? null : i)}>
                  <div className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">
                    {INITIALS(e.parent)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-neutral-900 text-[13px]">{e.parent}</span>
                      <span className="text-[11px] font-mono bg-ink-50 text-ink-700 px-1.5 py-0.5 rounded-md font-semibold">Gr {e.grade}</span>
                      <span className="text-[11px] text-neutral-400">{e.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] font-mono text-neutral-500">{e.phone}</span>
                      <button onClick={ev => { ev.stopPropagation(); copyPhone(e.phone) }} className="text-neutral-300 hover:text-ink-600 transition-colors p-0.5 rounded" title="Copy phone">
                        {copiedPhone === e.phone ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                      </button>
                    </div>
                    <p className={`text-[12px] text-neutral-500 mt-1.5 leading-relaxed ${expandedEnquiry === i ? '' : 'truncate'}`}>{e.msg}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 mt-0.5">
                    <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLE[e.status] ?? 'bg-neutral-100 text-neutral-500'}`}>{e.status}</span>
                    {expandedEnquiry === i ? <ChevronUp size={14} className="text-neutral-400" /> : <ChevronDown size={14} className="text-neutral-400" />}
                  </div>
                </div>
                {expandedEnquiry === i && (
                  <div className="px-5 pb-4 pt-2 bg-neutral-50 border-t border-neutral-100">
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <a href={`tel:${e.phone}`} onClick={ev => ev.stopPropagation()} className="flex items-center gap-1.5 text-[12px] font-medium text-ink-600 hover:text-ink-800 bg-white border border-neutral-200 px-3 py-2 rounded-xl transition-colors no-underline">
                        Call {e.parent.split(' ')[0]}
                      </a>
                      <a href="/admissions/students/new" onClick={ev => ev.stopPropagation()} className="flex items-center gap-1.5 text-[12px] font-semibold text-white bg-ink-700 hover:bg-ink-800 px-3 py-2 rounded-xl transition-colors no-underline">
                        <UserPlus size={12} /> Enrol Student
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Edit Student Modal ────────────────────────────────────────────── */}
      {editStudent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={() => setEditStudent(null)} />
          <div className="relative w-full sm:max-w-lg bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-ink-100 flex items-center justify-center">
                  <Pencil size={16} className="text-ink-600" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-neutral-900">Edit Student Record</h3>
                  <p className="text-[11.5px] font-mono text-neutral-400">{editStudent.roll}</p>
                </div>
              </div>
              <button onClick={() => setEditStudent(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Full Name</label>
                  <input defaultValue={editStudent.name} className="w-full text-[13px] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-ink-200" />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Roll Number</label>
                  <input defaultValue={editStudent.roll} className="w-full text-[13px] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-500 bg-neutral-50 font-mono focus:outline-none cursor-not-allowed" readOnly />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Grade</label>
                  <select defaultValue={editStudent.grade} className="w-full text-[13px] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-ink-200 cursor-pointer">
                    {['9', '10', '11', '12'].map(g => <option key={g}>Grade {g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Section</label>
                  <select defaultValue={editStudent.section} className="w-full text-[13px] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-ink-200 cursor-pointer">
                    {['A', 'B', 'C'].map(s => <option key={s}>Section {s}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Parent / Guardian Name</label>
                  <input defaultValue={editStudent.parentName ?? ''} placeholder="Not assigned" className="w-full text-[13px] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-ink-200" />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button onClick={() => setEditStudent(null)} className="flex-1 py-3 text-[13px] font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors">Cancel</button>
                <button onClick={() => setEditStudent(null)} className="flex-1 py-3 text-[13px] font-semibold text-white bg-ink-700 hover:bg-ink-800 rounded-xl transition-colors">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Promote / Transfer Modal ─────────────────────────────────────── */}
      {showPromote && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={() => !promoted && setShowPromote(false)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-ink-100 flex items-center justify-center">
                  <ArrowUpCircle size={18} className="text-ink-600" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-neutral-900">Transfer / Promote</h3>
                  <p className="text-[11.5px] text-neutral-400 mt-0.5">Move students to next grade</p>
                </div>
              </div>
              <button onClick={() => setShowPromote(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div>
                <label className="block text-[12px] font-semibold text-neutral-700 mb-2">Promote students from</label>
                <select value={promoteFrom} onChange={e => setPromoteFrom(e.target.value)} className="w-full text-[13px] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-ink-200 cursor-pointer">
                  {['9', '10', '11', '12'].map(g => <option key={g} value={g}>Grade {g}</option>)}
                </select>
              </div>
              <div className="bg-ink-50 border border-ink-100 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1">
                    <p className="text-[11px] text-neutral-400 mb-1">From</p>
                    <p className="text-[14px] font-bold text-neutral-900">Grade {promoteFrom}</p>
                  </div>
                  <ChevronRight size={20} className="text-ink-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[11px] text-neutral-400 mb-1">To</p>
                    <p className="text-[14px] font-bold text-neutral-900">{promoteTo === 'Graduated' ? 'Graduated' : `Grade ${promoteTo}`}</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-ink-100">
                  <p className="text-[11px] text-neutral-400">Students eligible</p>
                  <p className="text-[22px] font-bold text-ink-700">{promoteCount}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 bg-warning-bg border border-warning/20 rounded-xl p-3.5">
                <AlertTriangle size={14} className="text-warning mt-0.5 shrink-0" />
                <p className="text-[11.5px] text-warning leading-relaxed">This promotes all students in Grade {promoteFrom}. For individual transfers, use the student profile edit.</p>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button onClick={() => setShowPromote(false)} className="flex-1 py-3 text-[13px] font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors">Cancel</button>
                <button onClick={handlePromote} disabled={promoted} className={`flex-1 py-3 text-[13px] font-semibold rounded-xl transition-all ${promoted ? 'bg-success text-white cursor-default' : 'bg-ink-700 text-white hover:bg-ink-800'}`}>
                  {promoted ? '✓ Promoted' : `Promote ${promoteCount} Students`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
