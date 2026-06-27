'use client'

import { useState } from 'react'
import Link from 'next/link'
import StatCard from '@/components/dashboard/StatCard'
import {
  Users, UserPlus, Inbox, KeyRound, Copy, Check,
  ChevronDown, ChevronUp, ArrowUpCircle, X, ChevronRight, AlertTriangle,
} from 'lucide-react'

// ── Data ──────────────────────────────────────────────────────────────────────
const PIPELINE_BASE = [
  { name: 'Zara Hussain',  roll: 'JE-2026-047', grade: '9',  section: 'B', credentialSent: true,  date: '24 Jun 2026' },
  { name: 'Ahmed Ali',     roll: 'JE-2026-001', grade: '10', section: 'A', credentialSent: true,  date: '15 Jan 2026' },
  { name: 'Sara Khan',     roll: 'JE-2026-002', grade: '9',  section: 'A', credentialSent: true,  date: '14 Jan 2026' },
  { name: 'Bilal Raza',    roll: 'JE-2026-003', grade: '12', section: 'A', credentialSent: true,  date: '12 Jan 2026' },
  { name: 'Fatima Noor',   roll: 'JE-2026-004', grade: '11', section: 'B', credentialSent: true,  date: '10 Jan 2026' },
  { name: 'Usman Sheikh',  roll: 'JE-2026-005', grade: '10', section: 'B', credentialSent: false, date: '8 Jan 2026'  },
  { name: 'Hina Baig',     roll: 'JE-2026-018', grade: '9',  section: 'C', credentialSent: true,  date: '6 Jan 2026'  },
  { name: 'Kamran Malik',  roll: 'JE-2026-031', grade: '12', section: 'B', credentialSent: true,  date: '4 Jan 2026'  },
  { name: 'Dawood Ilyas',  roll: 'JE-2026-057', grade: '11', section: 'A', credentialSent: true,  date: '2 Jan 2026'  },
]

const ENQUIRIES = [
  { parent: 'Rashid Iqbal',   phone: '+92 300 1234567', grade: '9',  msg: 'Looking to enroll my son in Grade 9 Sciences. He passed his 8th grade with distinction.', date: '24 Jun', status: 'Unread'         },
  { parent: 'Aisha Siddiqui', phone: '+92 321 7654321', grade: '10', msg: 'My son is transferring from DPS. He completed Grade 9 and will be joining Grade 10.',         date: '23 Jun', status: 'Contacted'       },
  { parent: 'Tariq Mehmood',  phone: '+92 333 1112223', grade: '11', msg: 'Enquiring about F.Sc sciences for Grade 11. Does the academy offer Phy, Chem, Bio together?', date: '22 Jun', status: 'Unread'         },
  { parent: 'Maria Ahmed',    phone: '+92 311 9998887', grade: '12', msg: 'Would like to visit campus for Grade 12 admission. Please advise on available timings.',      date: '21 Jun', status: 'Awaiting Visit' },
  { parent: 'Khalid Farooq',  phone: '+92 345 6667778', grade: '9',  msg: 'We have two children looking to join Grade 9 and Grade 10. Enquiring about sibling policy.',  date: '20 Jun', status: 'Contacted'      },
]

// Total enrolled students per class-section (TODO: replace with Supabase query)
const CLASS_GRID: Record<string, Record<string, number>> = {
  '9':  { A: 30, B: 28, C: 32, D: 26 },
  '10': { A: 31, B: 27, C: 29, D: 33 },
  '11': { A: 28, B: 30, C: 26, D: 29 },
  '12': { A: 24, B: 27, C: 25, D: 23 },
}
const TOTAL_ENROLLED = Object.values(CLASS_GRID).reduce((a, g) => a + Object.values(g).reduce((b, n) => b + n, 0), 0)

const INITIALS = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

const STATUS_STYLE: Record<string, string> = {
  Unread:          'bg-ink-100 text-ink-700',
  Contacted:       'bg-success-bg text-success',
  'Awaiting Visit':'bg-warning-bg text-warning',
}

// ── Aggregate stats (full dataset) ───────────────────────────────────────────
const newReg    = PIPELINE_BASE.filter(s => s.date.includes('24 Jun') || s.date.includes('23 Jun')).length
const pendingEnq = ENQUIRIES.filter(e => e.status === 'Unread' || e.status === 'Awaiting Visit').length
const parentIds  = PIPELINE_BASE.filter(s => s.credentialSent).length

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdmissionsDashboard() {
  const [copiedPhone,  setCopiedPhone]  = useState<string | null>(null)
  const [expandedEnq,  setExpandedEnq]  = useState<number | null>(null)
  const [showPromote,  setShowPromote]  = useState(false)
  const [promoteFrom,  setPromoteFrom]  = useState('9')
  const [promoted,     setPromoted]     = useState(false)

  const copyPhone = async (phone: string) => {
    try { await navigator.clipboard.writeText(phone); setCopiedPhone(phone); setTimeout(() => setCopiedPhone(null), 1500) } catch { /* blocked */ }
  }

  const handlePromote = () => {
    setPromoted(true)
    setTimeout(() => { setPromoted(false); setShowPromote(false) }, 1800)
  }

  const promoteTo    = promoteFrom === '9' ? '10' : promoteFrom === '10' ? '11' : promoteFrom === '11' ? '12' : 'Graduated'
  const promoteCount = PIPELINE_BASE.filter(s => s.grade === promoteFrom).length

  const STATS = [
    { label: 'Students Enrolled', value: String(TOTAL_ENROLLED), icon: <Users size={22} />,    iconBg: 'bg-ink-100',    iconColor: 'text-ink-600', sub: 'Across grades 9–12'              },
    { label: 'New Registrations', value: String(newReg),         icon: <UserPlus size={22} />, iconBg: 'bg-success-bg', iconColor: 'text-success', sub: 'This week', subUp: newReg > 0     },
    { label: 'Pending Enquiries', value: String(pendingEnq),     icon: <Inbox size={22} />,    iconBg: 'bg-danger-bg',  iconColor: 'text-danger',  sub: 'Need follow-up'                   },
    { label: 'Parent IDs Issued', value: String(parentIds),      icon: <KeyRound size={22} />, iconBg: 'bg-warning-bg', iconColor: 'text-warning', sub: 'Auto-dispatched on enrolment'     },
  ]

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[20px] font-bold text-neutral-900">Admissions Pipeline</h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">Select a class to view and manage its student registration pipeline.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowPromote(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-neutral-200 text-neutral-700 text-[13px] font-medium rounded-xl hover:bg-neutral-50 transition-colors"
          >
            <ArrowUpCircle size={14} className="text-ink-600" /> Transfer / Promote
          </button>
          <a href="/admissions/students/new" className="flex items-center gap-2 px-3.5 py-2 bg-ink-700 text-white text-[13px] font-semibold rounded-xl hover:bg-ink-800 transition-colors no-underline">
            <UserPlus size={14} /> Enrol Student
          </a>
        </div>
      </div>

      {/* ── KPI cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* ── Class / Section enrolment grid ──────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 gap-3">
          <div>
            <h2 className="text-[14px] font-semibold text-neutral-900">Enrolment by Class</h2>
            <p className="text-[11.5px] text-neutral-400 mt-0.5 hidden sm:block">Click a class to open its full registration pipeline</p>
          </div>
          <span className="text-[12px] font-mono text-neutral-400 shrink-0">{TOTAL_ENROLLED} total</span>
        </div>

        <div className="p-5 space-y-5">
          {(['9', '10', '11', '12'] as const).map(grade => (
            <div key={grade}>
              {/* Grade row label */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Grade {grade}</span>
                <div className="flex-1 h-px bg-neutral-100" />
                <span className="text-[10px] font-mono text-neutral-400">
                  {Object.values(CLASS_GRID[grade]).reduce((a, n) => a + n, 0)} students
                </span>
              </div>

              {/* 4 section cards — each is a Link to the detail page */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(['A', 'B', 'C', 'D'] as const).map(section => {
                  const count = CLASS_GRID[grade][section]
                  return (
                    <Link
                      key={section}
                      href={`/admissions/${grade}/${section}`}
                      className="group relative flex flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white no-underline py-7 px-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-ink-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400 focus-visible:ring-offset-2"
                      aria-label={`Grade ${grade} Section ${section} — ${count} students`}
                    >
                      {/* Class label */}
                      <span className="font-mono leading-none select-none">
                        <span className="text-[28px] font-bold text-ink-700">{grade}</span>
                        <span className="text-[22px] font-semibold text-ink-400">{section}</span>
                      </span>

                      {/* Student count */}
                      <span className="text-[11.5px] font-medium mt-2 text-neutral-400 tabular-nums group-hover:text-neutral-600 transition-colors">
                        {count} students
                      </span>

                      {/* Arrow — appears on hover */}
                      <span className="absolute top-3 right-3.5 text-[11px] text-neutral-200 group-hover:text-ink-400 transition-colors font-medium">→</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Enquiries ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 gap-3">
          <div>
            <h2 className="text-[14px] font-semibold text-neutral-900">Incoming Enquiries</h2>
            <p className="text-[11.5px] text-neutral-400 mt-0.5 hidden sm:block">Click any row to expand · copy phone numbers instantly</p>
          </div>
          <a href="/admissions/enquiries" className="text-[12px] text-ink-600 hover:text-ink-800 no-underline font-medium shrink-0">View all →</a>
        </div>
        <div className="divide-y divide-neutral-100">
          {ENQUIRIES.map((e, i) => (
            <div key={i}>
              <div className="flex items-start gap-3 px-5 py-4 hover:bg-neutral-50 transition-colors cursor-pointer select-none" onClick={() => setExpandedEnq(expandedEnq === i ? null : i)}>
                <div className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">
                  {INITIALS(e.parent)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-neutral-900 text-[13px]">{e.parent}</span>
                    <span className="text-[11px] font-mono bg-ink-50 text-ink-700 px-1.5 py-0.5 rounded-md font-semibold">Gr {e.grade}</span>
                    <span className="text-[11px] text-neutral-400">{e.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] font-mono text-neutral-500">{e.phone}</span>
                    <button onClick={ev => { ev.stopPropagation(); copyPhone(e.phone) }} className="text-neutral-300 hover:text-ink-600 transition-colors p-0.5 rounded" title="Copy phone">
                      {copiedPhone === e.phone ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                    </button>
                  </div>
                  <p className={`text-[12px] text-neutral-500 mt-1.5 leading-relaxed ${expandedEnq === i ? '' : 'truncate'}`}>{e.msg}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 mt-0.5">
                  <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLE[e.status] ?? 'bg-neutral-100 text-neutral-500'}`}>{e.status}</span>
                  {expandedEnq === i ? <ChevronUp size={14} className="text-neutral-400" /> : <ChevronDown size={14} className="text-neutral-400" />}
                </div>
              </div>
              {expandedEnq === i && (
                <div className="px-5 pb-4 pt-2 bg-neutral-50 border-t border-neutral-100">
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <a href={`tel:${e.phone}`} onClick={ev => ev.stopPropagation()} className="flex items-center gap-1.5 text-[12px] font-medium text-ink-600 hover:text-ink-800 bg-white border border-neutral-200 px-3 py-2 rounded-xl transition-colors no-underline">
                      Call {e.parent.split(' ')[0]}
                    </a>
                    <a href="/admissions/students/new" onClick={ev => ev.stopPropagation()} className="flex items-center gap-1.5 text-[12px] font-semibold text-white bg-ink-700 hover:bg-ink-800 px-3 py-2 rounded-xl transition-colors no-underline">
                      <UserPlus size={12} /> Enrol Student
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Promote / Transfer Modal ─────────────────────────────────────── */}
      {showPromote && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={() => !promoted && setShowPromote(false)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-ink-100 flex items-center justify-center">
                  <ArrowUpCircle size={18} className="text-ink-600" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-neutral-900">Transfer / Promote</h3>
                  <p className="text-[11.5px] text-neutral-400 mt-0.5">Move students to next grade</p>
                </div>
              </div>
              <button onClick={() => setShowPromote(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div>
                <label className="block text-[12px] font-semibold text-neutral-700 mb-2">Promote students from</label>
                <select value={promoteFrom} onChange={e => setPromoteFrom(e.target.value)} className="w-full text-[13px] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-ink-200 cursor-pointer">
                  {['9', '10', '11', '12'].map(g => <option key={g} value={g}>Grade {g}</option>)}
                </select>
              </div>
              <div className="bg-ink-50 border border-ink-100 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1">
                    <p className="text-[11px] text-neutral-400 mb-1">From</p>
                    <p className="text-[14px] font-bold text-neutral-900">Grade {promoteFrom}</p>
                  </div>
                  <ChevronRight size={20} className="text-ink-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[11px] text-neutral-400 mb-1">To</p>
                    <p className="text-[14px] font-bold text-neutral-900">{promoteTo === 'Graduated' ? 'Graduated' : `Grade ${promoteTo}`}</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-ink-100">
                  <p className="text-[11px] text-neutral-400">Students eligible</p>
                  <p className="text-[22px] font-bold text-ink-700">{promoteCount}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 bg-warning-bg border border-warning/20 rounded-xl p-3.5">
                <AlertTriangle size={14} className="text-warning mt-0.5 shrink-0" />
                <p className="text-[11.5px] text-warning leading-relaxed">This promotes all students in Grade {promoteFrom}. For individual transfers, use the student profile edit.</p>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button onClick={() => setShowPromote(false)} className="flex-1 py-3 text-[13px] font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors">Cancel</button>
                <button onClick={handlePromote} disabled={promoted} className={`flex-1 py-3 text-[13px] font-semibold rounded-xl transition-all ${promoted ? 'bg-success text-white cursor-default' : 'bg-ink-700 text-white hover:bg-ink-800'}`}>
                  {promoted ? '✓ Promoted' : `Promote ${promoteCount} Students`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
