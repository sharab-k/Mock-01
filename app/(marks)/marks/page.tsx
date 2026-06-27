'use client'

import Link from 'next/link'
import { useState } from 'react'
import StatCard from '@/components/dashboard/StatCard'
import { PenLine, BookOpen, CheckCircle, Users, Upload, X } from 'lucide-react'

// ── Per-class marks stats (TODO: replace with Supabase aggregate query) ───────
const CLASS_MARKS: Record<string, Record<string, { avg: number; entries: number; graded: number; total: number }>> = {
  '9':  {
    A: { avg: 78, entries: 28, graded: 28, total: 30 },
    B: { avg: 65, entries: 24, graded: 24, total: 28 },
    C: { avg: 82, entries: 30, graded: 30, total: 32 },
    D: { avg: 71, entries: 20, graded: 20, total: 26 },
  },
  '10': {
    A: { avg: 85, entries: 31, graded: 31, total: 31 },
    B: { avg: 60, entries: 22, graded: 22, total: 27 },
    C: { avg: 74, entries: 27, graded: 27, total: 29 },
    D: { avg: 88, entries: 33, graded: 33, total: 33 },
  },
  '11': {
    A: { avg: 58, entries: 20, graded: 20, total: 28 },
    B: { avg: 79, entries: 28, graded: 28, total: 30 },
    C: { avg: 67, entries: 24, graded: 24, total: 26 },
    D: { avg: 72, entries: 27, graded: 27, total: 29 },
  },
  '12': {
    A: { avg: 81, entries: 24, graded: 24, total: 24 },
    B: { avg: 76, entries: 25, graded: 25, total: 27 },
    C: { avg: 63, entries: 22, graded: 22, total: 25 },
    D: { avg: 55, entries: 18, graded: 18, total: 23 },
  },
}

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

// ── Derived global totals ─────────────────────────────────────────────────────
const ALL_CLASSES   = Object.values(CLASS_MARKS).flatMap(g => Object.values(g))
const TOTAL_ENTRIES = ALL_CLASSES.reduce((a, c) => a + c.entries, 0)
const TOTAL_GRADED  = ALL_CLASSES.reduce((a, c) => a + c.graded,  0)
const TOTAL_ENROLL  = ALL_CLASSES.reduce((a, c) => a + c.total,   0)
const TOTAL_PENDING = TOTAL_ENROLL - TOTAL_GRADED
const TOTAL_TIERED  = TIERS.reduce((a, t) => a + t.count, 0)

const STATS = [
  { label: 'Entries This Week', value: String(TOTAL_ENTRIES), icon: <PenLine size={22} />,     iconBg: 'bg-ink-100',    iconColor: 'text-ink-600', sub: 'across all classes'                       },
  { label: 'Subjects Covered',  value: '6',                   icon: <BookOpen size={22} />,    iconBg: 'bg-warning-bg', iconColor: 'text-warning', sub: 'of 8 this term'                           },
  { label: 'Students Graded',   value: String(TOTAL_GRADED),  icon: <CheckCircle size={22} />, iconBg: 'bg-success-bg', iconColor: 'text-success', sub: `${Math.round((TOTAL_GRADED/TOTAL_ENROLL)*100)}% of ${TOTAL_ENROLL}`, subUp: true },
  { label: 'Pending Entry',     value: String(TOTAL_PENDING), icon: <Users size={22} />,       iconBg: 'bg-danger-bg',  iconColor: 'text-danger',  sub: `${Math.round((TOTAL_PENDING/TOTAL_ENROLL)*100)}% remaining` },
]

function avgStyle(avg: number): { badge: string; bar: string } {
  if (avg >= 80) return { badge: 'text-success',  bar: 'bg-success'  }
  if (avg >= 65) return { badge: 'text-ink-600',  bar: 'bg-ink-400'  }
  if (avg >= 50) return { badge: 'text-warning',  bar: 'bg-warning'  }
  return             { badge: 'text-danger',   bar: 'bg-danger'   }
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function MarksDashboard() {
  const [showBulkHint, setShowBulkHint] = useState(false)

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[20px] font-bold text-neutral-900">Grade Entry Pipeline</h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">Select a class to view and enter marks — Grades 9–12</p>
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

      {/* Class / Section marks grid */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 gap-3">
          <div>
            <h2 className="text-[14px] font-semibold text-neutral-900">Class Score Overview</h2>
            <p className="text-[11.5px] text-neutral-400 mt-0.5 hidden sm:block">Click a class to view, enter, and filter marks by subject</p>
          </div>
          <span className="text-[12px] font-mono text-neutral-400 shrink-0">{TOTAL_ENROLL} students</span>
        </div>

        <div className="p-5 space-y-5">
          {(['9', '10', '11', '12'] as const).map(grade => (
            <div key={grade}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Grade {grade}</span>
                <div className="flex-1 h-px bg-neutral-100" />
                <span className="text-[10px] font-mono text-neutral-400">
                  {Object.values(CLASS_MARKS[grade]).reduce((a, c) => a + c.total, 0)} students
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(['A', 'B', 'C', 'D'] as const).map(section => {
                  const c   = CLASS_MARKS[grade][section]
                  const st  = avgStyle(c.avg)
                  const pct = Math.round((c.graded / c.total) * 100)
                  return (
                    <Link
                      key={section}
                      href={`/marks/${grade}/${section}`}
                      className="group relative flex flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white no-underline py-6 px-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-ink-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400 focus-visible:ring-offset-2"
                      aria-label={`Grade ${grade} Section ${section} — avg ${c.avg}%`}
                    >
                      {/* Graded % bar at bottom */}
                      <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-2xl overflow-hidden bg-neutral-100">
                        <div className="h-full bg-ink-200 group-hover:bg-ink-300 transition-colors" style={{ width: `${pct}%` }} />
                      </div>

                      {/* Class label */}
                      <span className="font-mono leading-none select-none">
                        <span className="text-[26px] font-bold text-ink-700">{grade}</span>
                        <span className="text-[20px] font-semibold text-ink-400">{section}</span>
                      </span>

                      {/* Average */}
                      <span className={`text-[13px] font-bold mt-1.5 tabular-nums font-mono ${st.badge}`}>{c.avg}%</span>

                      {/* Entries */}
                      <span className="text-[10.5px] font-medium mt-0.5 text-neutral-400 tabular-nums group-hover:text-neutral-600 transition-colors">
                        {c.entries} entries
                      </span>

                      <span className="absolute top-3 right-3.5 text-[11px] text-neutral-200 group-hover:text-ink-400 transition-colors font-medium">→</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
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

      {/* Subject averages */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-5">
        <h2 className="text-[14px] font-semibold text-neutral-900 mb-5">Subject Averages</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-4">
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
    </>
  )
}
