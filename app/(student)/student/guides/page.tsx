'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, Check } from 'lucide-react'

const GUIDES = [
  { subject: 'Mathematics', title: 'Algebra Reference Sheet',    date: '20 Jan 2026' },
  { subject: 'Physics',     title: 'Formula Booklet Term 2',     date: '18 Jan 2026' },
  { subject: 'Chemistry',   title: 'Periodic Table Chart',       date: '15 Jan 2026' },
  { subject: 'English',     title: 'Essay Writing Guide',        date: '12 Jan 2026' },
  { subject: 'Urdu',        title: 'Grammar Quick Reference',     date: '10 Jan 2026' },
  { subject: 'Mathematics', title: 'Trigonometry Cheat Sheet',    date: '8 Jan 2026'  },
  { subject: 'Biology',     title: 'Cell Diagram Handouts',      date: '5 Jan 2026'  },
]

const SUBJ_COLOR: Record<string, string> = {
  Mathematics: 'bg-ink-200 text-ink-800',
  English: 'bg-success-bg text-success',
  Physics: 'bg-warning-bg text-warning',
  Chemistry: 'bg-danger-bg text-danger',
  Urdu: 'bg-ink-100 text-ink-600',
  Biology: 'bg-success-bg text-success',
}

const SUBJECTS = ['All Subjects', ...Array.from(new Set(GUIDES.map((g) => g.subject)))]

export default function StudentGuidesPage() {
  const [subjectFilter, setSubjectFilter] = useState('All Subjects')
  const [downloadedId, setDownloadedId] = useState<string | null>(null)

  const filtered = useMemo(() => subjectFilter === 'All Subjects' ? GUIDES : GUIDES.filter((g) => g.subject === subjectFilter), [subjectFilter])

  const download = (title: string) => {
    setDownloadedId(title)
    setTimeout(() => setDownloadedId(null), 2000)
  }

  return (
    <>
      <div>
        <Link href="/student" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Dashboard
        </Link>
        <h1 className="text-[20px] font-bold text-neutral-900">Study Guides</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">{GUIDES.length} resources available</p>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4">
        <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="text-[12.5px] border border-neutral-200 rounded-xl px-3 py-2.5 text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
          {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="divide-y divide-neutral-100">
          {filtered.map((g) => (
            <div key={g.title} className="flex items-center gap-4 px-5 py-4 hover:bg-neutral-50/80 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-ink-50 border border-ink-100 flex flex-col items-center justify-center shrink-0 gap-0.5">
                <span className="text-[8px] font-bold text-ink-500 leading-none">PDF</span>
                <div className="w-4 h-[1px] bg-ink-200" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-[13px] font-medium text-neutral-900 truncate">{g.title}</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${SUBJ_COLOR[g.subject] ?? 'bg-neutral-100 text-neutral-500'}`}>{g.subject}</span>
                  <span className="text-[11px] font-mono text-neutral-400">{g.date}</span>
                </div>
              </div>
              <button onClick={() => download(g.title)} className={`flex items-center gap-1.5 text-[12px] font-medium shrink-0 px-3 py-1.5 rounded-lg transition-colors ${downloadedId === g.title ? 'text-success bg-success-bg' : 'text-ink-600 hover:bg-ink-50'}`}>
                {downloadedId === g.title ? <><Check size={13} /> Downloaded</> : <><Download size={13} /> Download</>}
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
