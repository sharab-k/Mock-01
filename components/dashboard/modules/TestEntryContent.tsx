'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, CheckCircle2, AlertCircle, Pencil, X } from 'lucide-react'
import { INITIALS } from '@/lib/students/constants'
import { bulkSaveTestMarksAction } from '@/lib/actions/marks'
import { updateTestAction } from '@/lib/actions/tests'
import type { TestSummary, TestRosterStudent } from '@/lib/actions/tests'

type Props = {
  basePath?: string
  test: TestSummary
  initialRoster: TestRosterStudent[]
}

export default function TestEntryContent({ basePath = '/marks', test, initialRoster }: Props) {
  const [meta, setMeta] = useState(test)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editMax, setEditMax] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [scores, setScores] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialRoster.filter((s) => s.score !== null).map((s) => [s.id, String(s.score)])),
  )
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')

  const setScore = (studentId: string, value: string) => {
    if (value !== '' && (!/^\d{1,4}$/.test(value) || Number(value) > meta.maxScore)) return
    setScores((prev) => ({ ...prev, [studentId]: value }))
    setStatus('idle')
  }

  const enteredCount = initialRoster.filter((s) => scores[s.id] !== undefined && scores[s.id] !== '').length

  const openEdit = () => {
    setEditTitle(meta.title)
    setEditMax(String(meta.maxScore))
    setEditDate(meta.testDate)
    setEditError('')
    setEditing(true)
  }

  const saveEdit = async () => {
    setEditSaving(true)
    setEditError('')
    const maxScore = Number(editMax)
    const outcome = await updateTestAction({ id: meta.id, title: editTitle.trim(), maxScore, testDate: editDate })
    setEditSaving(false)
    if (!outcome.ok) { setEditError(outcome.error); return }
    setMeta((m) => ({ ...m, title: editTitle.trim(), maxScore, testDate: editDate }))
    setEditing(false)
  }

  const handleSave = async () => {
    setStatus('saving')
    setError('')

    const entries = initialRoster
      .filter((s) => scores[s.id] !== undefined && scores[s.id] !== '')
      .map((s) => ({ studentId: s.id, studentName: s.fullName, score: Number(scores[s.id]) }))

    const outcome = await bulkSaveTestMarksAction({ testId: meta.id, entries })
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
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-[20px] font-bold text-neutral-900">{meta.title}</h1>
            <p className="text-[13px] text-neutral-500 mt-0.5">{meta.subjectName} · Grade {meta.gradeLevel}-{meta.section} · {meta.testDate} · out of <span className="font-mono">{meta.maxScore}</span></p>
          </div>
          <button onClick={openEdit} className="flex items-center gap-2 px-3.5 py-2 text-[13px] font-semibold text-ink-700 bg-ink-50 border border-ink-100 rounded-xl hover:bg-ink-100/50 transition-colors">
            <Pencil size={13} /> Edit test
          </button>
        </div>
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
                <span className="text-[12px] text-neutral-400 font-mono">/ {meta.maxScore}</span>
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
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={() => !editSaving && setEditing(false)} />
          <div className="relative w-full sm:max-w-sm bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
              <h3 className="text-[15px] font-bold text-neutral-900">Edit test</h3>
              <button onClick={() => setEditing(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"><X size={16} /></button>
            </div>
            <div className="px-6 py-5 space-y-3.5">
              {editError && <p className="text-[12.5px] text-danger">{editError}</p>}
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Test title</label>
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full text-[13px] border border-neutral-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Total marks</label>
                  <input value={editMax} onChange={(e) => setEditMax(e.target.value.replace(/D/g, ''))} inputMode="numeric" className="w-full text-[13px] font-mono border border-neutral-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Date</label>
                  <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="w-full text-[13px] border border-neutral-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10" />
                </div>
              </div>
              <p className="text-[11.5px] text-neutral-400 leading-relaxed">Changing the total re-bases scores already entered for this test.</p>
              <button onClick={saveEdit} disabled={editSaving || !editTitle.trim() || !Number(editMax)} className="w-full py-3 text-[13px] font-semibold bg-ink-700 text-white rounded-xl hover:bg-ink-800 disabled:opacity-50 transition-colors">
                {editSaving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
