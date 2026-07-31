'use client'

import { useState } from 'react'
import type { Notice, NoticeCategory } from '@/lib/notices/types'

const CATEGORY_COLORS: Record<NoticeCategory, { bg: string; text: string }> = {
  Academic: { bg: 'rgba(61,113,87,0.1)', text: '#3D7157' },
  Event: { bg: 'rgba(73,95,141,0.1)', text: '#495F8D' },
  Holiday: { bg: 'rgba(169,124,45,0.1)', text: '#A97C2D' },
  Admissions: { bg: 'rgba(151,63,53,0.1)', text: '#973F35' },
}

function dateParts(iso: string): { day: string; month: string } {
  const d = new Date(iso)
  return {
    day: d.toLocaleDateString('en-GB', { day: '2-digit' }),
    month: d.toLocaleDateString('en-GB', { month: 'short' }),
  }
}

export default function NoticesSection({ notices }: { notices: Notice[] }) {
  const [active, setActive] = useState<Notice | null>(null)
  const activeColors = active ? CATEGORY_COLORS[active.category] : null

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

        {notices.length === 0 ? (
          <p className="text-[14px] text-neutral-400 text-center py-10">No notices published yet — check back soon.</p>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {notices.map((n) => {
            const colors = CATEGORY_COLORS[n.category]
            const { day, month } = dateParts(n.published_at)
            return (
              <button
                key={n.id}
                onClick={() => setActive(n)}
                className="group text-left rounded-2xl border border-neutral-200 bg-neutral-50 overflow-hidden hover:bg-white hover:shadow-2 hover:border-neutral-300 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-400 focus-visible:ring-offset-2"
              >
                {/* Date banner */}
                <div className="px-6 pt-5 pb-4 flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0"
                    style={{ background: colors.bg }}
                  >
                    <span className="font-serif text-[22px] font-semibold leading-none" style={{ color: colors.text }}>{day}</span>
                    <span className="font-mono text-[9px] uppercase tracking-wider mt-0.5" style={{ color: colors.text }}>{month}</span>
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
                  <p className="text-[13px] text-neutral-600 leading-relaxed mt-3 mb-4 line-clamp-2">{n.body}</p>
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
        )}
      </div>

      {/* Detail modal */}
      {active && activeColors && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={() => setActive(null)} />
          <div className="relative w-full sm:max-w-lg bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="px-7 pt-7 pb-5 border-b border-neutral-100 flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0" style={{ background: activeColors.bg }}>
                <span className="font-serif text-[22px] font-semibold leading-none" style={{ color: activeColors.text }}>{dateParts(active.published_at).day}</span>
                <span className="font-mono text-[9px] uppercase tracking-wider mt-0.5" style={{ color: activeColors.text }}>{dateParts(active.published_at).month}</span>
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
              <p className="text-[11px] font-mono text-neutral-400">Published {active.published_at}</p>
              <p className="text-[13.5px] text-neutral-600 leading-relaxed">{active.body}</p>
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
