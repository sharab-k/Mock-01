'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search } from 'lucide-react'
import { STUDENTS, GRADES, SECTIONS, INITIALS } from '@/lib/mock/students'

export default function AttendanceStudentsPage() {
  const [query, setQuery] = useState('')

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = STUDENTS.filter((s) => !q || s.full_name.toLowerCase().includes(q) || s.roll_number.toLowerCase().includes(q))
    return GRADES.map((grade) => ({
      grade,
      sections: SECTIONS.map((section) => ({
        section,
        students: matches.filter((s) => s.grade === grade && s.section === section),
      })).filter((sec) => sec.students.length > 0),
    })).filter((g) => g.sections.length > 0)
  }, [query])

  return (
    <>
      <div>
        <Link href="/attendance" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Attendance
        </Link>
        <h1 className="text-[20px] font-bold text-neutral-900">Students List</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">Grouped by class — {STUDENTS.length} sample records</p>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or roll number…" className="w-full pl-9 pr-3 py-2.5 text-[13px] border border-neutral-200 rounded-xl bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all" />
        </div>
      </div>

      {grouped.map((g) => (
        <div key={g.grade} className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-neutral-100 bg-neutral-50">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Grade {g.grade}</span>
          </div>
          <div className="divide-y divide-neutral-100">
            {g.sections.map((sec) => (
              <div key={sec.section} className="px-5 py-3">
                <p className="text-[11px] font-mono font-semibold text-ink-600 mb-2">Section {sec.section}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-2">
                  {sec.students.map((s) => (
                    <div key={s.id} className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-ink-100 text-ink-700 flex items-center justify-center font-mono text-[9.5px] font-bold shrink-0">{INITIALS(s.full_name)}</div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-[12.5px] font-medium text-neutral-800 truncate">{s.full_name}</span>
                        <span className="block text-[10.5px] font-mono text-neutral-400">{s.roll_number}</span>
                      </div>
                      <span className={`text-[11px] font-mono font-semibold shrink-0 ${s.attendance_pct >= 90 ? 'text-success' : s.attendance_pct >= 80 ? 'text-warning' : 'text-danger'}`}>{s.attendance_pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {grouped.length === 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 py-10 text-center text-[13px] text-neutral-400">No students match this search.</div>
      )}
    </>
  )
}
