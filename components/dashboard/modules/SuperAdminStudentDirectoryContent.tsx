'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, X, CalendarCheck, BookOpen, Clock3, Loader2, Trash2, AlertTriangle } from 'lucide-react'
import { fetchStudentAcademicSummaryAction, type StudentAcademicSummary } from '@/lib/actions/student-summary'
import { deleteStudentAction } from '@/lib/actions/students'

export type DirectoryStudent = {
  id: string
  roll_number: string
  full_name: string
  grade: string
  section: string
  program: string
  status: 'Active' | 'Inactive'
  enrollment_date: string
  is_late_enrollment: boolean
  parent_name: string
  parent_phone: string
  guardian_profession: string | null
  previous_school: string | null
  last_qualification: string | null
  address: string | null
  gr_number: string | null
  registration_fee: number | null
  tuition_fee: number | null
  stream: string | null
}

const STATUS_PILL: Record<string, string> = {
  Active: 'bg-success-bg text-success',
  Inactive: 'bg-neutral-100 text-neutral-500',
}

const INITIALS = (name: string) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

export default function SuperAdminStudentDirectoryContent({ students: initialStudents, grades }: { students: DirectoryStudent[]; grades: string[] }) {
  const [students, setStudents] = useState<DirectoryStudent[]>(initialStudents)
  const [query, setQuery] = useState('')
  const [gradeFilter, setGradeFilter] = useState('All Grades')
  const [statusFilter, setStatusFilter] = useState('All Statuses')
  const [selected, setSelected] = useState<DirectoryStudent | null>(null)
  const [summary, setSummary] = useState<StudentAcademicSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DirectoryStudent | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const q = query.trim().toLowerCase()
      const matchesQuery = !q || s.full_name.toLowerCase().includes(q) || s.roll_number.toLowerCase().includes(q)
      const matchesGrade = gradeFilter === 'All Grades' || s.grade === gradeFilter
      const matchesStatus = statusFilter === 'All Statuses' || s.status === statusFilter
      return matchesQuery && matchesGrade && matchesStatus
    })
  }, [students, query, gradeFilter, statusFilter])

  const openStudent = async (s: DirectoryStudent) => {
    setSelected(s)
    setSummary(null)
    setSummaryLoading(true)
    const outcome = await fetchStudentAcademicSummaryAction({ studentId: s.id })
    setSummaryLoading(false)
    if (outcome.ok) setSummary({ attendancePct: outcome.attendancePct, avgScore: outcome.avgScore })
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError('')
    const outcome = await deleteStudentAction({ id: deleteTarget.id })
    setDeleting(false)
    if (!outcome.ok) { setDeleteError(outcome.error); return }
    setStudents((prev) => prev.filter((s) => s.id !== deleteTarget.id))
    setDeleteTarget(null)
    setSelected(null)
  }

  return (
    <>
      <div>
        <Link href="/super-admin" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Dashboard
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-[20px] font-bold text-neutral-900">Student Directory</h1>
            <p className="text-[13px] text-neutral-500 mt-0.5">{students.length} students · {filtered.length} matching filters</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or roll number…"
            className="w-full pl-9 pr-3 py-2.5 text-[13px] border border-neutral-200 rounded-xl bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all"
          />
        </div>
        <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className="text-[12.5px] border border-neutral-200 rounded-xl px-3 py-2.5 text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
          <option>All Grades</option>
          {grades.map((g) => <option key={g}>{g}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-[12.5px] border border-neutral-200 rounded-xl px-3 py-2.5 text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
          <option>All Statuses</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
        {(query || gradeFilter !== 'All Grades' || statusFilter !== 'All Statuses') && (
          <button onClick={() => { setQuery(''); setGradeFilter('All Grades'); setStatusFilter('All Statuses') }} className="text-[11.5px] text-ink-600 font-medium">Clear ×</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[560px]">
            <thead>
              <tr className="bg-neutral-50 text-left">
                <th className="px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Student</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Class</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider hidden sm:table-cell">Programme</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider hidden md:table-cell">Enrolled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((s) => (
                <tr key={s.id} onClick={() => openStudent(s)} className={`hover:bg-neutral-50 transition-colors cursor-pointer ${s.status === 'Inactive' ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-ink-100 text-ink-700 flex items-center justify-center font-mono text-[10px] font-bold shrink-0">{INITIALS(s.full_name)}</div>
                      <div className="min-w-0">
                        <span className="block font-medium text-neutral-900 truncate">{s.full_name}</span>
                        <span className="block text-[11px] font-mono text-neutral-400">{s.roll_number}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 font-mono text-[12px] text-neutral-700">{s.grade}{s.section}</td>
                  <td className="px-3 py-3.5 text-neutral-500 hidden sm:table-cell">{s.program}</td>
                  <td className="px-3 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_PILL[s.status]}`}>{s.status}</span>
                  </td>
                  <td className="px-3 py-3.5 text-neutral-400 font-mono text-[12px] hidden md:table-cell">{s.enrollment_date}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-[13px] text-neutral-400">No students match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over detail */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-neutral-900/40" onClick={() => setSelected(null)} />
          <div className="relative w-full sm:max-w-sm bg-white h-full shadow-2xl z-10 overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 sticky top-0 bg-white">
              <h3 className="text-[15px] font-bold text-neutral-900">Student Profile</h3>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-ink-100 text-ink-700 flex items-center justify-center font-mono text-[16px] font-bold shrink-0">{INITIALS(selected.full_name)}</div>
                <div>
                  <p className="text-[16px] font-bold text-neutral-900">{selected.full_name}</p>
                  <p className="text-[12px] font-mono text-neutral-400">{selected.roll_number} · Grade {selected.grade}-{selected.section}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-success-bg rounded-xl p-3 text-center">
                  <CalendarCheck size={14} className="text-success mx-auto mb-1" />
                  {summaryLoading ? (
                    <Loader2 size={14} className="animate-spin text-success mx-auto" />
                  ) : (
                    <p className="text-[16px] font-bold font-mono text-success">{summary?.attendancePct ?? 0}%</p>
                  )}
                  <p className="text-[10px] text-success/80">Attendance</p>
                </div>
                <div className="bg-ink-50 rounded-xl p-3 text-center">
                  <BookOpen size={14} className="text-ink-600 mx-auto mb-1" />
                  {summaryLoading ? (
                    <Loader2 size={14} className="animate-spin text-ink-600 mx-auto" />
                  ) : (
                    <p className="text-[16px] font-bold font-mono text-ink-700">{summary?.avgScore ?? 0}%</p>
                  )}
                  <p className="text-[10px] text-ink-600/80">Avg Score</p>
                </div>
                <div className={`rounded-xl p-3 text-center ${selected.is_late_enrollment ? 'bg-warning-bg' : 'bg-neutral-100'}`}>
                  <Clock3 size={14} className={`mx-auto mb-1 ${selected.is_late_enrollment ? 'text-warning' : 'text-neutral-400'}`} />
                  <p className={`text-[11px] font-semibold ${selected.is_late_enrollment ? 'text-warning' : 'text-neutral-400'}`}>{selected.is_late_enrollment ? 'Late Enrollment' : 'On Time'}</p>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-neutral-100">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-neutral-400">Programme</span>
                  <span className="font-medium text-neutral-800">{selected.program}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-neutral-400">Status</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_PILL[selected.status]}`}>{selected.status}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-neutral-400">Enrolled</span>
                  <span className="font-mono text-neutral-800">{selected.enrollment_date}</span>
                </div>
                {selected.stream && (
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-neutral-400">Stream</span>
                    <span className="font-medium text-neutral-800">{selected.stream}</span>
                  </div>
                )}
                {selected.gr_number && (
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-neutral-400">G.R. No.</span>
                    <span className="font-mono text-neutral-800">{selected.gr_number}</span>
                  </div>
                )}
              </div>

              {(selected.previous_school || selected.last_qualification || selected.address) && (
                <div className="space-y-3 pt-4 border-t border-neutral-100">
                  <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Academic Background</p>
                  {selected.previous_school && (
                    <div className="flex items-center justify-between text-[13px] gap-3">
                      <span className="text-neutral-400 shrink-0">Previous school</span>
                      <span className="font-medium text-neutral-800 text-right">{selected.previous_school}</span>
                    </div>
                  )}
                  {selected.last_qualification && (
                    <div className="flex items-center justify-between text-[13px] gap-3">
                      <span className="text-neutral-400 shrink-0">Last qualification</span>
                      <span className="font-medium text-neutral-800 text-right">{selected.last_qualification}</span>
                    </div>
                  )}
                  {selected.address && (
                    <div className="flex items-start justify-between text-[13px] gap-3">
                      <span className="text-neutral-400 shrink-0">Address</span>
                      <span className="font-medium text-neutral-800 text-right">{selected.address}</span>
                    </div>
                  )}
                </div>
              )}

              {(selected.registration_fee !== null || selected.tuition_fee !== null) && (
                <div className="space-y-3 pt-4 border-t border-neutral-100">
                  <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Fees</p>
                  {selected.registration_fee !== null && (
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-neutral-400">Registration fee</span>
                      <span className="font-mono text-neutral-800">PKR {selected.registration_fee.toLocaleString()}</span>
                    </div>
                  )}
                  {selected.tuition_fee !== null && (
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-neutral-400">Tuition fee</span>
                      <span className="font-mono text-neutral-800">PKR {selected.tuition_fee.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3 pt-4 border-t border-neutral-100">
                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Parent / Guardian</p>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-neutral-400">Name</span>
                  <span className="font-medium text-neutral-800">{selected.parent_name}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-neutral-400">Phone</span>
                  <span className="font-mono text-neutral-800">{selected.parent_phone}</span>
                </div>
                {selected.guardian_profession && (
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-neutral-400">Profession</span>
                    <span className="font-medium text-neutral-800">{selected.guardian_profession}</span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-neutral-100">
                <button
                  onClick={() => { setDeleteError(''); setDeleteTarget(selected) }}
                  className="w-full flex items-center justify-center gap-2 text-[12.5px] font-semibold text-danger bg-danger-bg border border-danger/20 py-2.5 rounded-xl hover:bg-danger/10 transition-colors"
                >
                  <Trash2 size={13} /> Delete Student Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={() => !deleting && setDeleteTarget(null)} />
          <div className="relative w-full sm:max-w-sm bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-danger-bg flex items-center justify-center">
                  <AlertTriangle size={18} className="text-danger" />
                </div>
                <h3 className="text-[15px] font-bold text-neutral-900">Delete student record?</h3>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-[13px] text-neutral-600 leading-relaxed mb-2">
                {deleteTarget.full_name} ({deleteTarget.roll_number}) will be removed from the active directory, attendance rosters, and mark-entry sheets. Their history is preserved and can be restored by a database administrator if needed.
              </p>
              {deleteError && <p className="text-[12.5px] text-danger mb-3">{deleteError}</p>}
              <div className="flex items-center gap-3 mt-3">
                <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="flex-1 py-3 text-[13px] font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors disabled:opacity-60">Cancel</button>
                <button onClick={confirmDelete} disabled={deleting} className="flex-1 py-3 text-[13px] font-semibold rounded-xl text-white bg-danger hover:bg-danger/90 transition-colors disabled:opacity-60">{deleting ? 'Deleting…' : 'Delete'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
