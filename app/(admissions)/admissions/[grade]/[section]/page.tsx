'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import StatCard from '@/components/dashboard/StatCard'
import {
  ArrowLeft, Users, KeyRound, FileText, UserPlus,
  Pencil, Trash2, CheckCircle2, X,
} from 'lucide-react'

// ── Mock data (TODO: replace with Supabase query filtered by grade + section) ─
const ALL_STUDENTS = [
  { name: 'Sara Khan',     roll: 'JE-2026-002', grade: '9',  section: 'A', parentName: 'Yasmin Khan'   as string | null, credentialSent: true,  pdfReady: true,  date: '14 Jan 2026' },
  { name: 'Zara Hussain',  roll: 'JE-2026-047', grade: '9',  section: 'B', parentName: 'Kamil Hussain' as string | null, credentialSent: true,  pdfReady: true,  date: '24 Jun 2026' },
  { name: 'Hina Baig',     roll: 'JE-2026-018', grade: '9',  section: 'C', parentName: 'Tariq Baig'    as string | null, credentialSent: true,  pdfReady: true,  date: '6 Jan 2026'  },
  { name: 'Ahmed Ali',     roll: 'JE-2026-001', grade: '10', section: 'A', parentName: 'Ali Hassan'    as string | null, credentialSent: true,  pdfReady: true,  date: '15 Jan 2026' },
  { name: 'Usman Sheikh',  roll: 'JE-2026-005', grade: '10', section: 'B', parentName: null,                             credentialSent: false, pdfReady: false, date: '8 Jan 2026'  },
  { name: 'Dawood Ilyas',  roll: 'JE-2026-057', grade: '11', section: 'A', parentName: 'Ilyas Qureshi' as string | null, credentialSent: true,  pdfReady: false, date: '2 Jan 2026'  },
  { name: 'Fatima Noor',   roll: 'JE-2026-004', grade: '11', section: 'B', parentName: 'Noor Ahmed'    as string | null, credentialSent: true,  pdfReady: false, date: '10 Jan 2026' },
  { name: 'Bilal Raza',    roll: 'JE-2026-003', grade: '12', section: 'A', parentName: 'Rashid Raza'   as string | null, credentialSent: true,  pdfReady: true,  date: '12 Jan 2026' },
  { name: 'Kamran Malik',  roll: 'JE-2026-031', grade: '12', section: 'B', parentName: 'Saleem Malik'  as string | null, credentialSent: true,  pdfReady: true,  date: '4 Jan 2026'  },
]

type Student = typeof ALL_STUDENTS[number]

const INITIALS = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

const VALID_GRADES   = ['9', '10', '11', '12']
const VALID_SECTIONS = ['A', 'B', 'C', 'D']

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ClassPipelinePage({
  params,
}: {
  params: Promise<{ grade: string; section: string }>
}) {
  const { grade, section } = use(params)

  const [students,      setStudents]      = useState<Student[]>(() =>
    ALL_STUDENTS.filter(s => s.grade === grade && s.section === section)
  )
  const [editStudent,   setEditStudent]   = useState<Student | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Handle invalid route params gracefully
  const isValid = VALID_GRADES.includes(grade) && VALID_SECTIONS.includes(section)

  const enrolledTotal  = students.length
  const credSent       = students.filter(s => s.credentialSent).length
  const credPending    = enrolledTotal - credSent
  const pdfReady       = students.filter(s => s.pdfReady).length

  const STATS = [
    { label: 'In Pipeline',      value: String(enrolledTotal), icon: <Users size={22} />,       iconBg: 'bg-ink-100',    iconColor: 'text-ink-600', sub: `Grade ${grade} · Section ${section}` },
    { label: 'Credentials Sent', value: String(credSent),      icon: <CheckCircle2 size={22} />, iconBg: 'bg-success-bg', iconColor: 'text-success', sub: 'Parent IDs dispatched', subUp: true  },
    { label: 'Credentials Due',  value: String(credPending),   icon: <KeyRound size={22} />,    iconBg: credPending > 0 ? 'bg-danger-bg' : 'bg-neutral-100', iconColor: credPending > 0 ? 'text-danger' : 'text-neutral-400', sub: credPending > 0 ? 'Action required' : 'All dispatched' },
    { label: 'PDFs Ready',       value: String(pdfReady),      icon: <FileText size={22} />,    iconBg: 'bg-warning-bg', iconColor: 'text-warning', sub: `of ${enrolledTotal} students`         },
  ]

  if (!isValid) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-[15px] font-semibold text-neutral-600">Invalid class: Grade {grade} · Section {section}</p>
        <Link href="/admissions" className="mt-4 text-[13px] font-medium text-ink-600 hover:text-ink-800">
          ← Back to Admissions
        </Link>
      </div>
    )
  }

  return (
    <>
      {/* ── Back nav + header ────────────────────────────────────────────── */}
      <div>
        <Link href="/admissions" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Admissions
        </Link>

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-ink-700 flex items-center justify-center shrink-0">
                <span className="text-white font-mono text-[13px] font-bold">{grade}{section}</span>
              </div>
              <div>
                <h1 className="text-[20px] font-bold text-neutral-900">Grade {grade} · Section {section}</h1>
                <p className="text-[13px] text-neutral-500 mt-0.5">Student registration pipeline — {enrolledTotal} record{enrolledTotal !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>
          <Link
            href="/admissions/students/new"
            className="flex items-center gap-2 px-3.5 py-2 bg-ink-700 text-white text-[13px] font-semibold rounded-xl hover:bg-ink-800 transition-colors no-underline shrink-0"
          >
            <UserPlus size={14} /> Enrol Student
          </Link>
        </div>
      </div>

      {/* ── KPI cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* ── Pipeline table ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 gap-3">
          <div>
            <h2 className="text-[14px] font-semibold text-neutral-900">Registration Pipeline</h2>
            <p className="text-[11.5px] text-neutral-400 mt-0.5 hidden sm:block">Edit records · manage parent IDs · delete with confirmation</p>
          </div>
          <span className="text-[11px] font-mono text-neutral-400 shrink-0 bg-ink-50 px-2 py-0.5 rounded-full text-ink-700 font-semibold">{grade}{section}</span>
        </div>

        {students.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center px-8">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
              <Users size={24} className="text-neutral-300" />
            </div>
            <p className="text-[15px] font-semibold text-neutral-600 mb-1">No records for {grade}{section}</p>
            <p className="text-[13px] text-neutral-400 mb-5">Students registered in this class will appear here.</p>
            <Link href="/admissions/students/new" className="inline-flex items-center gap-2 px-4 py-2.5 bg-ink-700 text-white text-[13px] font-semibold rounded-xl hover:bg-ink-800 transition-colors no-underline">
              <UserPlus size={14} /> Enrol First Student
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[580px]">
              <thead>
                <tr className="bg-neutral-50 text-left">
                  <th className="px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Student</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider hidden sm:table-cell">Parent</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Parent ID</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider hidden md:table-cell">PDF</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {students.map(s => (
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
                            <button
                              onClick={() => { setStudents(prev => prev.filter(p => p.roll !== s.roll)); setDeleteConfirm(null) }}
                              className="text-[11px] font-semibold text-white bg-danger hover:bg-danger/90 px-2 py-0.5 rounded-lg transition-colors"
                            >
                              Yes
                            </button>
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
                    {['9', '10', '11', '12'].map(g => <option key={g} value={g}>Grade {g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Section</label>
                  <select defaultValue={editStudent.section} className="w-full text-[13px] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-ink-200 cursor-pointer">
                    {['A', 'B', 'C', 'D'].map(s => <option key={s} value={s}>Section {s}</option>)}
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
    </>
  )
}
