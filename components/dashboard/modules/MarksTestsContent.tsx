'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, X, ClipboardList } from 'lucide-react'
import { GRADES, sectionsForGrade, type Grade, type Section } from '@/lib/students/constants'
import { createTestAction } from '@/lib/actions/tests'
import type { Subject } from '@/lib/actions/subjects'
import type { TestSummary } from '@/lib/actions/tests'

type Props = {
  /** Route prefix — lets Super Admin render the identical Tests flow within
   *  its own shell, same pattern as MarksEnterContent's basePath. */
  basePath?: string
  initialTests: TestSummary[]
  subjects: Subject[]
}

export default function MarksTestsContent({ basePath = '/marks', initialTests, subjects }: Props) {
  const [tests, setTests] = useState<TestSummary[]>(initialTests)
  const [creating, setCreating] = useState(false)
  const [grade, setGrade] = useState<Grade>(GRADES[0])
  const [section, setSection] = useState<Section>(sectionsForGrade(GRADES[0])[0])
  const [subjectId, setSubjectId] = useState('')
  const [title, setTitle] = useState('')
  const [maxScore, setMaxScore] = useState('100')
  const [testDate, setTestDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const subjectsForGrade = useMemo(() => subjects.filter((s) => s.gradeLevel === grade), [subjects, grade])

  function openCreate() {
    setGrade(GRADES[0])
    setSection(sectionsForGrade(GRADES[0])[0])
    setSubjectId('')
    setTitle('')
    setMaxScore('100')
    setTestDate(new Date().toISOString().slice(0, 10))
    setError('')
    setCreating(true)
  }

  function changeGrade(g: Grade) {
    setGrade(g)
    setSection(sectionsForGrade(g)[0])
    setSubjectId('')
  }

  async function handleCreate() {
    if (!subjectId || !title.trim()) return
    setSaving(true)
    setError('')
    const outcome = await createTestAction({
      subjectId, gradeLevel: grade, section, title: title.trim(),
      maxScore: Number(maxScore) || 100, testDate,
    })
    setSaving(false)
    if (!outcome.ok) { setError(outcome.error); return }

    const subject = subjects.find((s) => s.id === subjectId)
    setTests((prev) => [{
      id: outcome.id, subjectId, subjectName: subject?.name ?? '—', gradeLevel: grade, section,
      title: title.trim(), maxScore: Number(maxScore) || 100, testDate, entriesCount: 0,
    }, ...prev])
    setCreating(false)
  }

  return (
    <>
      <div>
        <Link href={basePath} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Marks
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-[20px] font-bold text-neutral-900">Tests</h1>
            <p className="text-[13px] text-neutral-500 mt-0.5">Create a test for any subject and class, then enter its scores</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-3.5 py-2 bg-ink-700 text-white text-[13px] font-semibold rounded-xl hover:bg-ink-800 transition-colors">
            <Plus size={14} /> Create Test
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="divide-y divide-neutral-100">
          {tests.map((t) => (
            <Link key={t.id} href={`${basePath}/tests/${t.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-neutral-50 transition-colors no-underline">
              <div className="w-9 h-9 rounded-xl bg-ink-100 text-ink-700 flex items-center justify-center shrink-0">
                <ClipboardList size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold text-neutral-900 truncate">{t.title}</span>
                <span className="block text-[11.5px] text-neutral-400 mt-0.5">{t.subjectName} · Grade {t.gradeLevel}-{t.section} · {t.testDate}</span>
              </div>
              <span className="text-[11.5px] font-mono text-neutral-400 shrink-0">/{t.maxScore}</span>
              <span className="text-[11.5px] text-neutral-400 shrink-0">{t.entriesCount} entered</span>
            </Link>
          ))}
          {tests.length === 0 && (
            <div className="px-5 py-10 text-center text-[13px] text-neutral-400">No tests created yet.</div>
          )}
        </div>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={() => !saving && setCreating(false)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
              <h3 className="text-[15px] font-bold text-neutral-900">Create Test</h3>
              <button onClick={() => setCreating(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3.5">
              {error && <p className="text-[12.5px] text-danger">{error}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Grade</label>
                  <select value={grade} onChange={(e) => changeGrade(e.target.value as Grade)} className="w-full text-[13px] border border-neutral-200 rounded-xl px-3 py-2.5 bg-white cursor-pointer">
                    {GRADES.map((g) => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Section</label>
                  <select value={section} onChange={(e) => setSection(e.target.value as Section)} className="w-full text-[13px] border border-neutral-200 rounded-xl px-3 py-2.5 bg-white cursor-pointer">
                    {sectionsForGrade(grade).map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Subject</label>
                <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="w-full text-[13px] border border-neutral-200 rounded-xl px-3 py-2.5 bg-white cursor-pointer">
                  <option value="">Select a subject…</option>
                  {subjectsForGrade.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.type === 'compulsory' ? 'Compulsory' : 'Elected'})</option>)}
                </select>
                {subjectsForGrade.length === 0 && <p className="text-[11.5px] text-neutral-400 mt-1.5">No subjects set up for Grade {grade} yet — add some under Subjects first.</p>}
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Test title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 4 Surprise Quiz" className="w-full text-[13px] border border-neutral-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Max score</label>
                  <input value={maxScore} onChange={(e) => setMaxScore(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className="w-full text-[13px] border border-neutral-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Date</label>
                  <input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} className="w-full text-[13px] border border-neutral-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10" />
                </div>
              </div>
              <button
                onClick={handleCreate}
                disabled={saving || !subjectId || !title.trim()}
                className="w-full py-3 text-[13px] font-semibold bg-ink-700 text-white rounded-xl hover:bg-ink-800 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Creating…' : 'Create Test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
