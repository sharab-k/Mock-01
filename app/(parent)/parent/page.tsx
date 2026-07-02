'use client'

import { useState } from 'react'
import {
  CalendarCheck, BookOpen, Bell, ChevronRight, ArrowLeft,
  CheckCircle2, Clock3, XCircle, ShieldCheck, Mail, FileDown,
  Loader2,
} from 'lucide-react'

// ── Data ──────────────────────────────────────────────────────────────────────
const CHILDREN = [
  { name: 'Ahmed Hassan', roll: 'JE-2026-001', grade: '10', section: 'A', initials: 'AH', gradeVal: 'B+', tier: 'Merit' },
  { name: 'Sara Hassan',  roll: 'JE-2026-088', grade: '9',  section: 'B', initials: 'SH', gradeVal: 'B',  tier: 'Pass'  },
]

const NOTICES = [
  { id: 1, title: 'PTM Scheduled – Grade 10',     type: 'Event',    date: '28 Jun 2026', body: 'Parent-Teacher Meeting for Grade 10 is on Saturday 28 June at 9:00 AM in the main hall.' },
  { id: 2, title: 'Eid Ul-Adha Holiday',           type: 'Holiday',  date: '25 Jun 2026', body: 'School will remain closed 25–27 June 2026 for Eid Ul-Adha. Regular schedule resumes 28 June.' },
  { id: 3, title: 'Half-Yearly Results Released',  type: 'Academic', date: '20 Jun 2026', body: 'Half-Yearly examination results are published. Download the progress report from this portal.' },
  { id: 4, title: 'Science Fair – Registration',   type: 'Event',    date: '15 Jun 2026', body: 'Annual Science Fair registrations are open. Students may register at the academic office by 10 July.' },
]

type AttStatus = 'Present' | 'Late' | 'Absent'
type View = null | 'attendance' | 'marks' | 'notices'

const CHILD_DATA: Record<string, {
  attendancePct: number
  avgScore: number
  marks: { subject: string; exam: string; score: number; max: number; grade: string }[]
  attendance: { day: string; date: string; status: AttStatus }[]
  monthlyTrend: { month: string; attendance: number; avgScore: number }[]
}> = {
  'JE-2026-001': {
    attendancePct: 94,
    avgScore: 81,
    marks: [
      { subject: 'Mathematics', exam: 'Monthly',     score: 87, max: 100, grade: 'A'  },
      { subject: 'English',     exam: 'Monthly',     score: 91, max: 100, grade: 'A+' },
      { subject: 'Physics',     exam: 'Half-Yearly', score: 74, max: 100, grade: 'B'  },
      { subject: 'Chemistry',   exam: 'Half-Yearly', score: 68, max: 100, grade: 'B-' },
    ],
    attendance: [
      { day: 'Mon', date: '20 Jun', status: 'Present' },
      { day: 'Tue', date: '21 Jun', status: 'Present' },
      { day: 'Wed', date: '22 Jun', status: 'Late'    },
      { day: 'Thu', date: '23 Jun', status: 'Present' },
      { day: 'Fri', date: '24 Jun', status: 'Present' },
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
    attendancePct: 88,
    avgScore: 76,
    marks: [
      { subject: 'Mathematics', exam: 'Monthly', score: 72, max: 100, grade: 'B'  },
      { subject: 'English',     exam: 'Monthly', score: 81, max: 100, grade: 'A-' },
      { subject: 'Biology',     exam: 'Monthly', score: 78, max: 100, grade: 'B+' },
      { subject: 'Urdu',        exam: 'Monthly', score: 74, max: 100, grade: 'B'  },
    ],
    attendance: [
      { day: 'Mon', date: '20 Jun', status: 'Present' },
      { day: 'Tue', date: '21 Jun', status: 'Absent'  },
      { day: 'Wed', date: '22 Jun', status: 'Present' },
      { day: 'Thu', date: '23 Jun', status: 'Present' },
      { day: 'Fri', date: '24 Jun', status: 'Late'    },
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

const NOTICE_TYPE_STYLE: Record<string, string> = {
  Event:    'bg-ink-100 text-ink-700',
  Holiday:  'bg-warning-bg text-warning',
  Academic: 'bg-success-bg text-success',
}

const scoreBar = (s: number, m: number) => {
  const p = (s / m) * 100
  return p >= 80 ? 'bg-success' : p >= 65 ? 'bg-warning' : 'bg-danger'
}

const gradeColor = (g: string) =>
  g.startsWith('A') ? 'text-success' : g.startsWith('B') ? 'text-ink-700' : 'text-warning'

// ── Component ─────────────────────────────────────────────────────────────────
export default function ParentDashboard() {
  const [activeIdx,       setActiveIdx]       = useState(0)
  const [activeView,      setActiveView]      = useState<View>(null)
  const [expandedNotice,  setExpandedNotice]  = useState<number | null>(null)
  const [downloading,     setDownloading]     = useState(false)
  const [downloaded,      setDownloaded]      = useState(false)

  const child = CHILDREN[activeIdx]
  const data  = CHILD_DATA[child.roll]

  const presentCount = data.attendance.filter(d => d.status === 'Present').length
  const lateCount    = data.attendance.filter(d => d.status === 'Late').length
  const absentCount  = data.attendance.filter(d => d.status === 'Absent').length

  const attColor = data.attendancePct >= 90 ? 'text-success' : data.attendancePct >= 75 ? 'text-warning' : 'text-danger'

  const handleChildSwitch = (i: number) => {
    setActiveIdx(i)
    setActiveView(null)
    setExpandedNotice(null)
  }

  const handleDownload = async () => {
    setDownloading(true)
    await new Promise(r => setTimeout(r, 1800))
    setDownloading(false)
    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 3000)
  }

  return (
    <>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[20px] font-bold text-neutral-900">Parent Portal</h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">Academic progress for your children at JE Academy</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownload}
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
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-neutral-500 bg-neutral-50 border border-neutral-200 px-3 py-2 rounded-xl">
            <ShieldCheck size={12} /> Read-Only
          </span>
        </div>
      </div>

      {/* ── Sibling switcher — always visible ────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          {CHILDREN.map((c, i) => (
            <button
              key={c.roll}
              onClick={() => handleChildSwitch(i)}
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
                <span className={`block text-[14px] font-semibold truncate ${i === activeIdx ? 'text-neutral-900' : 'text-neutral-500'}`}>
                  {c.name}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] font-mono text-neutral-400">Gr {c.grade}-{c.section}</span>
                  <span className="text-neutral-300">·</span>
                  <span className={`text-[11px] font-semibold ${i === activeIdx ? 'text-ink-600' : 'text-neutral-400'}`}>{c.tier} · {c.gradeVal}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Overview: 3 KPI cards ─────────────────────────────────────────── */}
      {activeView === null && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

          {/* Attendance */}
          <button
            onClick={() => setActiveView('attendance')}
            className="group text-left bg-white rounded-2xl border border-neutral-200 shadow-1 p-6 cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-success/30 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400 focus-visible:ring-offset-2"
          >
            <div className="flex items-start justify-between mb-5">
              <div className="w-10 h-10 rounded-xl bg-success-bg flex items-center justify-center">
                <CalendarCheck size={18} className="text-success" />
              </div>
              <ChevronRight size={15} className="text-neutral-300 group-hover:text-success transition-colors mt-1" />
            </div>
            <p className="text-[10.5px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Attendance</p>
            <p className={`text-[38px] font-bold font-mono leading-none mb-3 tabular-nums ${attColor}`}>
              {data.attendancePct}%
            </p>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-success bg-success-bg px-2.5 py-1 rounded-full mb-4">
              {presentCount} of {data.attendance.length} days this week
            </span>
            {/* Mini week dots */}
            <div className="flex items-center gap-2.5 mt-1">
              {data.attendance.map(d => {
                const cfg = ATT_CFG[d.status]
                return (
                  <div key={d.day} className="flex flex-col items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className="text-[9px] text-neutral-400 font-mono">{d.day[0]}</span>
                  </div>
                )
              })}
            </div>
          </button>

          {/* Marks */}
          <button
            onClick={() => setActiveView('marks')}
            className="group text-left bg-white rounded-2xl border border-neutral-200 shadow-1 p-6 cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-ink-300 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400 focus-visible:ring-offset-2"
          >
            <div className="flex items-start justify-between mb-5">
              <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center">
                <BookOpen size={18} className="text-ink-600" />
              </div>
              <ChevronRight size={15} className="text-neutral-300 group-hover:text-ink-500 transition-colors mt-1" />
            </div>
            <p className="text-[10.5px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Marks</p>
            <p className="text-[38px] font-bold text-neutral-900 font-mono leading-none mb-3 tabular-nums">
              {data.avgScore}%
            </p>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-600 bg-ink-50 px-2.5 py-1 rounded-full mb-4">
              {child.gradeVal} · {child.tier}
            </span>
            {/* Mini score bars */}
            <div className="space-y-2 mt-1">
              {data.marks.slice(0, 2).map(m => (
                <div key={m.subject} className="flex items-center gap-2.5">
                  <span className="text-[9.5px] font-mono text-neutral-400 w-7 shrink-0">{m.subject.slice(0, 3)}</span>
                  <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${scoreBar(m.score, m.max)}`} style={{ width: `${m.score}%` }} />
                  </div>
                  <span className="text-[9.5px] font-mono text-neutral-400 w-6 text-right shrink-0">{m.score}</span>
                </div>
              ))}
            </div>
          </button>

          {/* Notices */}
          <button
            onClick={() => setActiveView('notices')}
            className="group text-left bg-white rounded-2xl border border-neutral-200 shadow-1 p-6 cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-warning/30 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400 focus-visible:ring-offset-2"
          >
            <div className="flex items-start justify-between mb-5">
              <div className="w-10 h-10 rounded-xl bg-warning-bg flex items-center justify-center">
                <Bell size={18} className="text-warning" />
              </div>
              <ChevronRight size={15} className="text-neutral-300 group-hover:text-warning transition-colors mt-1" />
            </div>
            <p className="text-[10.5px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Notices</p>
            <p className="text-[38px] font-bold text-neutral-900 font-mono leading-none mb-3 tabular-nums">
              {NOTICES.length}
            </p>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-warning bg-warning-bg px-2.5 py-1 rounded-full mb-4">
              2 events upcoming
            </span>
            {/* Latest notices */}
            <div className="space-y-2 mt-1">
              {NOTICES.slice(0, 2).map(n => (
                <div key={n.id} className="flex items-start gap-2">
                  <span className={`mt-0.5 shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded ${NOTICE_TYPE_STYLE[n.type]}`}>
                    {n.type[0]}
                  </span>
                  <span className="text-[11px] text-neutral-600 leading-tight truncate">{n.title}</span>
                </div>
              ))}
            </div>
          </button>
        </div>
      )}

      {/* ── Detail views ─────────────────────────────────────────────────── */}
      {activeView !== null && (
        <div className="space-y-5">

          {/* Breadcrumb / back */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => { setActiveView(null); setExpandedNotice(null) }}
              className="flex items-center gap-1.5 text-[13px] font-medium text-ink-600 hover:text-ink-800 transition-colors"
            >
              <ArrowLeft size={14} /> Overview
            </button>
            <span className="text-neutral-300 text-[13px]">/</span>
            <span className="text-[13px] font-semibold text-neutral-900">
              {activeView === 'attendance' ? 'Attendance' : activeView === 'marks' ? 'Marks' : 'Notices & Events'}
            </span>
            {activeView !== 'notices' && (
              <>
                <span className="text-neutral-300 text-[13px]">/</span>
                <span className="text-[12px] font-mono text-neutral-400">{child.name}</span>
              </>
            )}
          </div>

          {/* ── Attendance detail ─────────────────────────────────────────── */}
          {activeView === 'attendance' && (
            <>
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-[14px] font-semibold text-neutral-900">This Week</h2>
                    <p className="text-[11.5px] text-neutral-400 mt-0.5 font-mono">Jun 20–24, 2026</p>
                  </div>
                  <span className={`text-[26px] font-bold font-mono tabular-nums ${attColor}`}>{data.attendancePct}%</span>
                </div>

                {/* Day circles */}
                <div className="flex items-center justify-between gap-2 sm:gap-4">
                  {data.attendance.map(d => {
                    const cfg  = ATT_CFG[d.status]
                    const Icon = cfg.icon
                    return (
                      <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                        <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center ${cfg.ring} ${cfg.bg}`}>
                          <Icon size={15} strokeWidth={2.5} className={cfg.text} />
                        </div>
                        <div className="text-center">
                          <span className="block text-[11px] font-semibold text-neutral-700">{d.day}</span>
                          <span className="block text-[10px] font-mono text-neutral-400">{d.date.split(' ')[0]}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Summary tiles */}
                <div className="mt-6 pt-5 border-t border-neutral-100 grid grid-cols-3 gap-3">
                  {(['Present', 'Late', 'Absent'] as AttStatus[]).map(s => {
                    const count = s === 'Present' ? presentCount : s === 'Late' ? lateCount : absentCount
                    const cfg   = ATT_CFG[s]
                    return (
                      <div key={s} className={`rounded-xl px-3 py-3 text-center ${cfg.bg}`}>
                        <p className={`text-[22px] font-bold font-mono tabular-nums ${cfg.text}`}>{count}</p>
                        <p className={`text-[11px] font-medium mt-0.5 ${cfg.text} opacity-80`}>{s}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Monthly attendance trend */}
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-6">
                <h2 className="text-[14px] font-semibold text-neutral-900 mb-5">Monthly Attendance</h2>
                <div className="space-y-3">
                  {data.monthlyTrend.map(t => {
                    const barColor = t.attendance >= 90 ? 'bg-success' : t.attendance >= 80 ? 'bg-warning' : 'bg-danger'
                    const txtColor = t.attendance >= 90 ? 'text-success' : t.attendance >= 80 ? 'text-warning' : 'text-danger'
                    return (
                      <div key={t.month} className="flex items-center gap-4">
                        <span className="text-[12px] font-semibold text-neutral-600 w-8 shrink-0">{t.month}</span>
                        <div className="flex-1 h-7 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${barColor} rounded-full flex items-center justify-end pr-2.5`}
                            style={{ width: `${t.attendance}%` }}
                          >
                            <span className="text-[9px] font-bold text-white font-mono">{t.attendance}%</span>
                          </div>
                        </div>
                        <span className={`text-[12px] font-bold font-mono w-9 text-right shrink-0 tabular-nums ${txtColor}`}>{t.attendance}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── Marks detail ──────────────────────────────────────────────── */}
          {activeView === 'marks' && (
            <>
              {/* 3 mini stat tiles */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Average',  value: `${data.avgScore}%` },
                  { label: 'Grade',    value: child.gradeVal       },
                  { label: 'Tier',     value: child.tier           },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-5 text-center">
                    <p className="text-[10.5px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">{s.label}</p>
                    <p className="text-[26px] font-bold text-neutral-900 font-mono leading-none">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Subject results */}
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
                <div className="px-5 py-4 border-b border-neutral-100">
                  <h2 className="text-[14px] font-semibold text-neutral-900">Subject Results</h2>
                </div>
                <div className="divide-y divide-neutral-100">
                  {data.marks.map(m => {
                    const pct = Math.round((m.score / m.max) * 100)
                    return (
                      <div key={m.subject} className="flex items-center gap-4 px-5 py-4">
                        <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
                          <span className="text-[9.5px] font-bold text-neutral-500 font-mono">{m.subject.slice(0, 3).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="block text-[13px] font-semibold text-neutral-900">{m.subject}</span>
                          <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            m.exam === 'Monthly' ? 'bg-ink-100 text-ink-700' : 'bg-warning-bg text-warning'
                          }`}>{m.exam}</span>
                        </div>
                        <div className="flex items-center gap-2.5 w-36 shrink-0">
                          <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${scoreBar(m.score, m.max)}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[11px] font-mono text-neutral-600 shrink-0">{m.score}/{m.max}</span>
                        </div>
                        <span className={`text-[15px] font-bold font-mono w-8 text-right shrink-0 ${gradeColor(m.grade)}`}>{m.grade}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Score trend */}
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-6">
                <h2 className="text-[14px] font-semibold text-neutral-900 mb-5">Score Trend</h2>
                <div className="space-y-3">
                  {data.monthlyTrend.map(t => {
                    const barW     = Math.max(0, Math.min(100, ((t.avgScore - 60) / 40) * 100))
                    const barColor = t.avgScore >= 80 ? 'bg-ink-600' : t.avgScore >= 70 ? 'bg-warning' : 'bg-danger'
                    return (
                      <div key={t.month} className="flex items-center gap-4">
                        <span className="text-[12px] font-semibold text-neutral-600 w-8 shrink-0">{t.month}</span>
                        <div className="flex-1 h-7 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${barColor} rounded-full flex items-center justify-end pr-2.5`}
                            style={{ width: `${barW}%` }}
                          >
                            <span className="text-[9px] font-bold text-white font-mono">{t.avgScore}%</span>
                          </div>
                        </div>
                        <span className="text-[12px] font-bold font-mono text-ink-700 w-9 text-right shrink-0 tabular-nums">{t.avgScore}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── Notices detail ────────────────────────────────────────────── */}
          {activeView === 'notices' && (
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                <div>
                  <h2 className="text-[14px] font-semibold text-neutral-900">Notices &amp; Events</h2>
                  <p className="text-[11.5px] text-neutral-400 mt-0.5">{NOTICES.length} notices this term</p>
                </div>
              </div>
              <div className="divide-y divide-neutral-100">
                {NOTICES.map(n => (
                  <div key={n.id}>
                    <button
                      className="w-full flex items-start gap-3 px-5 py-4 hover:bg-neutral-50 transition-colors text-left"
                      onClick={() => setExpandedNotice(expandedNotice === n.id ? null : n.id)}
                    >
                      <span className={`mt-0.5 shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${NOTICE_TYPE_STYLE[n.type]}`}>
                        {n.type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="block text-[13px] font-semibold text-neutral-900">{n.title}</span>
                        <span className="block text-[11px] font-mono text-neutral-400 mt-0.5">{n.date}</span>
                      </div>
                      <ChevronRight
                        size={14}
                        className={`text-neutral-300 shrink-0 mt-1 transition-transform duration-200 ${expandedNotice === n.id ? 'rotate-90' : ''}`}
                      />
                    </button>
                    {expandedNotice === n.id && (
                      <div className="px-5 pb-4 pt-2 bg-neutral-50 border-t border-neutral-100">
                        <p className="text-[13px] text-neutral-600 leading-relaxed">{n.body}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Access note */}
          <div className="p-4 bg-ink-50 rounded-2xl border border-ink-100/60">
            <p className="text-[12px] text-ink-600 leading-relaxed">
              <span className="font-semibold">Read-only access —</span>{' '}
              Contact{' '}
              <a href="mailto:admissions@jeacademy.edu.pk" className="font-mono hover:underline">
                admissions@jeacademy.edu.pk
              </a>{' '}
              for any queries or updates.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
