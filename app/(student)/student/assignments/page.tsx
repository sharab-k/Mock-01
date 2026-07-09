'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, X, UploadCloud, CheckCircle2, FileCheck2 } from 'lucide-react'

type AssignStatus = 'Submitted' | 'Pending' | 'Not Started'

type Assignment = { id: string; subject: string; title: string; due: string; status: AssignStatus }

const INITIAL: Assignment[] = [
  { id: 'a1', subject: 'Mathematics', title: 'Chapter 5 – Practice Set',  due: '28 Jan 2026', status: 'Submitted'   },
  { id: 'a2', subject: 'Physics',     title: 'Lab Report – Motion Exp.',  due: '30 Jan 2026', status: 'Pending'     },
  { id: 'a3', subject: 'English',     title: 'Descriptive Essay Draft',   due: '2 Feb 2026',  status: 'Pending'     },
  { id: 'a4', subject: 'Chemistry',   title: 'Atomic Models Assignment',  due: '5 Feb 2026',  status: 'Not Started' },
  { id: 'a5', subject: 'Urdu',        title: 'Mazmoon Nigari',            due: '7 Feb 2026',  status: 'Not Started' },
  { id: 'a6', subject: 'Mathematics', title: 'Chapter 6 – Word Problems', due: '18 Jan 2026', status: 'Submitted'   },
]

const SUBJ_COLOR: Record<string, string> = {
  Mathematics: 'bg-ink-200',
  English: 'bg-success',
  Physics: 'bg-warning',
  Chemistry: 'bg-danger',
  Urdu: 'bg-ink-400',
}

const STATUS_PILL: Record<AssignStatus, string> = {
  Submitted: 'bg-success-bg text-success',
  Pending: 'bg-warning-bg text-warning',
  'Not Started': 'bg-neutral-100 text-neutral-500',
}

const FILTERS: ('All' | AssignStatus)[] = ['All', 'Pending', 'Not Started', 'Submitted']

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>(INITIAL)
  const [filter, setFilter] = useState<'All' | AssignStatus>('All')
  const [submitTarget, setSubmitTarget] = useState<Assignment | null>(null)
  const [fileName, setFileName] = useState('')

  const filtered = useMemo(() => filter === 'All' ? assignments : assignments.filter((a) => a.status === filter), [assignments, filter])

  const confirmSubmit = () => {
    if (!submitTarget) return
    setAssignments((prev) => prev.map((a) => a.id === submitTarget.id ? { ...a, status: 'Submitted' } : a))
    setSubmitTarget(null)
    setFileName('')
  }

  return (
    <>
      <div>
        <Link href="/student" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Dashboard
        </Link>
        <h1 className="text-[20px] font-bold text-neutral-900">Course Assignments</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">{assignments.length} total · {assignments.filter((a) => a.status !== 'Submitted').length} outstanding</p>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4 flex items-center gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`text-[12px] font-semibold px-3 py-1.5 rounded-full transition-colors ${filter === f ? 'bg-ink-700 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>{f}</button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="divide-y divide-neutral-100">
          {filtered.map((a) => (
            <div key={a.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-neutral-50/70 transition-colors">
              <div className={`w-2 h-2 rounded-full shrink-0 ${SUBJ_COLOR[a.subject] ?? 'bg-neutral-300'}`} />
              <div className="flex-1 min-w-0">
                <span className="block text-[13px] font-medium text-neutral-900 truncate">{a.title}</span>
                <span className="text-[11px] text-neutral-400">{a.subject}</span>
              </div>
              <span className="text-[12px] font-mono text-neutral-400 shrink-0 hidden sm:block">{a.due}</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${STATUS_PILL[a.status]}`}>{a.status}</span>
              {a.status === 'Submitted' && <span className="w-[76px] shrink-0" />}
              {a.status !== 'Submitted' && (
                <button onClick={() => { setFileName(''); setSubmitTarget(a) }} className="text-[12px] font-semibold text-white bg-ink-700 hover:bg-ink-800 px-3.5 py-1.5 rounded-xl transition-colors shrink-0">
                  {a.status === 'Not Started' ? 'Begin' : 'Submit'}
                </button>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-5 py-10 text-center text-[13px] text-neutral-400">No assignments in this status.</div>
          )}
        </div>
      </div>

      {submitTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={() => setSubmitTarget(null)} />
          <div className="relative w-full sm:max-w-sm bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
              <h3 className="text-[15px] font-bold text-neutral-900">Submit Assignment</h3>
              <button onClick={() => setSubmitTarget(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-[13px] text-neutral-600">{submitTarget.title} · <span className="text-neutral-400">{submitTarget.subject}</span></p>
              <label
                className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl py-8 px-4 cursor-pointer transition-colors ${
                  fileName ? 'border-success/40 bg-success-bg/40' : 'border-neutral-200 hover:border-ink-300 hover:bg-ink-50/30'
                }`}
              >
                <input
                  type="file"
                  className="sr-only"
                  onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
                />
                {fileName ? (
                  <>
                    <FileCheck2 size={22} className="text-success" />
                    <span className="text-[12.5px] font-medium text-neutral-800 text-center break-all px-2">{fileName}</span>
                    <span className="text-[11px] text-ink-600 font-medium">Click to change file</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={22} className="text-neutral-400" />
                    <span className="text-[12.5px] text-neutral-500">Click to choose a file</span>
                  </>
                )}
              </label>
              <button onClick={confirmSubmit} disabled={!fileName} className="w-full flex items-center justify-center gap-2 py-3 text-[13px] font-semibold rounded-xl bg-ink-700 text-white hover:bg-ink-800 transition-colors disabled:opacity-50">
                <CheckCircle2 size={14} /> Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
