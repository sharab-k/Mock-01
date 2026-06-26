'use client'

import { useState } from 'react'
import StatCard from '@/components/dashboard/StatCard'
import { CalendarCheck, BookOpen, TrendingUp, ShieldCheck, CheckCircle2, Clock3, XCircle, Mail } from 'lucide-react'

// ── Data ──────────────────────────────────────────────────────────────────────
const CHILDREN = [
  { name: 'Ahmed Hassan', roll: 'JE-2026-001', programme: 'Matriculation', class: 'X-A',   initials: 'AH', grade: 'B+', tier: 'Merit' },
  { name: 'Sara Hassan',  roll: 'JE-2026-088', programme: 'Middle School', class: 'VII-B', initials: 'SH', grade: 'B',  tier: 'Pass'  },
]

type AttStatus = 'Present' | 'Late' | 'Absent'

const CHILD_DATA: Record<string, {
  stats: { label: string; value: string; icon: React.ReactNode; iconBg: string; iconColor: string; sub?: string; subUp?: boolean }[]
  marks: { subject: string; exam: string; score: number; max: number; grade: string; date: string }[]
  attendance: { day: string; date: string; status: AttStatus }[]
  monthlyTrend: { month: string; attendance: number; avgScore: number }[]
}> = {
  'JE-2026-001': {
    stats: [
      { label: 'Attendance', value: '94%',   icon: <CalendarCheck size={22} />, iconBg: 'bg-success-bg', iconColor: 'text-success', sub: '↑ 2% this month',    subUp: true  },
      { label: 'Avg Score',  value: '81%',   icon: <BookOpen size={22} />,      iconBg: 'bg-ink-100',    iconColor: 'text-ink-600', sub: 'Grade B+'                          },
      { label: 'Progress',   value: 'Merit', icon: <TrendingUp size={22} />,    iconBg: 'bg-success-bg', iconColor: 'text-success', sub: '↑ Improving trend', subUp: true  },
    ],
    marks: [
      { subject: 'Mathematics', exam: 'Monthly',     score: 87, max: 100, grade: 'A',  date: '10 Jan' },
      { subject: 'English',     exam: 'Monthly',     score: 91, max: 100, grade: 'A+', date: '10 Jan' },
      { subject: 'Physics',     exam: 'Half-Yearly', score: 74, max: 100, grade: 'B',  date: '8 Jan'  },
      { subject: 'Chemistry',   exam: 'Half-Yearly', score: 68, max: 100, grade: 'B-', date: '8 Jan'  },
    ],
    attendance: [
      { day: 'Mon', date: '20', status: 'Present' },
      { day: 'Tue', date: '21', status: 'Present' },
      { day: 'Wed', date: '22', status: 'Late'    },
      { day: 'Thu', date: '23', status: 'Present' },
      { day: 'Fri', date: '24', status: 'Present' },
    ],
    monthlyTrend: [
      { month: 'Sep', attendance: 88, avgScore: 74 },
      { month: 'Oct', attendance: 91, avgScore: 77 },
      { month: 'Nov', attendance: 89, avgScore: 79 },
      { month: 'Dec', attendance: 93, avgScore: 80 },
      { month: 'Jan', attendance: 94, avgScore: 81 },
    ],
  },
  'JE-2026-088': {
    stats: [
      { label: 'Attendance', value: '88%',    icon: <CalendarCheck size={22} />, iconBg: 'bg-warning-bg', iconColor: 'text-warning', sub: '↓ 3% this month', subUp: false },
      { label: 'Avg Score',  value: '76%',    icon: <BookOpen size={22} />,      iconBg: 'bg-ink-100',    iconColor: 'text-ink-600', sub: 'Grade B'                       },
      { label: 'Progress',   value: 'Steady', icon: <TrendingUp size={22} />,    iconBg: 'bg-ink-100',    iconColor: 'text-ink-600', sub: '→ Consistent'                  },
    ],
    marks: [
      { subject: 'Mathematics', exam: 'Monthly', score: 72, max: 100, grade: 'B',  date: '10 Jan' },
      { subject: 'English',     exam: 'Monthly', score: 81, max: 100, grade: 'A-', date: '10 Jan' },
      { subject: 'Science',     exam: 'Monthly', score: 78, max: 100, grade: 'B+', date: '8 Jan'  },
      { subject: 'Urdu',        exam: 'Monthly', score: 74, max: 100, grade: 'B',  date: '8 Jan'  },
    ],
    attendance: [
      { day: 'Mon', date: '20', status: 'Present' },
      { day: 'Tue', date: '21', status: 'Absent'  },
      { day: 'Wed', date: '22', status: 'Present' },
      { day: 'Thu', date: '23', status: 'Present' },
      { day: 'Fri', date: '24', status: 'Late'    },
    ],
    monthlyTrend: [
      { month: 'Sep', attendance: 85, avgScore: 71 },
      { month: 'Oct', attendance: 87, avgScore: 73 },
      { month: 'Nov', attendance: 86, avgScore: 74 },
      { month: 'Dec', attendance: 90, avgScore: 75 },
      { month: 'Jan', attendance: 88, avgScore: 76 },
    ],
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const ATT_CFG: Record<AttStatus, { icon: typeof CheckCircle2; ring: string; bg: string; text: string }> = {
  Present: { icon: CheckCircle2, ring: 'border-success', bg: 'bg-success-bg', text: 'text-success' },
  Late:    { icon: Clock3,       ring: 'border-warning', bg: 'bg-warning-bg', text: 'text-warning' },
  Absent:  { icon: XCircle,      ring: 'border-danger',  bg: 'bg-danger-bg',  text: 'text-danger'  },
}

const EXAM_PILL: Record<string, string> = {
  'Monthly':     'bg-ink-100 text-ink-700',
  'Half-Yearly': 'bg-warning-bg text-warning',
}

const scoreColor = (s: number, max: number) => {
  const pct = (s / max) * 100
  return pct >= 80 ? 'bg-success' : pct >= 65 ? 'bg-warning' : 'bg-danger'
}

const gradeColor = (g: string) =>
  g.startsWith('A') ? 'text-success' : g.startsWith('B') ? 'text-ink-600' : 'text-warning'

export default function ParentDashboard() {
  const [activeIdx, setActiveIdx] = useState(0)

  const activeChild = CHILDREN[activeIdx]
  const data = CHILD_DATA[activeChild.roll]

  const presentCount = data.attendance.filter(d => d.status === 'Present').length
  const lateCount    = data.attendance.filter(d => d.status === 'Late').length
  const absentCount  = data.attendance.filter(d => d.status === 'Absent').length

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[20px] font-bold text-neutral-900">Parent Dashboard</h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">Real-time view of your children&apos;s academic progress at JE Academy.</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <a
            href="mailto:admissions@jeacademy.edu.pk"
            className="inline-flex items-center gap-2 text-[12px] font-medium text-ink-600 bg-ink-50 border border-ink-100 px-3.5 py-1.5 rounded-full hover:bg-ink-100 transition-colors no-underline"
          >
            <Mail size={13} /> Contact Admissions
          </a>
          <span className="inline-flex items-center gap-2 text-[12px] font-medium text-ink-600 bg-ink-50 border border-ink-100 px-3.5 py-1.5 rounded-full">
            <ShieldCheck size={13} /> Read-Only Access
          </span>
        </div>
      </div>

      {/* ── Sibling switcher ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="flex">
          {CHILDREN.map((c, i) => (
            <button
              key={c.roll}
              onClick={() => setActiveIdx(i)}
              className={[
                'flex items-center gap-4 flex-1 px-6 py-4 cursor-pointer transition-all border-b-2 text-left',
                i > 0 ? 'border-l border-neutral-100' : '',
                i === activeIdx
                  ? 'border-b-ink-700 bg-white'
                  : 'border-b-transparent bg-neutral-50/60 hover:bg-neutral-50',
              ].join(' ')}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[13px] shrink-0 transition-colors ${
                i === activeIdx ? 'bg-ink-700 text-white' : 'bg-neutral-100 text-neutral-500'
              }`}>
                {c.initials}
              </div>
              <div className="min-w-0">
                <span className={`block text-[14px] font-semibold truncate ${i === activeIdx ? 'text-neutral-900' : 'text-neutral-500'}`}>{c.name}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] text-neutral-400">{c.programme}</span>
                  <span className="text-neutral-300">·</span>
                  <span className="text-[11px] font-mono text-neutral-400">{c.class}</span>
                  <span className="text-neutral-300">·</span>
                  {/* Tier + grade — not "Grade B+" which looks like a class year */}
                  <span className={`text-[11px] font-semibold ${i === activeIdx ? 'text-ink-600' : 'text-neutral-400'}`}>{c.tier} · {c.grade}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats for active child ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {data.stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* ── Marks + Attendance ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Marks — 2/3 */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
            <h2 className="text-[14px] font-semibold text-neutral-900">{activeChild.name.split(' ')[0]}&apos;s Marks</h2>
            <a href="/parent/marks" className="text-[12px] text-ink-600 hover:text-ink-800 no-underline font-medium">Full report →</a>
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
              {data.marks.map((m) => (
                <tr key={m.subject} className="hover:bg-neutral-50/70 transition-colors">
                  <td className="px-6 py-3.5 font-medium text-neutral-900">{m.subject}</td>
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
              <h2 className="text-[14px] font-semibold text-neutral-900">Attendance This Week</h2>
              <p className="text-[11px] text-neutral-400 mt-0.5 font-mono">Jun 20 – 24, 2026</p>
            </div>
            <a href="/parent/attendance" className="text-[12px] text-ink-600 hover:text-ink-800 no-underline font-medium">History →</a>
          </div>

          {/* Day indicators */}
          <div className="flex items-center justify-between gap-1.5 mb-5">
            {data.attendance.map((d) => {
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
            {([['Present', presentCount], ['Late', lateCount], ['Absent', absentCount]] as [AttStatus, number][]).map(([s, count]) => {
              const cfg = ATT_CFG[s]
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
        </div>
      </div>

      {/* ── Monthly Progress Trends ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div>
            <h2 className="text-[14px] font-semibold text-neutral-900">Monthly Progress Trends</h2>
            <p className="text-[11.5px] text-neutral-400 mt-0.5">Attendance and average score across the academic term</p>
          </div>
          <a href="/parent/attendance" className="text-[12px] text-ink-600 hover:text-ink-800 no-underline font-medium">Full history →</a>
        </div>

        {/* Legend + scale note */}
        <div className="flex items-center justify-between px-6 pt-4 pb-2">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-2 text-[11.5px] text-neutral-500">
              <span className="w-3 h-1.5 rounded-full bg-success inline-block" /> Attendance
            </span>
            <span className="flex items-center gap-2 text-[11.5px] text-neutral-500">
              <span className="w-3 h-1.5 rounded-full bg-ink-500 inline-block" /> Avg Score
            </span>
          </div>
          {/* Scale axis label — bars run 80–100% so differences are visible */}
          <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
            <span>80%</span>
            <div className="w-16 h-[1px] bg-neutral-200 mx-1" />
            <span>100%</span>
          </div>
        </div>

        {/* Dual-bar rows — scale: 80–100% range for meaningful visual differentiation */}
        <div className="divide-y divide-neutral-50 px-6 pb-4">
          {data.monthlyTrend.map((t, i, arr) => {
            const prev = i > 0 ? arr[i - 1] : null
            const scoreTrend = !prev ? null : t.avgScore > prev.avgScore ? '↑' : t.avgScore < prev.avgScore ? '↓' : '→'
            const trendColor = scoreTrend === '↑' ? 'text-success' : scoreTrend === '↓' ? 'text-danger' : 'text-neutral-400'

            // Scale bars from 80–100% for better visual differentiation in the real range
            const scaledAttendance = Math.max(0, Math.min(100, ((t.attendance - 80) / 20) * 100))
            const scaledScore      = Math.max(0, Math.min(100, ((t.avgScore - 60) / 40) * 100))

            return (
              <div key={t.month} className="flex items-center gap-5 py-3.5">
                <span className="text-[12px] font-semibold text-neutral-700 w-10 shrink-0">{t.month}</span>

                <div className="flex-1 space-y-2">
                  {/* Attendance */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10.5px] text-neutral-400 w-16 shrink-0">Attendance</span>
                    <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${t.attendance >= 90 ? 'bg-success' : 'bg-warning'}`}
                        style={{ width: `${scaledAttendance}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-neutral-700 w-10 text-right shrink-0">{t.attendance}%</span>
                  </div>
                  {/* Score */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10.5px] text-neutral-400 w-16 shrink-0">Avg Score</span>
                    <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${t.avgScore >= 80 ? 'bg-ink-500' : 'bg-warning'}`}
                        style={{ width: `${scaledScore}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-neutral-700 w-10 text-right shrink-0">{t.avgScore}%</span>
                  </div>
                </div>

                <span className={`text-[13px] font-bold w-5 text-right shrink-0 ${trendColor}`}>
                  {scoreTrend ?? ''}
                </span>
              </div>
            )
          })}
        </div>

        {/* Credential note */}
        <div className="mx-6 mb-6 p-4 bg-ink-50 rounded-xl border border-ink-100/60">
          <p className="text-[12px] text-ink-600 leading-relaxed">
            <span className="font-semibold">Access note —</span> This portal is read-only. Your secure credentials were issued directly by JE Academy management.
            {' '}Contact <a href="mailto:admissions@jeacademy.edu.pk" className="font-mono hover:underline">admissions@jeacademy.edu.pk</a> for credential issues.
          </p>
        </div>
      </div>
    </>
  )
}
