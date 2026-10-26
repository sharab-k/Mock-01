'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, FileText, X } from 'lucide-react'
import { REPORT_CHOICE_EVENT, type ReportChoice, type ReportChoiceDetail } from '@/lib/reports/report-choice'
import { currentMonthKey, monthOptionLabel, recentMonths } from '@/lib/reports/months'

// The popup behind every "Progress Report" button: pick the month, then either
// that month's report or the full record up to the end of that month.
export default function ReportChoiceHost() {
  const [pending, setPending] = useState<ReportChoiceDetail | null>(null)
  const [month, setMonth] = useState(currentMonthKey())
  const months = useMemo(() => recentMonths(18), [])

  useEffect(() => {
    const onRequest = (e: Event) => {
      setMonth(currentMonthKey())
      setPending((e as CustomEvent<ReportChoiceDetail>).detail)
    }
    window.addEventListener(REPORT_CHOICE_EVENT, onRequest)
    return () => window.removeEventListener(REPORT_CHOICE_EVENT, onRequest)
  }, [])

  useEffect(() => {
    if (!pending) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') finish(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!pending) return null

  const finish = (choice: ReportChoice | null) => {
    pending.resolve(choice)
    setPending(null)
  }
  const label = monthOptionLabel(month)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Download progress report" onClick={() => finish(null)}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <h2 className="text-[16px] font-bold text-neutral-900">Download progress report</h2>
          <button type="button" onClick={() => finish(null)} aria-label="Close" className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label htmlFor="report-month" className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Month</label>
            <select id="report-month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-full text-[13px] border border-neutral-200 rounded-xl px-3 py-2.5 text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
              {months.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </div>
          <button type="button" onClick={() => finish({ kind: 'month', month })} className="w-full text-left flex items-start gap-3 rounded-xl border border-neutral-200 p-4 hover:border-ink-600 hover:bg-ink-50 transition-colors">
            <CalendarDays size={18} className="text-ink-700 mt-0.5 shrink-0" />
            <span>
              <span className="block text-[14px] font-semibold text-neutral-900">{label} report</span>
              <span className="block text-[12.5px] text-neutral-500 mt-0.5">Attendance, fee and marks of {label} only, with the fee status of every month since enrolment.</span>
            </span>
          </button>
          <button type="button" onClick={() => finish({ kind: 'full', month })} className="w-full text-left flex items-start gap-3 rounded-xl border border-neutral-200 p-4 hover:border-ink-600 hover:bg-ink-50 transition-colors">
            <FileText size={18} className="text-ink-700 mt-0.5 shrink-0" />
            <span>
              <span className="block text-[14px] font-semibold text-neutral-900">Full progress report</span>
              <span className="block text-[12.5px] text-neutral-500 mt-0.5">The complete record up to the end of {label}: every mark with its exam date, every attendance day, and the fee status of every month.</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
