'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search } from 'lucide-react'
import { GRADES, INITIALS } from '@/lib/students/constants'

export type MarksStudentRow = {
  id: string
  full_name: string
  roll_number: string
  grade: string
  section: string
  average: number | null
}

export default function MarksStudentsListContent({ students }: { students: MarksStudentRow[] }) {
  const [query, setQuery] = useState('')
  const [gradeFilter, setGradeFilter] = useState('All Grades')

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const q = query.trim().toLowerCase()
      const matchesQuery = !q || s.full_name.toLowerCase().includes(q) || s.roll_number.toLowerCase().includes(q)
      const matchesGrade = gradeFilter === 'All Grades' || s.grade === gradeFilter
      return matchesQuery && matchesGrade
    }).sort((a, b) => (a.average ?? -1) - (b.average ?? -1))
  }, [students, query, gradeFilter])

  return (
    <>
      <div>
        <Link href="/marks" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Marks
        </Link>
        <h1 className="text-[20px] font-bold text-neutral-900">Students List</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">Sorted lowest average first, for follow-up · {filtered.length} students</p>
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
          <table className="w-full text-[13px] min-w-[480px]">
            <thead>
              <tr className="bg-neutral-50 text-left">
                <th className="px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Student</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Class</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Average Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-neutral-50 transition-colors">
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
                  <td className="px-3 py-3.5">
                    {s.average === null ? (
                      <span className="text-[11.5px] text-neutral-400 italic">No data yet</span>
                    ) : (
                      <div className="flex items-center gap-2.5 max-w-[160px]">
                        <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${s.average >= 80 ? 'bg-success' : s.average >= 65 ? 'bg-ink-400' : 'bg-warning'}`} style={{ width: `${s.average}%` }} />
                        </div>
                        <span className={`text-[12px] font-mono font-semibold shrink-0 ${s.average >= 80 ? 'text-success' : s.average >= 65 ? 'text-ink-600' : 'text-warning'}`}>{s.average}%</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={3} className="px-5 py-10 text-center text-[13px] text-neutral-400">No students match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
