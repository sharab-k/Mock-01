'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileDown, CheckCircle2, Loader2 } from 'lucide-react'

const MY_MARKS = [
  { subject: 'Mathematics', exam: 'Monthly',     score: 87, max: 100, grade: 'A',  date: '10 Jan 2026' },
  { subject: 'English',     exam: 'Monthly',     score: 91, max: 100, grade: 'A+', date: '10 Jan 2026' },
  { subject: 'Physics',     exam: 'Half-Yearly', score: 74, max: 100, grade: 'B',  date: '8 Jan 2026'  },
  { subject: 'Chemistry',   exam: 'Half-Yearly', score: 68, max: 100, grade: 'B-', date: '8 Jan 2026'  },
  { subject: 'Urdu',        exam: 'Monthly',     score: 83, max: 100, grade: 'A-', date: '6 Jan 2026'  },
  { subject: 'Mathematics', exam: 'Half-Yearly', score: 79, max: 100, grade: 'B+', date: '20 Dec 2025' },
  { subject: 'English',     exam: 'Half-Yearly', score: 85, max: 100, grade: 'A',  date: '20 Dec 2025' },
  { subject: 'Physics',     exam: 'Monthly',     score: 71, max: 100, grade: 'B',  date: '15 Dec 2025' },
]

const SUBJECTS = ['All Subjects', ...Array.from(new Set(MY_MARKS.map((m) => m.subject)))]
const EXAM_TYPES = ['All Exams', 'Monthly', 'Half-Yearly', 'Final']

const EXAM_PILL: Record<string, string> = {
  Monthly: 'bg-ink-100 text-ink-700',
  'Half-Yearly': 'bg-warning-bg text-warning',
}

const scoreColor = (s: number, max: number) => {
  const pct = (s / max) * 100
  return pct >= 80 ? 'bg-success' : pct >= 65 ? 'bg-warning' : 'bg-danger'
}
const gradeColor = (g: string) => (g.startsWith('A') ? 'text-success' : g.startsWith('B') ? 'text-ink-600' : 'text-warning')

export default function StudentMarksPage() {
  const [subjectFilter, setSubjectFilter] = useState('All Subjects')
  const [examFilter, setExamFilter] = useState('All Exams')
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  const filtered = useMemo(() => {
    return MY_MARKS.filter((m) => {
      const matchesSubject = subjectFilter === 'All Subjects' || m.subject === subjectFilter
      const matchesExam = examFilter === 'All Exams' || m.exam === examFilter
      return matchesSubject && matchesExam
    })
  }, [subjectFilter, examFilter])

  const avg = Math.round(filtered.reduce((a, m) => a + (m.score / m.max) * 100, 0) / (filtered.length || 1))

  const handleDownload = () => {
    setDownloading(true)
    setTimeout(() => {
      setDownloading(false)
      setDownloaded(true)
      setTimeout(() => setDownloaded(false), 3000)
    }, 1500)
  }

  return (
    <>
      <div>
        <Link href="/student" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Dashboard
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-[20px] font-bold text-neutral-900">My Marks</h1>
            <p className="text-[13px] text-neutral-500 mt-0.5">{filtered.length} entries · {avg}% average</p>
          </div>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className={`flex items-center gap-2 text-[13px] font-semibold px-3.5 py-2 rounded-xl transition-all ${downloaded ? 'bg-success-bg text-success' : 'bg-ink-700 text-white hover:bg-ink-800'}`}
          >
            {downloading ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : downloaded ? <><CheckCircle2 size={14} /> Downloaded</> : <><FileDown size={14} /> Progress Report</>}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4 flex items-center gap-3 flex-wrap">
        <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="text-[12.5px] border border-neutral-200 rounded-xl px-3 py-2.5 text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
          {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={examFilter} onChange={(e) => setExamFilter(e.target.value)} className="text-[12.5px] border border-neutral-200 rounded-xl px-3 py-2.5 text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
          {EXAM_TYPES.map((e) => <option key={e}>{e}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-neutral-50 text-left border-b border-neutral-100">
              <th className="px-6 py-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Subject</th>
              <th className="px-4 py-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Exam</th>
              <th className="px-4 py-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Score</th>
              <th className="px-4 py-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Grade</th>
              <th className="px-4 py-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.map((m, i) => (
              <tr key={i} className="hover:bg-neutral-50/70 transition-colors">
                <td className="px-6 py-3.5 font-medium text-neutral-900">{m.subject}</td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${EXAM_PILL[m.exam] ?? ''}`}>{m.exam}</span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex flex-col gap-1.5">
                    <span className="font-mono text-[12px] text-neutral-700">{m.score}/{m.max}</span>
                    <div className="h-1 bg-neutral-100 rounded-full overflow-hidden w-full max-w-[5rem]">
                      <div className={`h-full rounded-full ${scoreColor(m.score, m.max)}`} style={{ width: `${Math.round((m.score / m.max) * 100)}%` }} />
                    </div>
                  </div>
                </td>
                <td className={`px-4 py-3.5 font-mono text-[13px] font-bold ${gradeColor(m.grade)}`}>{m.grade}</td>
                <td className="px-4 py-3.5 text-neutral-400 text-[12px] font-mono">{m.date}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-[13px] text-neutral-400">No entries match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
