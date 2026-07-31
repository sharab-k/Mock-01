'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, PlayCircle, Pause, Play, CheckCircle2, Clock3 } from 'lucide-react'
import type { LectureProgress } from '@/lib/student/dashboard-data'

// Real heartbeat cadence — the server is the sole source of truth for
// watched_seconds (CLAUDE.md §7: "never trust a client-submitted total").
// Every tick here is a genuine POST to /api/video/heartbeat; nothing is
// accumulated locally except by re-rendering with what the server returns.
const HEARTBEAT_INTERVAL_MS = 5000

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

type Props = {
  studentId: string
  isLateEnrollment: boolean
  initialLectures: LectureProgress[]
}

export default function StudentLecturesContent({ studentId, isLateEnrollment, initialLectures }: Props) {
  const [subjectFilter, setSubjectFilter] = useState('All Subjects')
  const [watchedFilter, setWatchedFilter] = useState<'All' | 'Watched' | 'Unwatched'>('All')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [lectures, setLectures] = useState<LectureProgress[]>(initialLectures)
  const [isPlaying, setIsPlaying] = useState(false)
  const tabFocused = useRef(true)

  const subjects = ['All Subjects', ...Array.from(new Set(initialLectures.map((l) => l.subject)))]
  const active = lectures.find((l) => l.id === activeId) ?? null

  // Only fires while playing AND the tab is foregrounded — each tick is a
  // real round-trip; the server decides how much (if any) time to credit
  // based on its own clock, not anything sent in this request.
  useEffect(() => {
    if (!active || isPlaying === false) return
    const lectureId = active.id

    const interval = setInterval(async () => {
      if (!tabFocused.current) return

      const res = await fetch('/api/video/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, lectureId }),
      })
      if (!res.ok) return
      const body = await res.json() as { watchedSeconds: number; completed: boolean; durationSeconds: number }

      setLectures((prev) => prev.map((l) => l.id === lectureId ? { ...l, watchedSeconds: body.watchedSeconds, completed: body.completed } : l))
      if (body.watchedSeconds >= body.durationSeconds) setIsPlaying(false)
    }, HEARTBEAT_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [active, isPlaying, studentId])

  useEffect(() => {
    const onVisibility = () => { tabFocused.current = document.visibilityState === 'visible' }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const filtered = lectures.filter((l) => {
    const matchesSubject = subjectFilter === 'All Subjects' || l.subject === subjectFilter
    const matchesWatched = watchedFilter === 'All' || (watchedFilter === 'Watched' ? l.completed : !l.completed)
    return matchesSubject && matchesWatched
  })

  if (active) {
    const pct = Math.round((active.watchedSeconds / active.durationSeconds) * 100)

    return (
      <>
        <button onClick={() => { setIsPlaying(false); setActiveId(null) }} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Video Lectures
        </button>

        <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
          {/* No real video asset supplied yet — heartbeat/watch-time mechanism
              below is real and server-authoritative, ready to attach to a real
              <video> element once storage_path assets exist. */}
          <div className="relative aspect-video bg-ink-900 flex items-center justify-center">
            <button
              onClick={() => setIsPlaying((p) => !p)}
              disabled={active.watchedSeconds >= active.durationSeconds}
              className="w-16 h-16 rounded-full bg-white/12 hover:bg-white/20 backdrop-blur flex items-center justify-center transition-colors disabled:opacity-50"
            >
              {isPlaying ? <Pause size={26} className="text-white" /> : <Play size={26} className="text-white ml-1" />}
            </button>
            {isLateEnrollment && (
              <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-warning bg-warning-bg/90 px-2.5 py-1 rounded-full">
                <Clock3 size={11} /> Late enrollment — strict tracking
              </span>
            )}
            {active.completed && (
              <span className="absolute top-4 right-4 inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-success bg-success-bg/90 px-2.5 py-1 rounded-full">
                <CheckCircle2 size={11} /> Completed
              </span>
            )}
          </div>

          <div className="p-6">
            <span className="text-[10.5px] font-semibold text-ink-600 bg-ink-50 px-2 py-0.5 rounded-full">{active.subject}</span>
            <h1 className="text-[17px] font-bold text-neutral-900 mt-2 mb-4">{active.title}</h1>

            <div className="h-2 bg-neutral-100 rounded-full overflow-hidden mb-2">
              <div className={`h-full rounded-full transition-all duration-300 ${active.completed ? 'bg-success' : 'bg-ink-500'}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-center justify-between text-[11.5px] font-mono text-neutral-400">
              <span>{fmt(active.watchedSeconds)} watched</span>
              <span>{pct}% · {fmt(active.durationSeconds)} total</span>
            </div>

            <p className="text-[11.5px] text-neutral-400 mt-4 leading-relaxed">
              Watch time only accumulates while this tab is focused and playing. Seeking ahead doesn&apos;t
              count the skipped span{isLateEnrollment ? ' — completion requires 90% of the actual runtime watched.' : '.'}
            </p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div>
        <Link href={`/student/${studentId}`} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Dashboard
        </Link>
        <h1 className="text-[20px] font-bold text-neutral-900">Video Lectures</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">{lectures.length} lectures available this term</p>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4 flex items-center gap-3 flex-wrap">
        <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="text-[12.5px] border border-neutral-200 rounded-xl px-3 py-2.5 text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
          {subjects.map((s) => <option key={s}>{s}</option>)}
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
            const pct = Math.round((l.watchedSeconds / l.durationSeconds) * 100)
            return (
              <button key={l.id} onClick={() => setActiveId(l.id)} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-neutral-50/80 transition-colors text-left">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${l.completed ? 'bg-success-bg' : pct > 0 ? 'bg-warning-bg' : 'bg-ink-50'}`}>
                  <PlayCircle size={16} className={l.completed ? 'text-success' : pct > 0 ? 'text-warning' : 'text-ink-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-[13px] font-medium text-neutral-900 truncate">{l.title}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-neutral-400">{l.subject}</span>
                    <span className="text-neutral-200">·</span>
                    <span className="text-[11px] font-mono text-neutral-400">{fmt(l.durationSeconds)}</span>
                  </div>
                  {!l.completed && pct > 0 && (
                    <div className="mt-2 h-1 bg-neutral-100 rounded-full overflow-hidden w-full max-w-[7rem]">
                      <div className="h-full bg-warning rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
                <span className={`text-[11px] font-semibold shrink-0 px-2.5 py-1 rounded-lg ${l.completed ? 'bg-success-bg text-success' : pct > 0 ? 'bg-warning-bg text-warning' : 'bg-neutral-100 text-neutral-500'}`}>
                  {l.completed ? 'Watched' : pct > 0 ? `${pct}%` : 'New'}
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
