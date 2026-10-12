'use client'

import { useRef, useState } from 'react'
import { FileSpreadsheet, Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

type Kind = 'marks' | 'attendance'
type Result = {
  totalRows: number
  saved: number
  skipped: number
  inserted?: number
  updated?: number
  absent?: number
  errors: { row: number; message: string }[]
}

const COPY: Record<Kind, { title: string; blurb: string; columns: string[]; notes: string[] }> = {
  marks: {
    title: 'Upload Marks',
    blurb: 'Upload an Excel (.xlsx) or CSV file of results. Each row is one student, one subject, one exam, with its own exam date.',
    columns: ['GR No (or Roll No)', 'Subject', 'Exam (Monthly / Half-Yearly / Final)', 'Marks', 'Total (default 100)', 'Exam Date'],
    notes: [
      'Dates can be DD/MM/YYYY or YYYY-MM-DD, and cannot be in the future.',
      'Re-uploading the same student, subject, exam and date updates the earlier mark (the change is logged).',
      'Parents are notified of new or changed marks, the same as when marks are typed in.',
    ],
  },
  attendance: {
    title: 'Upload Attendance',
    blurb: 'Upload an Excel (.xlsx) or CSV file of attendance. Each row is one student on one day, so past days can be filled in too.',
    columns: ['GR No (or Roll No)', 'Date', 'Status (Present / Absent / Late)'],
    notes: [
      'Dates can be DD/MM/YYYY or YYYY-MM-DD, and cannot be in the future.',
      'Re-uploading a student and day corrects the earlier mark.',
      'A student newly marked Absent triggers the parent notice in their portal, the same as marking by hand.',
    ],
  },
}

export default function SpreadsheetUploadContent({ kind }: { kind: Kind }) {
  const copy = COPY[kind]
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')
  const [result, setResult] = useState<Result | null>(null)

  const upload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setStatus('uploading')
    setError('')
    setResult(null)
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch(`/api/uploads/${kind}`, { method: 'POST', body })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        setError(json?.error ?? 'The upload failed. Please try again.')
        setStatus('error')
        return
      }
      setResult(json as Result)
      setStatus('done')
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
      setStatus('error')
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-[20px] font-bold text-neutral-900">{copy.title}</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">{copy.blurb}</p>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-5 space-y-4">
        <div>
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Columns</p>
          <p className="text-[13px] text-neutral-800">{copy.columns.join(' · ')}</p>
          <ul className="mt-2 space-y-1">
            {copy.notes.map((n) => <li key={n} className="text-[12px] text-neutral-500">• {n}</li>)}
          </ul>
          <a href={`/api/uploads/template/${kind}`} className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-700 hover:underline">
            <Download size={13} /> Download a template (CSV)
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-[13px] font-medium px-3.5 py-2 rounded-xl border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 cursor-pointer">
            <FileSpreadsheet size={14} /> {fileName || 'Choose .xlsx or .csv file'}
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={(e) => { setFileName(e.target.files?.[0]?.name ?? ''); setStatus('idle'); setResult(null); setError('') }}
            />
          </label>
          <button
            onClick={upload}
            disabled={!fileName || status === 'uploading'}
            className="flex items-center gap-2 text-[13px] font-semibold px-3.5 py-2 rounded-xl bg-ink-700 text-white hover:bg-ink-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {status === 'uploading' ? <><Loader2 size={14} className="animate-spin" /> Uploading…</> : 'Upload'}
          </button>
        </div>
      </div>

      {status === 'error' && (
        <div className="flex items-start gap-2.5 bg-danger-bg border border-danger/20 rounded-xl p-3.5">
          <AlertCircle size={14} className="text-danger mt-0.5 shrink-0" />
          <p className="text-[12.5px] text-danger leading-relaxed">{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-5 space-y-3">
          <div className="flex items-center gap-2">
            {result.skipped === 0 ? <CheckCircle2 size={16} className="text-success" /> : <AlertCircle size={16} className="text-warning" />}
            <p className="text-[14px] font-semibold text-neutral-900">
              {result.saved} of {result.totalRows} rows saved{result.skipped > 0 ? ` · ${result.skipped} skipped` : ''}
            </p>
          </div>
          <p className="text-[12.5px] text-neutral-500">
            {kind === 'marks'
              ? `${result.inserted ?? 0} new, ${result.updated ?? 0} updated.`
              : `${result.absent ?? 0} absent record${result.absent === 1 ? '' : 's'} included.`}
          </p>
          {result.errors.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Rows that were skipped (fix them and upload again)</p>
              <ul className="divide-y divide-neutral-100 border border-neutral-100 rounded-xl max-h-72 overflow-auto">
                {result.errors.map((e, i) => (
                  <li key={i} className="px-3 py-2 text-[12.5px] text-neutral-700">
                    <span className="font-mono text-neutral-400 mr-2">{e.row > 0 ? `Row ${e.row}` : 'Batch'}</span>{e.message}
                  </li>
                ))}
              </ul>
              {result.skipped > result.errors.length && <p className="text-[11.5px] text-neutral-400 mt-1.5">Showing the first {result.errors.length} problems.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
