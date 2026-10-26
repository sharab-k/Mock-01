'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import StudentIdCard from '@/components/dashboard/StudentIdCard'
import { INITIALS } from '@/lib/students/constants'

export type CardStudent = {
  id: string
  full_name: string
  gr_number: string | null
  roll_number: string
  grade: string
  section: string
  status: 'Active' | 'Inactive'
  fee_status: 'paid' | 'unpaid'
}

const STATUS_PILL: Record<string, string> = {
  Active: 'bg-success-bg text-success',
  Inactive: 'bg-neutral-100 text-neutral-500',
}
const FEE_PILL: Record<string, string> = {
  paid: 'bg-success-bg text-success',
  unpaid: 'bg-danger-bg text-danger',
}
const SELECT = 'text-[12.5px] border border-neutral-200 rounded-xl px-3 py-2.5 text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer'
const PAGE = 100

// Super Admin's ID-card list: every student in grade, then G.R. number order
// (the server sends them already sorted), with the same filters as the Students
// directory. The card button opens the download / replace-photo panel.
export default function StudentCardsContent({ students, grades }: { students: CardStudent[]; grades: string[] }) {
  const [query, setQuery] = useState('')
  const [gradeFilter, setGradeFilter] = useState('All Grades')
  const [statusFilter, setStatusFilter] = useState('All Statuses')
  const [feeFilter, setFeeFilter] = useState('All Fees')
  const [shown, setShown] = useState(PAGE)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const compact = q.replace(/\s+/g, '')
    return students.filter((s) => {
      const matchesQuery = !q
        || s.full_name.toLowerCase().includes(q)
        || s.roll_number.toLowerCase().includes(q)
        || (s.gr_number ?? '').toLowerCase().replace(/\s+/g, '').includes(compact)
      const matchesGrade = gradeFilter === 'All Grades' || s.grade === gradeFilter
      const matchesStatus = statusFilter === 'All Statuses' || s.status === statusFilter
      const matchesFee = feeFilter === 'All Fees' || (feeFilter === 'Paid' ? s.fee_status === 'paid' : s.fee_status === 'unpaid')
      return matchesQuery && matchesGrade && matchesStatus && matchesFee
    })
  }, [students, query, gradeFilter, statusFilter, feeFilter])

  const visible = filtered.slice(0, shown)
  const filtersOn = query || gradeFilter !== 'All Grades' || statusFilter !== 'All Statuses' || feeFilter !== 'All Fees'
  const reset = () => { setQuery(''); setGradeFilter('All Grades'); setStatusFilter('All Statuses'); setFeeFilter('All Fees'); setShown(PAGE) }
  const onFilter = <T,>(set: (v: T) => void) => (v: T) => { set(v); setShown(PAGE) }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[20px] font-bold text-neutral-900">Student ID cards</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">{students.length} students · {filtered.length} matching filters · in G.R. number order</p>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => onFilter(setQuery)(e.target.value)}
            placeholder="Search by name, G.R. number or roll number…"
            className="w-full pl-9 pr-3 py-2.5 text-[13px] border border-neutral-200 rounded-xl bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all"
          />
        </div>
        <select value={gradeFilter} onChange={(e) => onFilter(setGradeFilter)(e.target.value)} className={SELECT}>
          <option>All Grades</option>
          {grades.map((g) => <option key={g}>{g}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => onFilter(setStatusFilter)(e.target.value)} className={SELECT}>
          <option>All Statuses</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
        <select value={feeFilter} onChange={(e) => onFilter(setFeeFilter)(e.target.value)} className={SELECT}>
          <option>All Fees</option>
          <option>Paid</option>
          <option>Unpaid</option>
        </select>
        {filtersOn && <button onClick={reset} className="text-[11.5px] text-ink-600 font-medium">Clear ×</button>}
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[640px]">
            <thead>
              <tr className="bg-neutral-50 text-left">
                <th className="px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">G.R. No</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Student</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Class</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Fees</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider text-right">ID card</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {visible.map((s) => (
                <tr key={s.id} className={`hover:bg-neutral-50 transition-colors ${s.status === 'Inactive' ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-3 font-mono text-[12px] text-neutral-700 whitespace-nowrap">{s.gr_number ?? '—'}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-ink-100 text-ink-700 flex items-center justify-center font-mono text-[10px] font-bold shrink-0">{INITIALS(s.full_name)}</div>
                      <div className="min-w-0">
                        <span className="block font-medium text-neutral-900 truncate">{s.full_name}</span>
                        <span className="block text-[11px] font-mono text-neutral-400">{s.roll_number}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-mono text-[12px] text-neutral-700">{s.grade}{s.section}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_PILL[s.status]}`}>{s.status}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${FEE_PILL[s.fee_status]}`}>{s.fee_status === 'paid' ? 'Paid' : 'Unpaid'}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <StudentIdCard studentId={s.id} studentName={s.full_name} role="super_admin" />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-[13px] text-neutral-400">No students match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > shown && (
          <div className="border-t border-neutral-100 p-3 text-center">
            <button type="button" onClick={() => setShown((n) => n + PAGE)} className="text-[12.5px] font-semibold text-ink-700 hover:underline">
              Show more ({filtered.length - shown} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
