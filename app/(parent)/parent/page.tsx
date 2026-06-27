'use client'

import { useState } from 'react'
import StatCard from '@/components/dashboard/StatCard'
import {
  CalendarCheck, BookOpen, TrendingUp, ShieldCheck, CheckCircle2,
  Clock3, XCircle, Mail, FileDown, Loader2,
} from 'lucide-react'

// ── Data ──────────────────────────────────────────────────────────────────────
const CHILDREN = [
  { name: 'Ahmed Hassan', roll: 'JE-2026-001', grade: '10', section: 'A', initials: 'AH', grade_val: 'B+', tier: 'Merit'  },
  { name: 'Sara Hassan',  roll: 'JE-2026-088', grade: '9',  section: 'B', initials: 'SH', grade_val: 'B',  tier: 'Pass'   },
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
      { subject: 'Biology',     exam: 'Monthly', score: 78, max: 100, grade: 'B+', date: '8 Jan'  },
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
const ATT_CFG: Record<AttStatus, { icon: typeof CheckCircle2; ring: string; bg: string; text: string; dot: string }> = {
  Present: { icon: CheckCircle2, ring: 'border-success', bg: 'bg-success-bg', text: 'text-success', dot: 'bg-success' },
  Late:    { icon: Clock3,       ring: 'border-warning', bg: 'bg-warning-bg', text: 'text-warning', dot: 'bg-warning' },
  Absent:  { icon: XCircle,      ring: 'border-danger',  bg: 'bg-danger-bg',  text: 'text-danger',  dot: 'bg-danger'  },
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

// ── Component ─────────────────────────────────────────────────────────────────
export default function ParentDashboard() {
  const [activeIdx,    setActiveIdx]    = useState(0)
  const [downloading,  setDownloading]  = useState(false)
  const [downloaded,   setDownloaded]   = useState(false)

  const child  = CHILDREN[activeIdx]
  const data   = CHILD_DATA[child.roll]

  const presentCount = data.attendance.filter(d => d.status === 'Present').length
  const lateCount    = data.attendance.filter(d => d.status === 'Late').length
  const absentCount  = data.attendance.filter(d => d.status === 'Absent').length

  const handleDownloadReport = async () => {
    setDownloading(true)
    // TODO: replace with real API call to /api/reports/[studentId]
    await new Promise(r => setTimeout(r, 1800))
    setDownloading(false)
    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 3000)
  }

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[20px] font-bold text-neutral-900">Parent Dashboard</h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">Real-time academic progress for your children at JE Academy.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Download progress report */}
          <button
            onClick={handleDownloadReport}
            disabled={downloading}
            className={`flex items-center gap-2 text-[12.5px] font-medium px-3.5 py-2 rounded-xl transition-all border ${
              downloaded
                ? 'bg-success-bg text-success border-success/20 cursor-default'
                : 'bg-ink-50 text-ink-600 border-ink-100 hover:bg-ink-100'
            }`}
          >
            {downloading
              ? <><Loader2 size={13} className="animate-spin" /> Generating…</>
              : downloaded
              ? <><CheckCircle2 size={13} /> Downloaded</>
              : <><FileDown size={13} /> Progress Report</>
            }
          </button>
          <a
            href="mailto:admissions@jeacademy.edu.pk"
            className="inline-flex items-center gap-2 text-[12.5px] font-medium text-ink-600 bg-ink-50 border border-ink-100 px-3.5 py-2 rounded-xl hover:bg-ink-100 transition-colors no-underline"
          >
            <Mail size={13} /> Contact
          </a>
          <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-ink-600 bg-ink-50 border border-ink-100 px-3.5 py-2 rounded-xl">
            <ShieldCheck size={13} /> Read-Only
          </span>
        </div>
      </div>

      {/* ── Sibling switcher ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          {CHILDREN.map((c, i) => (
            <button
              key={c.roll}
              onClick={() => setActiveIdx(i)}
              className={[
                'flex items-center gap-3 flex-1 px-5 py-4 cursor-pointer transition-all border-b-2 text-left',
                i > 0 ? 'sm:border-l border-l-0 border-neutral-100' : '',
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
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="text-[11px] font-mono text-neutral-400">Gr {c.grade}-{c.section}</span>
                  <span className="text-neutral-300">·</span>
                  <span className={`text-[11px] font-semibold ${i === activeIdx ? 'text-ink-600' : 'text-neutral-400'}`}>{c.tier} · {c.grade_val}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {data.stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* ── Marks + Attendance ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Marks table — 2/3 */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 gap-3">
            <h2 className="text-[14px] font-semibold text-neutral-900">{child.name.split(' ')[0]}&apos;s Marks</h2>
            <a href="/parent/marks" className="text-[12px] text-ink-600 hover:text-ink-800 no-underline font-medium shrink-0">Full report →</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[360px]">
              <thead>
                <tr className="bg-neutral-50 text-left">
                  <th className="px-5 py-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Subject</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider hidden sm:table-cell">Exam</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Score</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.marks.map(m => (
                  <tr key={m.subject} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="block font-medium text-neutral-900">{m.subject}</span>
                      <span className={`sm:hidden text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${EXAM_PILL[m.exam] ?? ''}`}>{m.exam}</span>
                    </td>
                    <td className="px-3 py-3.5 hidden sm:table-cell">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${EXAM_PILL[m.exam] ?? ''}`}>{m.exam}</span>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex flex-col gap-1.5">
                        <span className="font-mono text-[12px] text-neutral-700">{m.score}/{m.max}</span>
                        <div className="h-1 bg-neutral-100 rounded-full overflow-hidden w-full max-w-[4rem]">
                          <div className={`h-full rounded-full ${scoreColor(m.score, m.max)}`} style={{ width: `${Math.round((m.score / m.max) * 100)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className={`px-3 py-3.5 font-mono text-[13px] font-bold ${gradeColor(m.grade)}`}>{m.grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Attendance this week — 1/3 */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[14px] font-semibold text-neutral-900">This Week</h2>
              <p className="text-[11px] text-neutral-400 mt-0.5 font-mono">Jun 20 – 24, 2026</p>
            </div>
            <a href="/parent/attendance" className="text-[12px] text-ink-600 hover:text-ink-800 no-underline font-medium">History →</a>
          </div>
          <div className="flex items-end justify-between gap-1">
            {data.attendance.map(d => {
              const cfg  = ATT_CFG[d.status]
              const Icon = cfg.icon
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[9px] font-mono text-neutral-400 leading-none">Jun</span>
                  <span className="text-[10px] font-mono text-neutral-600 font-semibold">{d.date}</span>
                  <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center ${cfg.ring} ${cfg.bg}`}>
                    <Icon size={13} strokeWidth={2.5} className={cfg.text} />
                  </div>
                  <span className="text-[10px] font-medium text-neutral-500">{d.day}</span>
                </div>
              )
            })}
          </div>
          <div className="mt-5 pt-4 border-t border-neutral-100 space-y-2">
            {(['Present', 'Late', 'Absent'] as AttStatus[]).map(s => {
              const count = s === 'Present' ? presentCount : s === 'Late' ? lateCount : absentCount
              const cfg   = ATT_CFG[s]
              return (
                <div key={s} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[12px] text-neutral-600">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />{s}
                  </span>
                  <span className="text-[12px] font-semibold text-neutral-900">{count}d</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Monthly Progress Trends ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 gap-3">
          <div>
            <h2 className="text-[14px] font-semibold text-neutral-900">Monthly Progress Trends</h2>
            <p className="text-[11.5px] text-neutral-400 mt-0.5 hidden sm:block">Attendance &amp; average score across the academic term</p>
          </div>
          {/* Download report from trends section too */}
          <button
            onClick={handleDownloadReport}
            disabled={downloading}
            className={`flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-xl transition-all ${
              downloaded ? 'text-success' : 'text-ink-600 hover:text-ink-800'
            }`}
          >
            {downloading ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />}
            <span className="hidden sm:inline">{downloaded ? 'Downloaded' : 'Download PDF'}</span>
          </button>
        </div>

        <div className="flex items-center gap-5 px-5 pt-4 pb-2 flex-wrap">
          <span className="flex items-center gap-2 text-[11.5px] text-neutral-500"><span className="w-3 h-1.5 rounded-full bg-success inline-block" /> Attendance</span>
          <span className="flex items-center gap-2 text-[11.5px] text-neutral-500"><span className="w-3 h-1.5 rounded-full bg-ink-500 inline-block" /> Avg Score</span>
          <div className="ml-auto flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
            <span>80%</span><div className="w-12 h-[1px] bg-neutral-200 mx-1" /><span>100%</span>
          </div>
        </div>

        <div className="divide-y divide-neutral-50 px-5 pb-5">
          {data.monthlyTrend.map((t, i, arr) => {
            const prev = i > 0 ? arr[i - 1] : null
            const scoreTrend = !prev ? null : t.avgScore > prev.avgScore ? '↑' : t.avgScore < prev.avgScore ? '↓' : '→'
            const trendColor = scoreTrend === '↑' ? 'text-success' : scoreTrend === '↓' ? 'text-danger' : 'text-neutral-400'
            const scaledAtt   = Math.max(0, Math.min(100, ((t.attendance - 80) / 20) * 100))
            const scaledScore = Math.max(0, Math.min(100, ((t.avgScore - 60) / 40) * 100))
            return (
              <div key={t.month} className="flex items-center gap-4 py-3.5">
                <span className="text-[12px] font-semibold text-neutral-700 w-8 shrink-0">{t.month}</span>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] text-neutral-400 w-14 shrink-0">Attendance</span>
                    <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${t.attendance >= 90 ? 'bg-success' : 'bg-warning'}`} style={{ width: `${scaledAtt}%` }} />
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-neutral-700 w-9 text-right shrink-0">{t.attendance}%</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] text-neutral-400 w-14 shrink-0">Avg Score</span>
                    <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${t.avgScore >= 80 ? 'bg-ink-500' : 'bg-warning'}`} style={{ width: `${scaledScore}%` }} />
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-neutral-700 w-9 text-right shrink-0">{t.avgScore}%</span>
                  </div>
                </div>
                <span className={`text-[13px] font-bold w-5 text-right shrink-0 ${trendColor}`}>{scoreTrend ?? ''}</span>
              </div>
            )
          })}
        </div>

        <div className="mx-5 mb-5 p-4 bg-ink-50 rounded-2xl border border-ink-100/60">
          <p className="text-[12px] text-ink-600 leading-relaxed">
            <span className="font-semibold">Access note —</span> This portal is read-only. Credentials were issued by JE Academy management.{' '}
            Contact <a href="mailto:admissions@jeacademy.edu.pk" className="font-mono hover:underline">admissions@jeacademy.edu.pk</a> for any issues.
          </p>
        </div>
      </div>
    </>
  )
}
