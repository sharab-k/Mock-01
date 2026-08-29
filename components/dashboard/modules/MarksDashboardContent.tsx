'use client'

import Link from 'next/link'
import { useState } from 'react'
import StatCard from '@/components/dashboard/StatCard'
import { PenLine, BookOpen, CheckCircle, Users, Upload, X, ClipboardList } from 'lucide-react'
import { TIER_ORDER, TIER_RANGE, TIER_STYLE, type Tier } from '@/lib/marks/tier'
import { GRADES, sectionsForGrade } from '@/lib/students/constants'
import type { ClassMarksStat, SubjectStat } from '@/lib/marks/dashboard-data'

function avgStyle(avg: number): { badge: string; bar: string } {
  if (avg >= 80) return { badge: 'text-success',  bar: 'bg-success'  }
  if (avg >= 65) return { badge: 'text-ink-600',  bar: 'bg-ink-400'  }
  if (avg >= 50) return { badge: 'text-warning',  bar: 'bg-warning'  }
  return             { badge: 'text-danger',   bar: 'bg-danger'   }
}

type Props = {
  /** Route prefix for this dashboard's own links — lets Super Admin render the
   *  identical dashboard within its own shell instead of a simplified duplicate. */
  basePath?: string
  classStats: Record<string, Record<string, ClassMarksStat>>
  totalEnrolled: number
  entriesThisWeek: number
  subjectsCovered: number
  studentsGraded: number
  pendingEntry: number
  tierCounts: Record<Tier, number>
  totalTiered: number
  subjects: SubjectStat[]
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MarksDashboardContent({
  basePath = '/marks',
  classStats,
  totalEnrolled,
  entriesThisWeek,
  subjectsCovered,
  studentsGraded,
  pendingEntry,
  tierCounts,
  totalTiered,
  subjects,
}: Props) {
  const [showBulkHint, setShowBulkHint] = useState(false)

  const STATS = [
    { label: 'Entries This Week', value: String(entriesThisWeek), icon: <PenLine size={22} />,     iconBg: 'bg-ink-100',    iconColor: 'text-ink-600', sub: 'across all classes'                       },
    { label: 'Subjects Covered',  value: String(subjectsCovered), icon: <BookOpen size={22} />,    iconBg: 'bg-warning-bg', iconColor: 'text-warning', sub: 'this term'                                },
    { label: 'Students Graded',   value: String(studentsGraded),  icon: <CheckCircle size={22} />, iconBg: 'bg-success-bg', iconColor: 'text-success', sub: totalEnrolled > 0 ? `${Math.round((studentsGraded/totalEnrolled)*100)}% of ${totalEnrolled}` : 'No students enrolled', subUp: true },
    { label: 'Pending Entry',     value: String(pendingEntry),    icon: <Users size={22} />,       iconBg: 'bg-danger-bg',  iconColor: 'text-danger',  sub: totalEnrolled > 0 ? `${Math.round((pendingEntry/totalEnrolled)*100)}% remaining` : 'No students enrolled' },
  ]

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
          <Link href={`${basePath}/tests`} className="flex items-center gap-2 px-3.5 py-2 bg-white border border-neutral-200 text-neutral-700 text-[13px] font-medium rounded-xl hover:bg-neutral-50 transition-colors no-underline">
            <ClipboardList size={14} /> Tests
          </Link>
          <Link href={`${basePath}/enter`} className="flex items-center gap-2 px-3.5 py-2 bg-white border border-neutral-200 text-neutral-700 text-[13px] font-medium rounded-xl hover:bg-neutral-50 transition-colors no-underline">
            <PenLine size={14} /> Enter Marks
          </Link>
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
          <span className="text-[12px] font-mono text-neutral-400 shrink-0">{totalEnrolled} students</span>
        </div>

        <div className="p-5 space-y-5">
          {GRADES.map(grade => (
            <div key={grade}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Grade {grade}</span>
                <div className="flex-1 h-px bg-neutral-100" />
                <span className="text-[10px] font-mono text-neutral-400">
                  {Object.values(classStats[grade]).reduce((a, c) => a + c.total, 0)} students
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {sectionsForGrade(grade).map(section => {
                  const c   = classStats[grade][section]
                  const st  = avgStyle(c.avg)
                  const pct = c.total > 0 ? Math.round((c.graded / c.total) * 100) : 0
                  return (
                    <Link
                      key={section}
                      href={`${basePath}/${grade}/${section}`}
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
            <p className="text-[11.5px] text-neutral-400 mt-0.5">Current term · {totalTiered} students evaluated</p>
          </div>
          <Link href={`${basePath}/reports`} className="text-[12px] text-ink-600 hover:text-ink-800 no-underline font-medium shrink-0">Full report →</Link>
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 divide-y xl:divide-y-0 xl:divide-x divide-neutral-100">
          {TIER_ORDER.map(tier => {
            const count = tierCounts[tier]
            const style = TIER_STYLE[tier]
            return (
              <div key={tier} className={`p-5 ${count === 0 ? 'opacity-50' : ''}`}>
                <div className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[11px] font-semibold mb-3 ${style.bgColor} ${style.textColor}`}>{tier}</div>
                {count === 0 ? (
                  <>
                    <div className="text-[22px] font-bold text-neutral-300 leading-none mb-1">—</div>
                    <div className="text-[11.5px] text-neutral-300 mb-3">{TIER_RANGE[tier]}</div>
                    <div className="h-1.5 bg-neutral-100 rounded-full" />
                    <p className="text-[10.5px] text-neutral-400 mt-2">No students yet</p>
                  </>
                ) : (
                  <>
                    <div className="text-[28px] font-bold text-neutral-900 leading-none mb-1">{count}</div>
                    <div className="text-[11.5px] text-neutral-400 mb-3">{TIER_RANGE[tier]}</div>
                    <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${style.barColor}`} style={{ width: `${(count / totalTiered) * 100}%` }} />
                    </div>
                    <p className="text-[10.5px] text-neutral-400 mt-1.5">{Math.round((count / totalTiered) * 100)}% of total</p>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Subject averages */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-5">
        <h2 className="text-[14px] font-semibold text-neutral-900 mb-5">Subject Averages</h2>
        {subjects.length === 0 ? (
          <p className="text-[13px] text-neutral-400 py-4 text-center">No marks entered yet this term.</p>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-4">
          {subjects.map(s => (
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
        )}
      </div>
    </>
  )
}
