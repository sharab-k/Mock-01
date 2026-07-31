'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, X, BookOpen } from 'lucide-react'
import type { SubjectStat } from '@/lib/marks/subjects-data'

// A new subject added here is client-state only — CLAUDE.md's schema has no
// `subjects` table (subject is free text on `marks`), so a subject only
// really exists once a mark is entered against it via /marks/enter.
export default function MarksSubjectsContent({ initialSubjects }: { initialSubjects: SubjectStat[] }) {
  const [subjects, setSubjects] = useState<SubjectStat[]>(initialSubjects)
  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')

  const addSubject = () => {
    if (!name.trim()) return
    setSubjects((prev) => [...prev, { name: name.trim(), entries: 0, avg: 0 }])
    setName('')
    setModalOpen(false)
  }

  return (
    <>
      <div>
        <Link href="/marks" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Marks
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-[20px] font-bold text-neutral-900">Subjects</h1>
            <p className="text-[13px] text-neutral-500 mt-0.5">{subjects.length} subjects tracked this term</p>
          </div>
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-3.5 py-2 bg-ink-700 text-white text-[13px] font-semibold rounded-xl hover:bg-ink-800 transition-colors">
            <Plus size={14} /> Add Subject
          </button>
        </div>
      </div>

      {subjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 py-16 text-center text-[13px] text-neutral-400">No marks entered yet this term.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {subjects.map((s) => (
            <div key={s.name} className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-ink-100 flex items-center justify-center shrink-0">
                  <BookOpen size={16} className="text-ink-600" />
                </div>
                <p className="text-[14px] font-semibold text-neutral-900">{s.name}</p>
              </div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] text-neutral-500">Average</span>
                <span className={`text-[13px] font-bold font-mono ${s.avg >= 80 ? 'text-success' : s.avg >= 65 ? 'text-ink-600' : s.avg > 0 ? 'text-warning' : 'text-neutral-300'}`}>{s.avg > 0 ? `${s.avg}%` : '—'}</span>
              </div>
              <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden mb-3">
                <div className={`h-full rounded-full ${s.avg >= 80 ? 'bg-success' : s.avg >= 65 ? 'bg-ink-400' : 'bg-warning'}`} style={{ width: `${s.avg}%` }} />
              </div>
              <p className="text-[11px] text-neutral-400">{s.entries} entries</p>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative w-full sm:max-w-sm bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
              <h3 className="text-[15px] font-bold text-neutral-900">Add Subject</h3>
              <button onClick={() => setModalOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Subject name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Computer Science" className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-neutral-50 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all" />
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setModalOpen(false)} className="flex-1 py-3 text-[13px] font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors">Cancel</button>
                <button onClick={addSubject} disabled={!name.trim()} className="flex-1 py-3 text-[13px] font-semibold rounded-xl bg-ink-700 text-white hover:bg-ink-800 transition-colors disabled:opacity-50">Add</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
