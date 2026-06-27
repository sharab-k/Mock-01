'use client'

import { useState, useMemo } from 'react'
import StatCard from '@/components/dashboard/StatCard'
import { PenLine, BookOpen, Users, CheckCircle, Upload, X } from 'lucide-react'

const STATS = [
  { label: 'Entries This Week', value: '89',  icon: <PenLine size={22} />,     iconBg: 'bg-ink-100',    iconColor: 'text-ink-600', sub: 'across 4 subjects'          },
  { label: 'Subjects Covered',  value: '6',   icon: <BookOpen size={22} />,    iconBg: 'bg-warning-bg', iconColor: 'text-warning', sub: 'of 8 this term'             },
  { label: 'Students Graded',   value: '142', icon: <CheckCircle size={22} />, iconBg: 'bg-success-bg', iconColor: 'text-success', sub: '76.3% of 186', subUp: true   },
  { label: 'Pending Entry',     value: '44',  icon: <Users size={22} />,       iconBg: 'bg-danger-bg',  iconColor: 'text-danger',  sub: '23.7% remaining'            },
]

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

const TIERS = [
  { tier: 'Distinction', range: '80% and above', count: 58, color: 'bg-success', textColor: 'text-success', bgColor: 'bg-success-bg' },
  { tier: 'Merit',       range: '65% – 79%',     count: 49, color: 'bg-ink-500', textColor: 'text-ink-600', bgColor: 'bg-ink-50'     },
  { tier: 'Pass',        range: '50% – 64%',     count: 35, color: 'bg-warning', textColor: 'text-warning', bgColor: 'bg-warning-bg' },
  { tier: 'Below Pass',  range: 'Below 50%',     count: 0,  color: 'bg-danger',  textColor: 'text-danger',  bgColor: 'bg-danger-bg'  },
]

const SUBJECTS = [
  { name: 'Mathematics', entries: 42, avg: 74 },
  { name: 'English',     entries: 38, avg: 81 },
  { name: 'Physics',     entries: 35, avg: 70 },
  { name: 'Chemistry',   entries: 31, avg: 68 },
  { name: 'Biology',     entries: 28, avg: 76 },
  { name: 'Urdu',        entries: 45, avg: 83 },
]

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

const INITIALS = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

const TOTAL_TIERED  = TIERS.reduce((a, t) => a + t.count, 0)
const ALL_SUBJECTS  = ['All Subjects', ...Array.from(new Set(ALL_MARKS.map(m => m.subject))).sort()]
const ALL_GRADES    = ['All Grades', '9', '10', '11', '12']

export default function MarksDashboard() {
  const [gradeFilter,    setGradeFilter]   = useState('All Grades')
  const [subjectFilter,  setSubjectFilter] = useState('All Subjects')
  const [showBulkHint,   setShowBulkHint] = useState(false)

  const filteredMarks = useMemo(() =>
    ALL_MARKS.filter(m => {
      const g = gradeFilter   === 'All Grades'   || m.grade   === gradeFilter
      const s = subjectFilter === 'All Subjects' || m.subject === subjectFilter
      return g && s
    }),
    [gradeFilter, subjectFilter]
  )

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[20px] font-bold text-neutral-900">Grade Entry Pipeline</h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">Scholastic grade entries and tier evaluations — Grades 9–12</p>
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
          <a href="/marks/enter" className="flex items-center gap-2 px-3.5 py-2 bg-white border border-neutral-200 text-neutral-700 text-[13px] font-medium rounded-xl hover:bg-neutral-50 transition-colors no-underline">
            <PenLine size={14} /> Enter Marks
          </a>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Tier evaluation */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 gap-3">
          <div>
            <h2 className="text-[14px] font-semibold text-neutral-900">Student Tier Evaluation</h2>
            <p className="text-[11.5px] text-neutral-400 mt-0.5">Current term · {TOTAL_TIERED} students evaluated</p>
          </div>
          <a href="/marks/reports" className="text-[12px] text-ink-600 hover:text-ink-800 no-underline font-medium shrink-0">Full report →</a>
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 divide-y xl:divide-y-0 xl:divide-x divide-neutral-100">
          {TIERS.map(t => (
            <div key={t.tier} className={`p-5 ${t.count === 0 ? 'opacity-50' : ''}`}>
              <div className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[11px] font-semibold mb-3 ${t.bgColor} ${t.textColor}`}>{t.tier}</div>
              {t.count === 0 ? (
                <>
                  <div className="text-[22px] font-bold text-neutral-300 leading-none mb-1">—</div>
                  <div className="text-[11.5px] text-neutral-300 mb-3">{t.range}</div>
                  <div className="h-1.5 bg-neutral-100 rounded-full" />
                  <p className="text-[10.5px] text-neutral-400 mt-2">No students yet</p>
                </>
              ) : (
                <>
                  <div className="text-[28px] font-bold text-neutral-900 leading-none mb-1">{t.count}</div>
                  <div className="text-[11.5px] text-neutral-400 mb-3">{t.range}</div>
                  <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${t.color}`} style={{ width: `${(t.count / TOTAL_TIERED) * 100}%` }} />
                  </div>
                  <p className="text-[10.5px] text-neutral-400 mt-1.5">{Math.round((t.count / TOTAL_TIERED) * 100)}% of total</p>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Recent entries — 2/3 */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 gap-3 flex-wrap">
            <h2 className="text-[14px] font-semibold text-neutral-900">Recent Entries</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Class filter */}
              <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} className="text-[12px] border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
                {ALL_GRADES.map(g => <option key={g}>{g}</option>)}
              </select>
              {/* Subject filter */}
              <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className="text-[12px] border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
                {ALL_SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
              {(gradeFilter !== 'All Grades' || subjectFilter !== 'All Subjects') && (
                <button onClick={() => { setGradeFilter('All Grades'); setSubjectFilter('All Subjects') }} className="text-[11.5px] text-ink-600 font-medium">Clear ×</button>
              )}
              <a href="/marks/enter" className="text-[12px] text-ink-600 hover:text-ink-800 no-underline font-medium ml-1">Enter →</a>
            </div>
          </div>

          {filteredMarks.length === 0 ? (
            <div className="flex flex-col items-center py-14 text-center px-8">
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
                <BookOpen size={22} className="text-neutral-300" />
              </div>
              <p className="text-[14px] font-semibold text-neutral-600 mb-1">No entries for this filter</p>
              <p className="text-[12.5px] text-neutral-400">Marks for this grade/subject combination have not been entered yet.</p>
              <button onClick={() => { setGradeFilter('All Grades'); setSubjectFilter('All Subjects') }} className="mt-4 text-[12.5px] font-medium text-ink-600 hover:text-ink-800">Clear filters →</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[480px]">
                <thead>
                  <tr className="bg-neutral-50 text-left">
                    <th className="px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Student</th>
                    <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider hidden sm:table-cell">Grade</th>
                    <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Subject</th>
                    <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Score</th>
                    <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredMarks.map(m => (
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
                      <td className="px-3 py-3.5 hidden sm:table-cell">
                        <span className="inline-flex bg-ink-50 text-ink-700 text-[11px] font-semibold px-2 py-0.5 rounded-full font-mono">{m.grade}-{m.section}</span>
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

        {/* Subject averages — 1/3 */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-5">
          <h2 className="text-[14px] font-semibold text-neutral-900 mb-5">Subject Averages</h2>
          <div className="space-y-4">
            {SUBJECTS.map(s => (
              <div key={s.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] text-neutral-700">{s.name}</span>
                  <span className={`text-[12px] font-semibold font-mono ${s.avg >= 80 ? 'text-success' : s.avg >= 65 ? 'text-warning' : 'text-danger'}`}>{s.avg}%</span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${s.avg >= 80 ? 'bg-success' : s.avg >= 65 ? 'bg-warning' : 'bg-danger'}`} style={{ width: `${s.avg}%` }} />
                </div>
                <p className="text-[10.5px] text-neutral-400 mt-1">{s.entries} students</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
