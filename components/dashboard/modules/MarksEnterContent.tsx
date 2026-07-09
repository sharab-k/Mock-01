'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, CheckCircle2 } from 'lucide-react'
import { GRADES, SECTIONS, studentsByGradeSection, INITIALS } from '@/lib/mock/students'

const SUBJECTS = ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology', 'Urdu']
const EXAM_TYPES = ['Monthly', 'Half-Yearly', 'Final']
const MAX_SCORE = 100

type Props = {
  /** Route prefix for this dashboard's own links — lets Super Admin render the
   *  identical bulk-entry flow within its own shell. */
  basePath?: string
}

export default function MarksEnterContent({ basePath = '/marks' }: Props) {
  const [grade, setGrade] = useState(GRADES[0])
  const [section, setSection] = useState(SECTIONS[0])
  const [subject, setSubject] = useState(SUBJECTS[0])
  const [examType, setExamType] = useState(EXAM_TYPES[0])
  const [scores, setScores] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  const roster = useMemo(() => studentsByGradeSection(grade, section), [grade, section])

  const setScore = (roll: string, value: string) => {
    if (value !== '' && (!/^\d{1,3}$/.test(value) || Number(value) > MAX_SCORE)) return
    setScores((prev) => ({ ...prev, [roll]: value }))
    setSaved(false)
  }

  const enteredCount = roster.filter((s) => scores[s.roll_number] !== undefined && scores[s.roll_number] !== '').length

  const handleSave = () => {
    // TODO: bulk insert into `marks` table via Supabase; triggers grade-alert notification per student
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <>
      <div>
        <Link href={basePath} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Marks
        </Link>
        <h1 className="text-[20px] font-bold text-neutral-900">Enter Marks</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">Bulk entry for one class, subject, and exam at a time</p>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Grade</label>
          <select value={grade} onChange={(e) => { setGrade(e.target.value as typeof grade); setScores({}) }} className="w-full text-[13px] border border-neutral-200 rounded-xl px-3 py-2.5 text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
            {GRADES.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Section</label>
          <select value={section} onChange={(e) => { setSection(e.target.value as typeof section); setScores({}) }} className="w-full text-[13px] border border-neutral-200 rounded-xl px-3 py-2.5 text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
            {SECTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Subject</label>
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full text-[13px] border border-neutral-200 rounded-xl px-3 py-2.5 text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
            {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Exam Type</label>
          <select value={examType} onChange={(e) => setExamType(e.target.value)} className="w-full text-[13px] border border-neutral-200 rounded-xl px-3 py-2.5 text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
            {EXAM_TYPES.map((e) => <option key={e}>{e}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div>
            <h2 className="text-[14px] font-semibold text-neutral-900">Grade {grade}-{section} · {subject} · {examType}</h2>
            <p className="text-[11.5px] text-neutral-400 mt-0.5">{enteredCount} of {roster.length} scores entered</p>
          </div>
          <button
            onClick={handleSave}
            disabled={enteredCount === 0}
            className={`flex items-center gap-2 text-[13px] font-semibold px-3.5 py-2 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              saved ? 'bg-success-bg text-success' : 'bg-ink-700 text-white hover:bg-ink-800'
            }`}
          >
            {saved ? <><CheckCircle2 size={14} /> Saved</> : <><Save size={14} /> Save All</>}
          </button>
        </div>

        <div className="divide-y divide-neutral-100">
          {roster.map((s) => (
            <div key={s.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="w-8 h-8 rounded-full bg-ink-100 text-ink-700 flex items-center justify-center font-mono text-[10px] font-bold shrink-0">{INITIALS(s.full_name)}</div>
              <div className="flex-1 min-w-0">
                <span className="block text-[13px] font-medium text-neutral-900 truncate">{s.full_name}</span>
                <span className="block text-[11px] font-mono text-neutral-400">{s.roll_number}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  value={scores[s.roll_number] ?? ''}
                  onChange={(e) => setScore(s.roll_number, e.target.value)}
                  placeholder="—"
                  inputMode="numeric"
                  className="w-16 text-center px-2 py-2 border border-neutral-200 rounded-xl text-[13px] font-mono focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 transition-all"
                />
                <span className="text-[12px] text-neutral-400 font-mono">/ {MAX_SCORE}</span>
              </div>
            </div>
          ))}
          {roster.length === 0 && (
            <div className="px-5 py-10 text-center text-[13px] text-neutral-400">No students in this class.</div>
          )}
        </div>
      </div>
    </>
  )
}
