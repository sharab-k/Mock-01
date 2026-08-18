'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, UserPlus } from 'lucide-react'
import { GRADES, INITIALS } from '@/lib/students/constants'
import { setStudentStatusAction } from '@/lib/actions/students'
import { setParentPasswordAction } from '@/lib/actions/parents'
import SetPasswordModal from '@/components/dashboard/SetPasswordModal'

export type DirectoryStudent = {
  id: string
  full_name: string
  roll_number: string
  grade: string
  section: string
  parent_id: string | null
  parent_name: string | null
  status: 'Active' | 'Inactive'
}

const STATUS_PILL: Record<string, string> = {
  Active: 'bg-success-bg text-success',
  Inactive: 'bg-neutral-100 text-neutral-500',
}

export default function AdmissionsStudentDirectoryContent({ initialStudents }: { initialStudents: DirectoryStudent[] }) {
  const [students, setStudents] = useState<DirectoryStudent[]>(initialStudents)
  const [query, setQuery] = useState('')
  const [gradeFilter, setGradeFilter] = useState('All Grades')
  const [passwordTarget, setPasswordTarget] = useState<DirectoryStudent | null>(null)

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const q = query.trim().toLowerCase()
      const matchesQuery = !q || s.full_name.toLowerCase().includes(q) || s.roll_number.toLowerCase().includes(q)
      const matchesGrade = gradeFilter === 'All Grades' || s.grade === gradeFilter
      return matchesQuery && matchesGrade
    })
  }, [students, query, gradeFilter])

  const toggleStatus = async (id: string) => {
    const target = students.find((s) => s.id === id)
    if (!target) return
    const nextStatus = target.status === 'Active' ? 'Inactive' : 'Active'
    setStudents((prev) => prev.map((s) => s.id === id ? { ...s, status: nextStatus } : s))
    const outcome = await setStudentStatusAction({ id, status: nextStatus === 'Active' ? 'active' : 'inactive' })
    if (!outcome.ok) setStudents((prev) => prev.map((s) => s.id === id ? { ...s, status: target.status } : s))
  }

  return (
    <>
      <div>
        <Link href="/admissions" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Admissions
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-[20px] font-bold text-neutral-900">All Students</h1>
            <p className="text-[13px] text-neutral-500 mt-0.5">{filtered.length} of {students.length} records</p>
          </div>
          <Link href="/admissions/students/new" className="flex items-center gap-2 px-3.5 py-2 bg-ink-700 text-white text-[13px] font-semibold rounded-xl hover:bg-ink-800 transition-colors no-underline">
            <UserPlus size={14} /> Enrol Student
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or roll number…" className="w-full pl-9 pr-3 py-2.5 text-[13px] border border-neutral-200 rounded-xl bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all" />
        </div>
        <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className="text-[12.5px] border border-neutral-200 rounded-xl px-3 py-2.5 text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
          <option>All Grades</option>
          {GRADES.map((g) => <option key={g}>{g}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[560px]">
            <thead>
              <tr className="bg-neutral-50 text-left">
                <th className="px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Student</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Class</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider hidden sm:table-cell">Parent</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((s) => (
                <tr key={s.id} className={`hover:bg-neutral-50 transition-colors ${s.status === 'Inactive' ? 'opacity-60' : ''}`}>
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
                  <td className="px-3 py-3.5 text-neutral-500 hidden sm:table-cell">{s.parent_name ?? <span className="text-neutral-400 italic text-[12px]">Not assigned</span>}</td>
                  <td className="px-3 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_PILL[s.status]}`}>{s.status}</span>
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleStatus(s.id)} className={`text-[11.5px] font-medium transition-colors ${s.status === 'Active' ? 'text-danger hover:text-danger/80' : 'text-success hover:text-success/80'}`}>
                        {s.status === 'Active' ? 'Deactivate' : 'Reactivate'}
                      </button>
                      {s.parent_id && (
                        <button onClick={() => setPasswordTarget(s)} className="text-[11.5px] font-medium text-ink-600 hover:text-ink-800 transition-colors">
                          Reset parent password
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-[13px] text-neutral-400">No students match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {passwordTarget && passwordTarget.parent_id && (
        <SetPasswordModal
          targetName={passwordTarget.parent_name ?? 'this parent'}
          onClose={() => setPasswordTarget(null)}
          onSubmit={(newPassword) => setParentPasswordAction({ id: passwordTarget.parent_id!, newPassword })}
        />
      )}
    </>
  )
}
