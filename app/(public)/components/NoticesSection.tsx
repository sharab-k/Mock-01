'use client'

import { useState } from 'react'

type Notice = {
  day: string
  month: string
  category: string
  title: string
  desc: string
  time: string
  location: string
  fullDesc: string
}

const NOTICES: Notice[] = [
  {
    day: '12',
    month: 'Aug',
    category: 'Parent–Teacher',
    title: 'Mid-Term Parent-Teacher Meeting',
    desc: 'An opportunity for parents to meet subject teachers and discuss mid-term academic progress.',
    time: '9:00 AM – 1:00 PM',
    location: 'Main Hall',
    fullDesc: 'An opportunity for parents to meet subject teachers and discuss mid-term academic progress. Slots are allocated in 10-minute intervals by grade — parents of Grade 9–10 students are scheduled for the morning session, and Grade 11–12 in the afternoon. Report cards will be available for collection.',
  },
  {
    day: '28',
    month: 'Aug',
    category: 'Examinations',
    title: 'Half-Yearly Examination Schedule Released',
    desc: 'The full timetable for the half-yearly examinations is now available for all programmes.',
    time: 'Published 9:00 AM',
    location: 'Student & Parent Portal',
    fullDesc: 'The full timetable for the half-yearly examinations is now available for all programmes, Grades 6 through 12. Papers begin the first week of September. Students should confirm their subject combination and seating details through their portal login.',
  },
  {
    day: '05',
    month: 'Sep',
    category: 'Admissions',
    title: 'Annual Admissions Open Day',
    desc: 'Prospective families are invited to tour the campus and meet the admissions team.',
    time: '10:00 AM – 3:00 PM',
    location: 'JE Academy Campus',
    fullDesc: 'Prospective families are invited to tour the campus, meet the admissions team, and sit in on a sample class. Programme counsellors will be on hand for Primary Years through Intermediate. No prior booking required — walk-ins welcome.',
  },
]

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Parent–Teacher': { bg: 'rgba(73,95,141,0.1)', text: '#495F8D' },
  'Examinations': { bg: 'rgba(169,124,45,0.1)', text: '#A97C2D' },
  'Admissions': { bg: 'rgba(61,113,87,0.1)', text: '#3D7157' },
}

export default function NoticesSection() {
  const [active, setActive] = useState<Notice | null>(null)
  const activeColors = active ? (CATEGORY_COLORS[active.category] ?? { bg: 'rgba(73,95,141,0.1)', text: '#495F8D' }) : null

  return (
    <section className="bg-white py-20 sm:py-28" id="notices">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 rounded-md bg-ink-100 flex items-center justify-center">
                <div className="w-2 h-2 rounded-sm bg-ink-600" />
              </div>
              <span className="text-ink-600 text-[14px] font-semibold">Notices</span>
            </div>
            <h2 className="font-serif font-semibold text-[36px] sm:text-[44px] leading-[1.12] text-neutral-950">
              Latest{' '}
              <span className="text-ink-500">events</span>
              {' '}&amp; notices
            </h2>
          </div>
          <a
            href="/login"
            className="shrink-0 inline-flex items-center gap-1.5 text-[14px] text-ink-600 font-semibold no-underline hover:text-ink-800 transition-colors"
          >
            View all notices (login)
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        {/* Notice cards — EduFit event-card style, split 2-col */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {NOTICES.map((n) => {
            const colors = CATEGORY_COLORS[n.category] ?? { bg: 'rgba(73,95,141,0.1)', text: '#495F8D' }
            return (
              <button
                key={n.title}
                onClick={() => setActive(n)}
                className="group text-left rounded-2xl border border-neutral-200 bg-neutral-50 overflow-hidden hover:bg-white hover:shadow-2 hover:border-neutral-300 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400 focus-visible:ring-offset-2"
              >
                {/* Date banner */}
                <div className="px-6 pt-5 pb-4 flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0"
                    style={{ background: colors.bg }}
                  >
                    <span className="font-serif text-[22px] font-semibold leading-none" style={{ color: colors.text }}>{n.day}</span>
                    <span className="font-mono text-[9px] uppercase tracking-wider mt-0.5" style={{ color: colors.text }}>{n.month}</span>
                  </div>
                  <div>
                    <span
                      className="inline-flex text-[10.5px] px-2.5 py-0.5 rounded-full font-semibold mb-1.5"
                      style={{ background: colors.bg, color: colors.text }}
                    >
                      {n.category}
                    </span>
                    <h4 className="text-[14px] font-semibold text-neutral-950 leading-snug m-0">{n.title}</h4>
                  </div>
                </div>

                <div className="px-6 pb-5 border-t border-neutral-100">
                  <p className="text-[13px] text-neutral-600 leading-relaxed mt-3 mb-4">{n.desc}</p>
                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink-600 group-hover:text-ink-800 transition-colors">
                    View details
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Detail modal */}
      {active && activeColors && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={() => setActive(null)} />
          <div className="relative w-full sm:max-w-lg bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="px-7 pt-7 pb-5 border-b border-neutral-100 flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0" style={{ background: activeColors.bg }}>
                <span className="font-serif text-[22px] font-semibold leading-none" style={{ color: activeColors.text }}>{active.day}</span>
                <span className="font-mono text-[9px] uppercase tracking-wider mt-0.5" style={{ color: activeColors.text }}>{active.month}</span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="inline-flex text-[10.5px] px-2.5 py-0.5 rounded-full font-semibold mb-2" style={{ background: activeColors.bg, color: activeColors.text }}>
                  {active.category}
                </span>
                <h3 className="text-[18px] font-semibold text-neutral-950 leading-snug">{active.title}</h3>
              </div>
              <button onClick={() => setActive(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-7 py-6 space-y-5">
              <div className="flex items-center gap-6 text-[13px] text-neutral-600">
                <span className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400" aria-hidden="true"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  {active.time}
                </span>
                <span className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                  {active.location}
                </span>
              </div>
              <p className="text-[13.5px] text-neutral-600 leading-relaxed">{active.fullDesc}</p>
              <a href="/login" className="inline-flex items-center gap-2 text-[13px] font-semibold rounded-xl px-5 py-2.5 bg-ink-700 text-white no-underline hover:bg-ink-800 transition-colors">
                Log in for more details
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
