'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, CheckCircle2, AlertCircle } from 'lucide-react'
import { INITIALS } from '@/lib/students/constants'
import { bulkSaveTestMarksAction } from '@/lib/actions/marks'
import type { TestSummary, TestRosterStudent } from '@/lib/actions/tests'

type Props = {
  basePath?: string
  test: TestSummary
  initialRoster: TestRosterStudent[]
}

export default function TestEntryContent({ basePath = '/marks', test, initialRoster }: Props) {
  const [scores, setScores] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialRoster.filter((s) => s.score !== null).map((s) => [s.id, String(s.score)])),
  )
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')

  const setScore = (studentId: string, value: string) => {
    if (value !== '' && (!/^\d{1,4}$/.test(value) || Number(value) > test.maxScore)) return
    setScores((prev) => ({ ...prev, [studentId]: value }))
    setStatus('idle')
  }

  const enteredCount = initialRoster.filter((s) => scores[s.id] !== undefined && scores[s.id] !== '').length

  const handleSave = async () => {
    setStatus('saving')
    setError('')

    const entries = initialRoster
      .filter((s) => scores[s.id] !== undefined && scores[s.id] !== '')
      .map((s) => ({ studentId: s.id, studentName: s.fullName, score: Number(scores[s.id]) }))

    const outcome = await bulkSaveTestMarksAction({ testId: test.id, entries })
    if (!outcome.ok) {
      setError(outcome.error)
      setStatus('error')
      return
    }
    setStatus('saved')
    setTimeout(() => setStatus('idle'), 3000)
  }

  return (
    <>
      <div>
        <Link href={`${basePath}/tests`} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Tests
        </Link>
        <h1 className="text-[20px] font-bold text-neutral-900">{test.title}</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">{test.subjectName} · Grade {test.gradeLevel}-{test.section} · {test.testDate}</p>
      </div>

      {status === 'error' && (
        <div className="flex items-start gap-2.5 bg-danger-bg border border-danger/20 rounded-xl p-3.5">
          <AlertCircle size={14} className="text-danger mt-0.5 shrink-0" />
          <p className="text-[12.5px] text-danger leading-relaxed">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div>
            <h2 className="text-[14px] font-semibold text-neutral-900">Roster</h2>
            <p className="text-[11.5px] text-neutral-400 mt-0.5">{enteredCount} of {initialRoster.length} scores entered</p>
          </div>
          <button
            onClick={handleSave}
            disabled={enteredCount === 0 || status === 'saving'}
            className={`flex items-center gap-2 text-[13px] font-semibold px-3.5 py-2 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              status === 'saved' ? 'bg-success-bg text-success' : 'bg-ink-700 text-white hover:bg-ink-800'
            }`}
          >
            {status === 'saved' ? <><CheckCircle2 size={14} /> Saved</> : <><Save size={14} /> {status === 'saving' ? 'Saving…' : 'Save All'}</>}
          </button>
        </div>

        <div className="divide-y divide-neutral-100">
          {initialRoster.map((s) => (
            <div key={s.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="w-8 h-8 rounded-full bg-ink-100 text-ink-700 flex items-center justify-center font-mono text-[10px] font-bold shrink-0">{INITIALS(s.fullName)}</div>
              <div className="flex-1 min-w-0">
                <span className="block text-[13px] font-medium text-neutral-900 truncate">{s.fullName}</span>
                <span className="block text-[11px] font-mono text-neutral-400">{s.rollNumber}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  value={scores[s.id] ?? ''}
                  onChange={(e) => setScore(s.id, e.target.value)}
                  placeholder="—"
                  inputMode="numeric"
                  className="w-16 text-center px-2 py-2 border border-neutral-200 rounded-xl text-[13px] font-mono focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 transition-all"
                />
                <span className="text-[12px] text-neutral-400 font-mono">/ {test.maxScore}</span>
              </div>
            </div>
          ))}
          {initialRoster.length === 0 && (
            <div className="px-5 py-10 text-center text-[13px] text-neutral-400">
              No students to grade — an elected subject only shows students actually enrolled in it.
            </div>
          )}
        </div>
      </div>
    </>
  )
}
