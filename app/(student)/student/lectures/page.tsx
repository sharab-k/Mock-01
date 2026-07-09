'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, PlayCircle, Pause, Play, CheckCircle2, Clock3 } from 'lucide-react'

type Lecture = {
  id: string
  subject: string
  title: string
  durationSeconds: number
  initialWatched: number
}

const LECTURES: Lecture[] = [
  { id: 'lec-1', subject: 'Mathematics', title: 'Quadratic Equations – Part 2',    durationSeconds: 38 * 60, initialWatched: 38 * 60 },
  { id: 'lec-2', subject: 'Physics',     title: 'Laws of Motion – Lecture 4',      durationSeconds: 44 * 60, initialWatched: 44 * 60 },
  { id: 'lec-3', subject: 'Chemistry',   title: 'Periodic Table & Trends',         durationSeconds: 31 * 60, initialWatched: Math.round(31 * 60 * 0.62) },
  { id: 'lec-4', subject: 'English',     title: 'Essay Structure & Techniques',    durationSeconds: 26 * 60, initialWatched: 0 },
  { id: 'lec-5', subject: 'Biology',     title: 'Cell Structure Overview',         durationSeconds: 29 * 60, initialWatched: 0 },
  { id: 'lec-6', subject: 'Mathematics', title: 'Trigonometric Identities',        durationSeconds: 35 * 60, initialWatched: Math.round(35 * 60 * 0.2) },
]

// Demo-only flag — in production this comes from `students.is_late_enrollment`.
// Strict heartbeat-gated watch-time tracking (CLAUDE.md §7) only applies when true.
const IS_LATE_ENROLLMENT_DEMO = true

const SUBJECTS = ['All Subjects', ...Array.from(new Set(LECTURES.map((l) => l.subject)))]

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function StudentLecturesPage() {
  const [subjectFilter, setSubjectFilter] = useState('All Subjects')
  const [watchedFilter, setWatchedFilter] = useState<'All' | 'Watched' | 'Unwatched'>('All')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [watchedMap, setWatchedMap] = useState<Record<string, number>>(
    () => Object.fromEntries(LECTURES.map((l) => [l.id, l.initialWatched]))
  )
  const [isPlaying, setIsPlaying] = useState(false)
  const tabFocused = useRef(true)

  const active = LECTURES.find((l) => l.id === activeId) ?? null

  // Heartbeat: while playing + tab focused, accumulate watched seconds server-side
  // would be a POST every ~10s. Demo ticks faster (every 400ms = 1 simulated second)
  // so the mechanism is visible without waiting for a real 30-minute lecture.
  useEffect(() => {
    if (!active || !isPlaying) return
    const interval = setInterval(() => {
      if (!tabFocused.current) return
      setWatchedMap((prev) => {
        const current = prev[active.id] ?? 0
        if (current >= active.durationSeconds) {
          setIsPlaying(false)
          return prev
        }
        return { ...prev, [active.id]: Math.min(current + 1, active.durationSeconds) }
      })
    }, 400)
    return () => clearInterval(interval)
  }, [active, isPlaying])

  useEffect(() => {
    const onVisibility = () => { tabFocused.current = document.visibilityState === 'visible' }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const filtered = LECTURES.filter((l) => {
    const matchesSubject = subjectFilter === 'All Subjects' || l.subject === subjectFilter
    const watched = (watchedMap[l.id] ?? 0) >= l.durationSeconds * 0.9
    const matchesWatched = watchedFilter === 'All' || (watchedFilter === 'Watched' ? watched : !watched)
    return matchesSubject && matchesWatched
  })

  if (active) {
    const watched = watchedMap[active.id] ?? 0
    const pct = Math.round((watched / active.durationSeconds) * 100)
    const completed = pct >= 90

    return (
      <>
        <button onClick={() => { setIsPlaying(false); setActiveId(null) }} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Video Lectures
        </button>

        <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
          {/* Simulated player — no real video asset in this build; heartbeat/watch-time
              mechanism below is real and ready to attach to a real <video> element. */}
          <div className="relative aspect-video bg-ink-900 flex items-center justify-center">
            <button
              onClick={() => setIsPlaying((p) => !p)}
              disabled={watched >= active.durationSeconds}
              className="w-16 h-16 rounded-full bg-white/12 hover:bg-white/20 backdrop-blur flex items-center justify-center transition-colors disabled:opacity-50"
            >
              {isPlaying ? <Pause size={26} className="text-white" /> : <Play size={26} className="text-white ml-1" />}
            </button>
            {IS_LATE_ENROLLMENT_DEMO && (
              <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-warning bg-warning-bg/90 px-2.5 py-1 rounded-full">
                <Clock3 size={11} /> Late enrollment — strict tracking
              </span>
            )}
            {completed && (
              <span className="absolute top-4 right-4 inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-success bg-success-bg/90 px-2.5 py-1 rounded-full">
                <CheckCircle2 size={11} /> Completed
              </span>
            )}
          </div>

          <div className="p-6">
            <span className="text-[10.5px] font-semibold text-ink-600 bg-ink-50 px-2 py-0.5 rounded-full">{active.subject}</span>
            <h1 className="text-[17px] font-bold text-neutral-900 mt-2 mb-4">{active.title}</h1>

            <div className="h-2 bg-neutral-100 rounded-full overflow-hidden mb-2">
              <div className={`h-full rounded-full transition-all duration-300 ${completed ? 'bg-success' : 'bg-ink-500'}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-center justify-between text-[11.5px] font-mono text-neutral-400">
              <span>{fmt(watched)} watched</span>
              <span>{pct}% · {fmt(active.durationSeconds)} total</span>
            </div>

            <p className="text-[11.5px] text-neutral-400 mt-4 leading-relaxed">
              Watch time only accumulates while this tab is focused and playing. Seeking ahead doesn&apos;t
              count the skipped span — completion requires 90% of the actual runtime watched.
            </p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div>
        <Link href="/student" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Dashboard
        </Link>
        <h1 className="text-[20px] font-bold text-neutral-900">Video Lectures</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">{LECTURES.length} lectures available this term</p>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4 flex items-center gap-3 flex-wrap">
        <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="text-[12.5px] border border-neutral-200 rounded-xl px-3 py-2.5 text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
          {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <div className="flex items-center gap-1 bg-neutral-100 rounded-xl p-1">
          {(['All', 'Watched', 'Unwatched'] as const).map((f) => (
            <button key={f} onClick={() => setWatchedFilter(f)} className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors ${watchedFilter === f ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="divide-y divide-neutral-100">
          {filtered.map((l) => {
            const watched = watchedMap[l.id] ?? 0
            const pct = Math.round((watched / l.durationSeconds) * 100)
            const completed = pct >= 90
            return (
              <button key={l.id} onClick={() => setActiveId(l.id)} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-neutral-50/80 transition-colors text-left">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${completed ? 'bg-success-bg' : pct > 0 ? 'bg-warning-bg' : 'bg-ink-50'}`}>
                  <PlayCircle size={16} className={completed ? 'text-success' : pct > 0 ? 'text-warning' : 'text-ink-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-[13px] font-medium text-neutral-900 truncate">{l.title}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-neutral-400">{l.subject}</span>
                    <span className="text-neutral-200">·</span>
                    <span className="text-[11px] font-mono text-neutral-400">{fmt(l.durationSeconds)}</span>
                  </div>
                  {!completed && pct > 0 && (
                    <div className="mt-2 h-1 bg-neutral-100 rounded-full overflow-hidden w-full max-w-[7rem]">
                      <div className="h-full bg-warning rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
                <span className={`text-[11px] font-semibold shrink-0 px-2.5 py-1 rounded-lg ${completed ? 'bg-success-bg text-success' : pct > 0 ? 'bg-warning-bg text-warning' : 'bg-neutral-100 text-neutral-500'}`}>
                  {completed ? 'Watched' : pct > 0 ? `${pct}%` : 'New'}
                </span>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <div className="px-5 py-10 text-center text-[13px] text-neutral-400">No lectures match this filter.</div>
          )}
        </div>
      </div>
    </>
  )
}
