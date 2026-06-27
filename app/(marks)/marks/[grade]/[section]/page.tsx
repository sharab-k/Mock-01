'use client'

import { use, useState, useMemo } from 'react'
import Link from 'next/link'
import StatCard from '@/components/dashboard/StatCard'
import { ArrowLeft, PenLine, BookOpen, CheckCircle, Users, Upload, X } from 'lucide-react'

// ── Types & constants ─────────────────────────────────────────────────────────
const VALID_GRADES   = ['9', '10', '11', '12']
const VALID_SECTIONS = ['A', 'B', 'C', 'D']

const INITIALS = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

const EXAM_STYLE: Record<string, string> = {
  'Monthly':     'bg-ink-100 text-ink-700',
  'Half-Yearly': 'bg-warning-bg text-warning',
  'Final':       'bg-success-bg text-success',
}

const GRADE_COLOR = (g: string) => {
  if (g.startsWith('A')) return 'text-success font-bold'
  if (g.startsWith('B')) return 'text-ink-600 font-bold'
  if (g.startsWith('C')) return 'text-warning font-bold'
  return 'text-danger font-bold'
}

const SCORE_BAR = (score: number, max: number) => {
  const pct = (score / max) * 100
  return pct >= 80 ? 'bg-success' : pct >= 65 ? 'bg-ink-400' : pct >= 50 ? 'bg-warning' : 'bg-danger'
}

// ── Mock data (TODO: replace with Supabase query filtered by grade + section) ─
const ALL_MARKS = [
  { student: 'Ahmed Ali',    roll: 'JE-2026-001', grade: '10', section: 'A', subject: 'Mathematics', exam: 'Monthly',     score: 87, max: 100, grade_val: 'A'  },
  { student: 'Sara Khan',    roll: 'JE-2026-002', grade: '9',  section: 'A', subject: 'English',     exam: 'Monthly',     score: 91, max: 100, grade_val: 'A+' },
  { student: 'Bilal Raza',   roll: 'JE-2026-003', grade: '12', section: 'A', subject: 'Physics',     exam: 'Half-Yearly', score: 74, max: 100, grade_val: 'B'  },
  { student: 'Fatima Noor',  roll: 'JE-2026-004', grade: '11', section: 'B', subject: 'Chemistry',   exam: 'Half-Yearly', score: 68, max: 100, grade_val: 'B-' },
  { student: 'Hina Baig',    roll: 'JE-2026-018', grade: '9',  section: 'B', subject: 'Mathematics', exam: 'Monthly',     score: 55, max: 100, grade_val: 'C+' },
  { student: 'Kamran Malik', roll: 'JE-2026-031', grade: '12', section: 'B', subject: 'Biology',     exam: 'Monthly',     score: 79, max: 100, grade_val: 'B+' },
  { student: 'Sana Mir',     roll: 'JE-2026-044', grade: '12', section: 'A', subject: 'Urdu',        exam: 'Monthly',     score: 88, max: 100, grade_val: 'A'  },
  { student: 'Dawood Ilyas', roll: 'JE-2026-057', grade: '11', section: 'A', subject: 'Physics',     exam: 'Monthly',     score: 63, max: 100, grade_val: 'C+' },
  { student: 'Tariq Ansari', roll: 'JE-2026-071', grade: '11', section: 'B', subject: 'Mathematics', exam: 'Half-Yearly', score: 80, max: 100, grade_val: 'A-' },
  { student: 'Amna Farooq',  roll: 'JE-2026-079', grade: '10', section: 'C', subject: 'Biology',     exam: 'Monthly',     score: 74, max: 100, grade_val: 'B'  },
]

const ALL_EXAM_TYPES = ['All Exams', 'Monthly', 'Half-Yearly', 'Final']

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ClassMarksPage({
  params,
}: {
  params: Promise<{ grade: string; section: string }>
}) {
  const { grade, section } = use(params)

  const classMarks = useMemo(
    () => ALL_MARKS.filter(m => m.grade === grade && m.section === section),
    [grade, section]
  )

  const ALL_SUBJECTS_FOR_CLASS = useMemo(
    () => ['All Subjects', ...Array.from(new Set(classMarks.map(m => m.subject))).sort()],
    [classMarks]
  )

  const [subjectFilter,  setSubjectFilter]  = useState('All Subjects')
  const [examFilter,     setExamFilter]     = useState('All Exams')
  const [showBulkHint,   setShowBulkHint]   = useState(false)

  const isValid = VALID_GRADES.includes(grade) && VALID_SECTIONS.includes(section)

  const filtered = useMemo(() =>
    classMarks.filter(m => {
      const s = subjectFilter === 'All Subjects' || m.subject === subjectFilter
      const e = examFilter    === 'All Exams'    || m.exam    === examFilter
      return s && e
    }),
    [classMarks, subjectFilter, examFilter]
  )

  if (!isValid) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-[15px] font-semibold text-neutral-600">Invalid class: Grade {grade} · Section {section}</p>
        <Link href="/marks" className="mt-4 text-[13px] font-medium text-ink-600 hover:text-ink-800">← Back to Marks</Link>
      </div>
    )
  }

  const totalEntries = classMarks.length
  const avgScore     = totalEntries > 0
    ? Math.round(classMarks.reduce((a, m) => a + (m.score / m.max) * 100, 0) / totalEntries)
    : 0
  const highCount    = classMarks.filter(m => (m.score / m.max) >= 0.80).length
  const needAttention = classMarks.filter(m => (m.score / m.max) < 0.50).length

  const STATS = [
    { label: 'Total Entries',  value: String(totalEntries), icon: <PenLine size={22} />,     iconBg: 'bg-ink-100',    iconColor: 'text-ink-600', sub: `Grade ${grade} · Section ${section}` },
    { label: 'Class Average',  value: `${avgScore}%`,       icon: <CheckCircle size={22} />, iconBg: 'bg-success-bg', iconColor: 'text-success', sub: avgScore >= 65 ? 'On track' : 'Below average', subUp: avgScore >= 65 },
    { label: 'High Scorers',   value: String(highCount),    icon: <BookOpen size={22} />,    iconBg: 'bg-warning-bg', iconColor: 'text-warning', sub: '80% and above' },
    { label: 'Need Attention', value: String(needAttention),icon: <Users size={22} />,       iconBg: needAttention > 0 ? 'bg-danger-bg' : 'bg-neutral-100', iconColor: needAttention > 0 ? 'text-danger' : 'text-neutral-400', sub: 'Below 50%' },
  ]

  return (
    <>
      {/* Back + header */}
      <div>
        <Link href="/marks" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Marks
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ink-700 flex items-center justify-center shrink-0">
              <span className="text-white font-mono text-[13px] font-bold">{grade}{section}</span>
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-neutral-900">Grade {grade} · Section {section}</h1>
              <p className="text-[13px] text-neutral-500 mt-0.5">
                {totalEntries === 0 ? 'No marks entered yet' : `${totalEntries} entr${totalEntries !== 1 ? 'ies' : 'y'} · current term`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <div className="relative">
              <button onClick={() => setShowBulkHint(v => !v)} className="flex items-center gap-2 px-3.5 py-2 bg-ink-700 text-white text-[13px] font-semibold rounded-xl hover:bg-ink-800 transition-colors">
                <Upload size={14} /> Bulk Upload
              </button>
              {showBulkHint && (
                <div className="absolute right-0 top-full mt-2 z-20 bg-white border border-neutral-200 rounded-2xl shadow-xl p-4 w-64 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[12px] font-semibold text-neutral-800">CSV format required</p>
                    <button onClick={() => setShowBulkHint(false)} className="text-neutral-400 hover:text-neutral-700"><X size={14} /></button>
                  </div>
                  <p className="text-[11px] text-neutral-500 font-mono leading-relaxed bg-neutral-50 rounded-xl p-2.5">roll_number, subject,<br />exam_type, score, max_score</p>
                  <p className="text-[11px] text-neutral-400 mt-2">Exam type: Monthly / Half-Yearly / Final</p>
                </div>
              )}
            </div>
            <Link href="/marks/enter" className="flex items-center gap-2 px-3.5 py-2 bg-white border border-neutral-200 text-neutral-700 text-[13px] font-medium rounded-xl hover:bg-neutral-50 transition-colors no-underline">
              <PenLine size={14} /> Enter Marks
            </Link>
          </div>
        </div>
      </div>

      {/* KPI */}
      {totalEntries > 0 && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {STATS.map(s => <StatCard key={s.label} {...s} />)}
        </div>
      )}

      {/* Marks table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 gap-3 flex-wrap">
          <h2 className="text-[14px] font-semibold text-neutral-900">Mark Entries</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={subjectFilter}
              onChange={e => setSubjectFilter(e.target.value)}
              className="text-[12px] border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer"
            >
              {ALL_SUBJECTS_FOR_CLASS.map(s => <option key={s}>{s}</option>)}
            </select>
            <select
              value={examFilter}
              onChange={e => setExamFilter(e.target.value)}
              className="text-[12px] border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer"
            >
              {ALL_EXAM_TYPES.map(e => <option key={e}>{e}</option>)}
            </select>
            {(subjectFilter !== 'All Subjects' || examFilter !== 'All Exams') && (
              <button onClick={() => { setSubjectFilter('All Subjects'); setExamFilter('All Exams') }} className="text-[11.5px] text-ink-600 font-medium">Clear ×</button>
            )}
            <Link href="/marks/enter" className="text-[12px] text-ink-600 hover:text-ink-800 no-underline font-medium ml-1">Enter →</Link>
          </div>
        </div>

        {totalEntries === 0 ? (
          <div className="flex flex-col items-center py-16 text-center px-8">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
              <BookOpen size={24} className="text-neutral-300" />
            </div>
            <p className="text-[15px] font-semibold text-neutral-600 mb-1">No marks for {grade}{section}</p>
            <p className="text-[13px] text-neutral-400 mb-5">Marks entered for this class will appear here.</p>
            <Link href="/marks/enter" className="inline-flex items-center gap-2 px-4 py-2.5 bg-ink-700 text-white text-[13px] font-semibold rounded-xl hover:bg-ink-800 transition-colors no-underline">
              <PenLine size={14} /> Enter First Marks
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center px-8">
            <p className="text-[14px] font-semibold text-neutral-600 mb-1">No entries match this filter</p>
            <button onClick={() => { setSubjectFilter('All Subjects'); setExamFilter('All Exams') }} className="mt-3 text-[12.5px] font-medium text-ink-600 hover:text-ink-800">Clear filters →</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[480px]">
              <thead>
                <tr className="bg-neutral-50 text-left">
                  <th className="px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Student</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Subject</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Score</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map(m => (
                  <tr key={`${m.roll}-${m.subject}-${m.exam}`} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-ink-100 text-ink-700 flex items-center justify-center font-mono text-[10px] font-bold shrink-0">
                          {INITIALS(m.student)}
                        </div>
                        <div className="min-w-0">
                          <span className="block font-medium text-neutral-900 truncate">{m.student}</span>
                          <span className="block text-[11px] font-mono text-neutral-400">{m.roll}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <div>
                        <span className="text-[13px] text-neutral-700">{m.subject}</span>
                        <span className={`block mt-0.5 text-[10px] inline-flex items-center px-1.5 py-0.5 rounded-full font-semibold ${EXAM_STYLE[m.exam] ?? ''}`}>{m.exam}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex flex-col gap-1.5">
                        <span className="font-mono text-[12px] text-neutral-700">{m.score}/{m.max}</span>
                        <div className="h-1 bg-neutral-100 rounded-full overflow-hidden w-full max-w-[4rem]">
                          <div className={`h-full rounded-full ${SCORE_BAR(m.score, m.max)}`} style={{ width: `${Math.round((m.score / m.max) * 100)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className={`px-3 py-3.5 font-mono text-[13px] ${GRADE_COLOR(m.grade_val)}`}>{m.grade_val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
