import StatCard from '@/components/dashboard/StatCard'
import { CalendarCheck, BookOpen, PlayCircle, ClipboardList, CheckCircle2, Clock3, XCircle } from 'lucide-react'

// ── Data ──────────────────────────────────────────────────────────────────────
const STATS = [
  { label: 'My Attendance',    value: '94%', icon: <CalendarCheck size={22} />, iconBg: 'bg-success-bg', iconColor: 'text-success', sub: '↑ 2% this month', subUp: true, href: '/student/attendance' },
  { label: 'Average Score',    value: '81%', icon: <BookOpen size={22} />,      iconBg: 'bg-ink-100',    iconColor: 'text-ink-600', sub: 'Grade B+',                     href: '/student/marks'      },
  { label: 'Lectures Watched', value: '12',  icon: <PlayCircle size={22} />,    iconBg: 'bg-warning-bg', iconColor: 'text-warning', sub: '3 unwatched this term',         href: '/student/lectures'   },
  { label: 'Pending Tasks',    value: '2',   icon: <ClipboardList size={22} />, iconBg: 'bg-danger-bg',  iconColor: 'text-danger',  sub: '1 assignment due soon',         href: '/student/assignments'},
]

const MY_MARKS = [
  { subject: 'Mathematics', exam: 'Monthly',     score: 87, max: 100, grade: 'A',  date: '10 Jan 2026' },
  { subject: 'English',     exam: 'Monthly',     score: 91, max: 100, grade: 'A+', date: '10 Jan 2026' },
  { subject: 'Physics',     exam: 'Half-Yearly', score: 74, max: 100, grade: 'B',  date: '8 Jan 2026'  },
  { subject: 'Chemistry',   exam: 'Half-Yearly', score: 68, max: 100, grade: 'B-', date: '8 Jan 2026'  },
  { subject: 'Urdu',        exam: 'Monthly',     score: 83, max: 100, grade: 'A-', date: '6 Jan 2026'  },
]

const ATTENDANCE_WEEK = [
  { day: 'Mon', date: '20', status: 'Present' as const },
  { day: 'Tue', date: '21', status: 'Present' as const },
  { day: 'Wed', date: '22', status: 'Late'    as const },
  { day: 'Thu', date: '23', status: 'Present' as const },
  { day: 'Fri', date: '24', status: 'Present' as const },
]

const LECTURES = [
  { subject: 'Mathematics', title: 'Quadratic Equations – Part 2', duration: '38 min', watched: true,  progress: 100 },
  { subject: 'Physics',     title: 'Laws of Motion – Lecture 4',   duration: '44 min', watched: true,  progress: 100 },
  { subject: 'Chemistry',   title: 'Periodic Table & Trends',       duration: '31 min', watched: false, progress: 62  },
  { subject: 'English',     title: 'Essay Structure & Techniques',  duration: '26 min', watched: false, progress: 0   },
]

const GUIDES = [
  { subject: 'Mathematics', title: 'Algebra Reference Sheet',  date: '20 Jan 2026' },
  { subject: 'Physics',     title: 'Formula Booklet Term 2',   date: '18 Jan 2026' },
  { subject: 'Chemistry',   title: 'Periodic Table Chart',     date: '15 Jan 2026' },
  { subject: 'English',     title: 'Essay Writing Guide',      date: '12 Jan 2026' },
]

const ASSIGNMENTS = [
  { subject: 'Mathematics', title: 'Chapter 5 – Practice Set',  due: '28 Jan 2026', status: 'Submitted'   },
  { subject: 'Physics',     title: 'Lab Report – Motion Exp.',  due: '30 Jan 2026', status: 'Pending'     },
  { subject: 'English',     title: 'Descriptive Essay Draft',   due: '2 Feb 2026',  status: 'Pending'     },
  { subject: 'Chemistry',   title: 'Atomic Models Assignment',  due: '5 Feb 2026',  status: 'Not Started' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
type AttStatus = 'Present' | 'Late' | 'Absent'

const ATT_CFG: Record<AttStatus, { icon: typeof CheckCircle2; ring: string; bg: string; text: string; label: string }> = {
  Present: { icon: CheckCircle2, ring: 'border-success',  bg: 'bg-success-bg',  text: 'text-success', label: 'Present' },
  Late:    { icon: Clock3,       ring: 'border-warning',  bg: 'bg-warning-bg',  text: 'text-warning', label: 'Late'    },
  Absent:  { icon: XCircle,      ring: 'border-danger',   bg: 'bg-danger-bg',   text: 'text-danger',  label: 'Absent'  },
}

const EXAM_PILL: Record<string, string> = {
  'Monthly':     'bg-ink-100 text-ink-700',
  'Half-Yearly': 'bg-warning-bg text-warning',
}

const ASSIGN_PILL: Record<string, string> = {
  Submitted:    'bg-success-bg text-success',
  Pending:      'bg-warning-bg text-warning',
  'Not Started':'bg-neutral-100 text-neutral-500',
}

const scoreColor = (s: number, max: number) => {
  const pct = (s / max) * 100
  return pct >= 80 ? 'bg-success' : pct >= 65 ? 'bg-warning' : 'bg-danger'
}

const gradeColor = (g: string) =>
  g.startsWith('A') ? 'text-success' : g.startsWith('B') ? 'text-ink-600' : 'text-warning'

const SUBJ_COLOR: Record<string, string> = {
  Mathematics: 'bg-ink-200 text-ink-800',
  English:     'bg-success-bg text-success',
  Physics:     'bg-warning-bg text-warning',
  Chemistry:   'bg-danger-bg text-danger',
  Urdu:        'bg-ink-100 text-ink-600',
}

export default function StudentDashboard() {
  const presentCount = ATTENDANCE_WEEK.filter(d => d.status === 'Present').length
  const lateCount    = ATTENDANCE_WEEK.filter(d => d.status === 'Late').length
  const weekRate     = Math.round(((presentCount + lateCount * 0.5) / ATTENDANCE_WEEK.length) * 100)

  return (
    <>
      {/* ── Identity card ───────────────────────────────────────────────── */}
      <div className="bg-ink-900 rounded-2xl overflow-hidden">
        <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #495F8D 0%, #6F83AE 60%, transparent 100%)' }} />
        <div className="px-7 py-6 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-ink-700 border border-ink-500/40 flex items-center justify-center text-white font-bold text-[17px] font-mono shrink-0">
            AA
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-white text-[17px] font-semibold tracking-tight">Ahmed Ali</h2>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-success bg-success/10 border border-success/20 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                Merit Tier · Grade B+
              </span>
            </div>
            <p className="text-ink-300 text-[12.5px] mt-1.5 flex items-center flex-wrap gap-x-2 gap-y-0.5">
              <span className="font-mono">JE-2026-001</span>
              <span className="text-ink-600">·</span>
              <span>Matriculation</span>
              <span className="text-ink-600">·</span>
              <span>Class X-A</span>
              <span className="text-ink-600">·</span>
              <span>Term 2, 2025–26</span>
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <a href="/student/marks"    className="px-4 py-2 text-[12px] font-medium text-ink-200 bg-white/8 hover:bg-white/14 border border-white/10 rounded-xl transition-colors no-underline">My Marks</a>
            <a href="/student/lectures" className="px-4 py-2 text-[12px] font-semibold text-ink-900 bg-white hover:bg-neutral-100 rounded-xl transition-colors no-underline">Lectures →</a>
          </div>
        </div>
      </div>

      {/* ── KPI row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {STATS.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* ── Marks + Attendance ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Marks table — 2/3 */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
            <h2 className="text-[14px] font-semibold text-neutral-900">My Marks</h2>
            <a href="/student/marks" className="text-[12px] text-ink-600 hover:text-ink-800 no-underline font-medium">Full report →</a>
          </div>
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
              {MY_MARKS.map((m) => (
                <tr key={m.subject} className="hover:bg-neutral-50/70 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${SUBJ_COLOR[m.subject]?.split(' ')[0] ?? 'bg-neutral-300'}`} />
                      <span className="font-medium text-neutral-900">{m.subject}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${EXAM_PILL[m.exam] ?? ''}`}>{m.exam}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col gap-1.5">
                      <span className="font-mono text-[12px] text-neutral-700">{m.score}/{m.max}</span>
                      <div className="h-1 bg-neutral-100 rounded-full overflow-hidden w-full max-w-[5rem]">
                        <div
                          className={`h-full rounded-full ${scoreColor(m.score, m.max)}`}
                          style={{ width: `${Math.round((m.score / m.max) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className={`px-4 py-3.5 font-mono text-[13px] font-bold ${gradeColor(m.grade)}`}>{m.grade}</td>
                  <td className="px-4 py-3.5 text-neutral-400 text-[12px] font-mono">{m.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Attendance this week — 1/3 */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[14px] font-semibold text-neutral-900">This Week</h2>
              <p className="text-[11px] text-neutral-400 mt-0.5 font-mono">Jun 20 – 24, 2026</p>
            </div>
            <a href="/student/attendance" className="text-[12px] text-ink-600 hover:text-ink-800 no-underline font-medium">History →</a>
          </div>

          {/* Day indicators */}
          <div className="flex items-center justify-between gap-1.5 mb-5">
            {ATTENDANCE_WEEK.map((d) => {
              const cfg = ATT_CFG[d.status]
              const Icon = cfg.icon
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[9px] font-mono text-neutral-400 leading-tight">Jun</span>
                  <span className="text-[10px] font-mono text-neutral-600 font-semibold leading-none">{d.date}</span>
                  <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${cfg.ring} ${cfg.bg}`}>
                    <Icon size={14} strokeWidth={2.5} className={cfg.text} />
                  </div>
                  <span className="text-[10px] font-medium text-neutral-500">{d.day}</span>
                </div>
              )
            })}
          </div>

          {/* Summary */}
          <div className="mt-auto pt-4 border-t border-neutral-100 space-y-2">
            {(['Present','Late','Absent'] as AttStatus[]).map((s) => {
              const cfg = ATT_CFG[s]
              const count = ATTENDANCE_WEEK.filter(d => d.status === s).length
              return (
                <div key={s} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[12px] text-neutral-600">
                    <span className={`w-2 h-2 rounded-full ${cfg.ring.replace('border-','bg-')}`} />
                    {s}
                  </span>
                  <span className="text-[12px] font-semibold text-neutral-900">{count} day{count !== 1 ? 's' : ''}</span>
                </div>
              )
            })}
          </div>

          {/* Rate pill */}
          <div className="mt-4 p-3 bg-neutral-50 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-neutral-500">Week rate</span>
              <span className={`text-[13px] font-bold font-mono ${weekRate >= 80 ? 'text-success' : 'text-warning'}`}>
                {weekRate}%
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">* Late days counted as 0.5 days present</p>
          </div>
        </div>
      </div>

      {/* ── Lectures + Study Guides ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* Lecture files */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
            <h2 className="text-[14px] font-semibold text-neutral-900">Lecture Files</h2>
            <a href="/student/lectures" className="text-[12px] text-ink-600 hover:text-ink-800 no-underline font-medium">All lectures →</a>
          </div>
          <div className="divide-y divide-neutral-100">
            {LECTURES.map((l, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 hover:bg-neutral-50/80 transition-colors">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  l.watched ? 'bg-success-bg' : l.progress > 0 ? 'bg-warning-bg' : 'bg-ink-50'
                }`}>
                  <PlayCircle size={16} className={
                    l.watched ? 'text-success' : l.progress > 0 ? 'text-warning' : 'text-ink-400'
                  } />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-[13px] font-medium text-neutral-900 truncate">{l.title}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-neutral-400">{l.subject}</span>
                    <span className="text-neutral-200">·</span>
                    <span className="text-[11px] font-mono text-neutral-400">{l.duration}</span>
                  </div>
                  {!l.watched && l.progress > 0 && (
                    <div className="mt-2 h-1 bg-neutral-100 rounded-full overflow-hidden w-full max-w-[7rem]">
                      <div className="h-full bg-warning rounded-full" style={{ width: `${l.progress}%` }} />
                    </div>
                  )}
                </div>
                <span className={`text-[11px] font-semibold shrink-0 px-2.5 py-1 rounded-lg ${
                  l.watched      ? 'bg-success-bg text-success'  :
                  l.progress > 0 ? 'bg-warning-bg text-warning'  :
                                   'bg-neutral-100 text-neutral-500'
                }`}>
                  {l.watched ? 'Watched' : l.progress > 0 ? `${l.progress}%` : 'New'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Study guides */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
            <h2 className="text-[14px] font-semibold text-neutral-900">Study Guides</h2>
            <a href="/student/guides" className="text-[12px] text-ink-600 hover:text-ink-800 no-underline font-medium">All guides →</a>
          </div>
          <div className="divide-y divide-neutral-100">
            {GUIDES.map((g, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 hover:bg-neutral-50/80 transition-colors">
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
                <button className="text-[12px] font-medium text-ink-600 hover:text-ink-800 shrink-0 px-3 py-1.5 rounded-lg hover:bg-ink-50 transition-colors">
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Assignments ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <h2 className="text-[14px] font-semibold text-neutral-900">Course Assignments</h2>
          <a href="/student/assignments" className="text-[12px] text-ink-600 hover:text-ink-800 no-underline font-medium">View all →</a>
        </div>
        <div className="divide-y divide-neutral-100">
          {ASSIGNMENTS.map((a, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-3.5 hover:bg-neutral-50/70 transition-colors">
              <div className={`w-2 h-2 rounded-full shrink-0 ${SUBJ_COLOR[a.subject]?.split(' ')[0] ?? 'bg-neutral-300'}`} />
              <div className="flex-1 min-w-0">
                <span className="block text-[13px] font-medium text-neutral-900 truncate">{a.title}</span>
                <span className="text-[11px] text-neutral-400">{a.subject}</span>
              </div>
              <span className="text-[12px] font-mono text-neutral-400 shrink-0 hidden sm:block">{a.due}</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${ASSIGN_PILL[a.status] ?? ''}`}>
                {a.status}
              </span>
              {/* Action button varies by status */}
              {a.status === 'Submitted' && <span className="w-[76px] shrink-0" />}
              {a.status === 'Pending' && (
                <button className="text-[12px] font-semibold text-white bg-ink-700 hover:bg-ink-800 px-3.5 py-1.5 rounded-xl transition-colors shrink-0">
                  Submit
                </button>
              )}
              {a.status === 'Not Started' && (
                <button className="text-[12px] font-medium text-ink-600 bg-ink-50 hover:bg-ink-100 border border-ink-100 px-3.5 py-1.5 rounded-xl transition-colors shrink-0">
                  Begin
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
