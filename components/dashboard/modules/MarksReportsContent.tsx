'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { GRADES, INITIALS } from '@/lib/students/constants'
import { TIER_ORDER, TIER_STYLE, type Tier } from '@/lib/marks/tier'
import type { TieredStudent } from '@/lib/marks/reports-data'

type Props = {
  /** Route prefix for this dashboard's own links — lets Super Admin render the
   *  identical tier report within its own shell. */
  basePath?: string
  students: TieredStudent[]
}

export default function MarksReportsContent({ basePath = '/marks', students }: Props) {
  const [gradeFilter, setGradeFilter] = useState('All Grades')
  const [tierFilter, setTierFilter] = useState<'All Tiers' | Tier>('All Tiers')

  const tierCounts = useMemo(() => {
    const counts: Record<Tier, number> = { Distinction: 0, Merit: 0, Pass: 0, 'Below Pass': 0 }
    for (const s of students) counts[s.tier]++
    return counts
  }, [students])

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchesGrade = gradeFilter === 'All Grades' || s.grade === gradeFilter
      const matchesTier = tierFilter === 'All Tiers' || s.tier === tierFilter
      return matchesGrade && matchesTier
    })
  }, [students, gradeFilter, tierFilter])

  return (
    <>
      <div>
        <Link href={basePath} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Marks
        </Link>
        <h1 className="text-[20px] font-bold text-neutral-900">Tier Evaluation Report</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">{students.length} students evaluated</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {TIER_ORDER.map((tier) => {
          const style = TIER_STYLE[tier]
          return (
            <button
              key={tier}
              onClick={() => setTierFilter(tierFilter === tier ? 'All Tiers' : tier)}
              className={`text-left p-5 bg-white rounded-2xl border shadow-1 transition-all ${tierFilter === tier ? 'border-ink-400 ring-2 ring-ink-100' : 'border-neutral-200 hover:border-neutral-300'}`}
            >
              <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[11px] font-semibold mb-3 ${style.bgColor} ${style.textColor}`}>{tier}</span>
              <p className="text-[28px] font-bold text-neutral-900 leading-none">{tierCounts[tier]}</p>
            </button>
          )
        })}
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4 flex items-center gap-3 flex-wrap">
        <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className="text-[12.5px] border border-neutral-200 rounded-xl px-3 py-2.5 text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
          <option>All Grades</option>
          {GRADES.map((g) => <option key={g}>{g}</option>)}
        </select>
        {tierFilter !== 'All Tiers' && (
          <button onClick={() => setTierFilter('All Tiers')} className="text-[11.5px] text-ink-600 font-medium">Clear tier filter ×</button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[480px]">
            <thead>
              <tr className="bg-neutral-50 text-left">
                <th className="px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Student</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Class</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Average</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Tier</th>
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
                  <td className="px-3 py-3.5 font-mono text-[13px] font-semibold text-neutral-800">{s.average}%</td>
                  <td className="px-3 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${TIER_STYLE[s.tier].bgColor} ${TIER_STYLE[s.tier].textColor}`}>{s.tier}</span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-[13px] text-neutral-400">No students match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
