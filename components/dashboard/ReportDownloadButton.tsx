'use client'

import { useState } from 'react'
import { FileDown, Loader2, Check, AlertCircle } from 'lucide-react'
import { downloadProgressReport } from '@/lib/reports/download-client'

// One "Progress Report" button shared by every surface that offers it (parent
// dashboard keeps its own header button; staff lists use this). The report
// itself is authorized server-side — a parent only for linked children, staff
// roles for any student — so showing the button is UX, not the gate.
export default function ReportDownloadButton({
  studentId,
  variant = 'icon',
}: {
  studentId: string
  variant?: 'icon' | 'full'
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  const run = async () => {
    setState('loading')
    const ok = await downloadProgressReport(studentId)
    setState(ok ? 'done' : 'error')
    setTimeout(() => setState('idle'), 2500)
  }

  const Icon = state === 'loading' ? Loader2 : state === 'done' ? Check : state === 'error' ? AlertCircle : FileDown
  const label = state === 'loading' ? 'Preparing…' : state === 'done' ? 'Downloaded' : state === 'error' ? 'Failed — retry' : 'Progress report'
  const tone = state === 'error' ? 'text-danger bg-danger-bg' : state === 'done' ? 'text-success bg-success-bg' : 'text-ink-700 bg-ink-50 hover:bg-ink-100'

  if (variant === 'full') {
    return (
      <button
        type="button"
        onClick={run}
        disabled={state === 'loading'}
        className={`w-full flex items-center justify-center gap-2 text-[12.5px] font-semibold border border-ink-100 py-2.5 rounded-xl transition-colors disabled:opacity-70 ${tone}`}
      >
        <Icon size={13} className={state === 'loading' ? 'animate-spin' : ''} /> {label}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); void run() }}
      disabled={state === 'loading'}
      title={label}
      aria-label={`Download progress report`}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-70 ${tone}`}
    >
      <Icon size={14} className={state === 'loading' ? 'animate-spin' : ''} />
    </button>
  )
}
