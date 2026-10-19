'use client'

import { useEffect, useState } from 'react'
import { X, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, ChevronDown, Download } from 'lucide-react'
import { EXAM_LABEL, type ExamType, type MarksUploadResult, type UploadRowError } from '@/lib/marks/upload-types'

const EXAMS: { value: ExamType; hint: string }[] = [
  { value: 'monthly', hint: 'Monthly tests' },
  { value: 'half_yearly', hint: 'Half-yearly exam' },
  { value: 'final', hint: 'Final exam' },
]

type Step = 'setup' | 'checking' | 'preview' | 'saving' | 'done'

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

function downloadProblems(errors: UploadRowError[]) {
  const body = ['Row,Problem', ...errors.map((e) => `${e.row},${csvEscape(e.message)}`)].join('\r\n')
  const url = URL.createObjectURL(new Blob([body], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'marks-upload-problems.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function Collapsible({ title, count, tone, children, defaultOpen = false }: { title: string; count: number; tone: 'danger' | 'warning' | 'neutral'; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  if (count === 0) return null
  const color = tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-warning' : 'text-neutral-700'
  return (
    <div className="border border-neutral-200 rounded-xl">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3.5 py-2.5 text-left">
        <span className={`text-[13px] font-semibold ${color}`}>{title} <span className="font-mono">({count})</span></span>
        <ChevronDown size={14} className={`text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="border-t border-neutral-100 max-h-60 overflow-auto">{children}</div>}
    </div>
  )
}

function RowList({ rows }: { rows: UploadRowError[] }) {
  return (
    <ul className="divide-y divide-neutral-100">
      {rows.map((e, i) => (
        <li key={i} className="px-3.5 py-2 text-[12.5px] text-neutral-700">
          <span className="font-mono text-neutral-400 mr-2">{e.row > 0 ? `Row ${e.row}` : 'File'}</span>{e.message}
        </li>
      ))}
    </ul>
  )
}

// The "Bulk upload" popup: first it asks which exam the file is for (Monthly,
// Half-Yearly or Final), then reads the chosen spreadsheet and shows exactly
// what it found — students matched, tests and dates, and every row it could
// not use — BEFORE anything is saved. Saving is a second, explicit step.
export default function MarksBulkUploadModal({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [examType, setExamType] = useState<ExamType | null>(null)
  const [notify, setNotify] = useState(false)
  const [step, setStep] = useState<Step>('setup')
  const [error, setError] = useState('')
  const [result, setResult] = useState<MarksUploadResult | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && step !== 'checking' && step !== 'saving') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, step])

  const send = async (dryRun: boolean) => {
    if (!file || !examType) return
    setError('')
    setStep(dryRun ? 'checking' : 'saving')
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('examType', examType)
      body.append('dryRun', dryRun ? '1' : '0')
      body.append('notify', notify ? '1' : '0')
      const res = await fetch('/api/uploads/marks', { method: 'POST', body })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        setError(json?.error ?? 'The upload failed. Please try again.')
        setStep(dryRun ? 'setup' : 'preview')
        return
      }
      setResult(json as MarksUploadResult)
      setStep(dryRun ? 'preview' : 'done')
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
      setStep(dryRun ? 'setup' : 'preview')
    }
  }

  const busy = step === 'checking' || step === 'saving'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Bulk upload marks">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <h2 className="text-[16px] font-bold text-neutral-900">Bulk upload marks</h2>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 disabled:opacity-40"><X size={16} /></button>
        </div>

        <div className="p-5 overflow-auto space-y-4">
          {(step === 'setup' || step === 'checking') && (
            <>
              <div>
                <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">1 · Which exam is this file for?</p>
                <div className="grid grid-cols-3 gap-2">
                  {EXAMS.map((e) => (
                    <button
                      key={e.value}
                      type="button"
                      onClick={() => setExamType(e.value)}
                      aria-pressed={examType === e.value}
                      className={`rounded-xl border px-3 py-3 text-left transition-colors ${examType === e.value ? 'border-ink-600 bg-ink-50 ring-1 ring-ink-600' : 'border-neutral-200 hover:bg-neutral-50'}`}
                    >
                      <span className="block text-[14px] font-semibold text-neutral-900">{EXAM_LABEL[e.value]}</span>
                      <span className="block text-[11.5px] text-neutral-500 mt-0.5">{e.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">2 · Choose the results file</p>
                <label className="inline-flex items-center gap-2 text-[13px] font-medium px-3.5 py-2 rounded-xl border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 cursor-pointer">
                  <FileSpreadsheet size={14} /> {file?.name || 'Choose .xlsx or .csv file'}
                  <input type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError('') }} />
                </label>
                <p className="text-[12px] text-neutral-500 mt-2 leading-relaxed">
                  The file&apos;s dates, subjects, G.R. numbers, names and marks are read automatically — one column per test (date on top, then its total, then the subject), one row per student.
                </p>
              </div>

              <label className="flex items-start gap-2.5 text-[12.5px] text-neutral-700 cursor-pointer">
                <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="mt-0.5" />
                <span>Also send each parent a result notice for every mark saved <span className="text-neutral-400">(leave off when uploading results that were already announced)</span></span>
              </label>
            </>
          )}

          {error && (
            <div className="flex items-start gap-2.5 bg-danger-bg border border-danger/20 rounded-xl p-3.5">
              <AlertCircle size={14} className="text-danger mt-0.5 shrink-0" />
              <p className="text-[12.5px] text-danger leading-relaxed">{error}</p>
            </div>
          )}

          {(step === 'preview' || step === 'saving' || step === 'done') && result && (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                {step === 'done'
                  ? <CheckCircle2 size={18} className="text-success mt-0.5 shrink-0" />
                  : <FileSpreadsheet size={18} className="text-ink-700 mt-0.5 shrink-0" />}
                <div>
                  <p className="text-[14.5px] font-semibold text-neutral-900">
                    {step === 'done'
                      ? `${result.saved} marks saved (${result.inserted} new, ${result.updated} updated)`
                      : `${result.toSave} marks ready to save for ${result.students} students`}
                  </p>
                  <p className="text-[12.5px] text-neutral-500 mt-0.5">
                    {EXAM_LABEL[result.examType]} exam · {result.totalRows} student rows read
                    {result.noMark > 0 ? ` · ${result.noMark} cells with no mark (NILL / LEFT / not come)` : ''}
                  </p>
                </div>
              </div>

              {result.skipped > 0 && (
                <div className="flex items-start gap-2.5 bg-warning-bg border border-warning/20 rounded-xl p-3">
                  <AlertCircle size={14} className="text-warning mt-0.5 shrink-0" />
                  <p className="text-[12.5px] text-neutral-800 leading-relaxed">
                    {result.skipped} problem{result.skipped === 1 ? '' : 's'} found. Those marks are <b>not</b> saved; everything else {step === 'done' ? 'was' : 'will be'} saved. Fix them in the file (or the student&apos;s record) and upload again — already-saved marks just update.
                  </p>
                </div>
              )}

              <Collapsible title="Problems (not saved)" count={result.errors.length} tone="danger" defaultOpen={step === 'done' || result.errors.length <= 8}>
                <div className="px-3.5 pt-2.5">
                  <button type="button" onClick={() => downloadProblems(result.errors)} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-700 hover:underline"><Download size={12} /> Download list (CSV)</button>
                </div>
                <RowList rows={result.errors} />
                {result.skipped > result.errors.length && <p className="px-3.5 py-2 text-[11.5px] text-neutral-400">Showing the first {result.errors.length} of {result.skipped}.</p>}
              </Collapsible>

              <Collapsible title="Check these matches" count={result.warnings.length} tone="warning">
                <RowList rows={result.warnings} />
              </Collapsible>

              <Collapsible title="Tests found in the file" count={result.tests.length} tone="neutral">
                <ul className="divide-y divide-neutral-100">
                  {result.tests.map((t, i) => <li key={i} className="px-3.5 py-1.5 text-[12px] font-mono text-neutral-600">{t}</li>)}
                </ul>
              </Collapsible>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-neutral-100">
          {step === 'done' ? (
            <button type="button" onClick={onClose} className="text-[13px] font-semibold px-4 py-2 rounded-xl bg-ink-700 text-white hover:bg-ink-800">Done</button>
          ) : (
            <>
              {(step === 'preview' || step === 'saving') && (
                <button type="button" onClick={() => { setResult(null); setStep('setup') }} disabled={busy} className="text-[13px] font-medium px-3.5 py-2 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 disabled:opacity-40">Choose another file</button>
              )}
              <button type="button" onClick={onClose} disabled={busy} className="text-[13px] font-medium px-3.5 py-2 rounded-xl text-neutral-600 hover:bg-neutral-100 disabled:opacity-40">Cancel</button>
              {(step === 'setup' || step === 'checking') ? (
                <button type="button" onClick={() => send(true)} disabled={!examType || !file || busy} className="flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-xl bg-ink-700 text-white hover:bg-ink-800 disabled:opacity-40 disabled:cursor-not-allowed">
                  {step === 'checking' ? <><Loader2 size={14} className="animate-spin" /> Reading file…</> : 'Check file'}
                </button>
              ) : (
                <button type="button" onClick={() => send(false)} disabled={!result || result.toSave === 0 || busy} className="flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-xl bg-ink-700 text-white hover:bg-ink-800 disabled:opacity-40 disabled:cursor-not-allowed">
                  {step === 'saving' ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : `Save ${result?.toSave ?? 0} marks`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
