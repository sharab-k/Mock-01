'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Megaphone, ChevronDown, ChevronUp } from 'lucide-react'
import { CATEGORY_STYLE, type Notice } from '@/lib/notices/types'

export default function AdmissionsNoticesContent({ notices }: { notices: Notice[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <>
      <div>
        <Link href="/admissions" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Admissions
        </Link>
        <h1 className="text-[20px] font-bold text-neutral-900">Notices</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">{notices.length} published notices · read-only, managed by Super Admin</p>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        {notices.length === 0 ? (
          <div className="px-5 py-14 text-center text-[13px] text-neutral-400">No notices yet.</div>
        ) : (
        <div className="divide-y divide-neutral-100">
          {notices.map((n) => (
            <div key={n.id}>
              <button
                onClick={() => setExpanded(expanded === n.id ? null : n.id)}
                className="w-full flex items-start gap-4 px-5 py-4 hover:bg-neutral-50 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-ink-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Megaphone size={15} className="text-ink-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[13.5px] font-semibold text-neutral-900">{n.title}</span>
                    <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_STYLE[n.category]}`}>{n.category}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                    <span>{n.audience}</span>
                    <span>·</span>
                    <span className="font-mono">{n.published_at}</span>
                  </div>
                </div>
                {expanded === n.id ? <ChevronUp size={14} className="text-neutral-400 mt-1 shrink-0" /> : <ChevronDown size={14} className="text-neutral-400 mt-1 shrink-0" />}
              </button>
              {expanded === n.id && (
                <div className="px-5 pb-4 pt-1 bg-neutral-50 border-t border-neutral-100 ml-[52px] pr-5 rounded-b-xl">
                  <p className="text-[13px] text-neutral-600 leading-relaxed">{n.body}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        )}
      </div>
    </>
  )
}
