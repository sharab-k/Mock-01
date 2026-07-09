'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileDown, CheckCircle2 } from 'lucide-react'
import { GRADES, GRADE_SECTION_TOTALS } from '@/lib/mock/students'

const MONTH_TREND = [
  { week: 'Week 1', rate: 91 },
  { week: 'Week 2', rate: 88 },
  { week: 'Week 3', rate: 93 },
  { week: 'Week 4', rate: 85 },
]

const CLASS_COMPARISON: Record<string, number> = {
  '9': 90, '10': 92, '11': 87, '12': 84,
}

export default function AttendanceReportsPage() {
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  const handleDownload = () => {
    setDownloading(true)
    setTimeout(() => {
      setDownloading(false)
      setDownloaded(true)
      setTimeout(() => setDownloaded(false), 3000)
    }, 1200)
  }

  return (
    <>
      <div>
        <Link href="/attendance" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Attendance
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-[20px] font-bold text-neutral-900">Attendance Reports</h1>
            <p className="text-[13px] text-neutral-500 mt-0.5">Monthly trends and per-class comparison · current term</p>
          </div>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className={`flex items-center gap-2 text-[13px] font-semibold px-3.5 py-2 rounded-xl transition-all ${
              downloaded ? 'bg-success-bg text-success' : 'bg-ink-700 text-white hover:bg-ink-800'
            }`}
          >
            {downloaded ? <><CheckCircle2 size={14} /> Downloaded</> : <><FileDown size={14} /> {downloading ? 'Preparing…' : 'Download CSV'}</>}
          </button>
        </div>
      </div>

      {/* Monthly trend */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-6">
        <h2 className="text-[14px] font-semibold text-neutral-900 mb-5">Monthly Trend</h2>
        <div className="space-y-4">
          {MONTH_TREND.map((w) => (
            <div key={w.week}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13px] text-neutral-700">{w.week}</span>
                <span className="text-[12px] font-mono font-semibold text-neutral-900">{w.rate}%</span>
              </div>
              <div className="h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${w.rate >= 90 ? 'bg-success' : w.rate >= 80 ? 'bg-warning' : 'bg-danger'}`} style={{ width: `${w.rate}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-class comparison */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <h2 className="text-[14px] font-semibold text-neutral-900">Per-Class Comparison</h2>
          <p className="text-[11.5px] text-neutral-400 mt-0.5">This month&apos;s average attendance rate by grade</p>
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 divide-y xl:divide-y-0 xl:divide-x divide-neutral-100">
          {GRADES.map((g) => {
            const rate = CLASS_COMPARISON[g]
            const total = Object.values(GRADE_SECTION_TOTALS[g]).reduce((a, b) => a + b, 0)
            return (
              <div key={g} className="p-5">
                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">Grade {g}</p>
                <p className={`text-[28px] font-bold leading-none mb-1 ${rate >= 90 ? 'text-success' : rate >= 80 ? 'text-warning' : 'text-danger'}`}>{rate}%</p>
                <p className="text-[11.5px] text-neutral-400">{total} students</p>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
