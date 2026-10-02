'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, CalendarX, GraduationCap, Check } from 'lucide-react'
import type { SentNotification } from '@/lib/notifications/inbox'

const KIND_ICON = { absence: CalendarX, grade: GraduationCap } as const
const KIND_STYLE = { absence: 'bg-danger-bg text-danger', grade: 'bg-ink-100 text-ink-700' } as const
const FILTERS = ['All', 'Absence', 'Grade'] as const

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function SuperAdminNotificationsContent({ notifications }: { notifications: SentNotification[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All')
  const [openId, setOpenId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return notifications.filter((n) => {
      const matchesKind = filter === 'All' || n.kind === filter.toLowerCase()
      const matchesQuery = !q || n.studentName.toLowerCase().includes(q) || n.parentName.toLowerCase().includes(q)
      return matchesKind && matchesQuery
    })
  }, [notifications, query, filter])

  return (
    <>
      <div>
        <Link href="/super-admin" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Dashboard
        </Link>
        <h1 className="text-[20px] font-bold text-neutral-900">Sent Notifications</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">Every alert delivered to a parent portal · {filtered.length} of {notifications.length}</p>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by student or parent…" className="w-full pl-9 pr-3 py-2.5 text-[13px] border border-neutral-200 rounded-xl bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all" />
        </div>
        <div className="flex items-center gap-2">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`text-[12px] font-semibold px-3 py-1.5 rounded-full transition-colors ${filter === f ? 'bg-ink-700 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>{f}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-5 py-14 text-center text-[13px] text-neutral-400">No notifications match.</div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filtered.map((n) => {
              const Icon = KIND_ICON[n.kind]
              const open = openId === n.id
              return (
                <div key={n.id}>
                  <button onClick={() => setOpenId(open ? null : n.id)} className="w-full flex items-start gap-4 px-5 py-4 hover:bg-neutral-50 transition-colors text-left">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${KIND_STYLE[n.kind]}`}><Icon size={15} /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-neutral-900">{n.title}</p>
                      <p className="text-[11.5px] text-neutral-500 mt-0.5">
                        To <span className="font-medium text-neutral-700">{n.parentName}</span> · {n.studentName}
                        {n.gradeLevel && <> · <span className="font-mono">Grade {n.gradeLevel}-{n.section}</span></>}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] font-mono text-neutral-400">{formatWhen(n.createdAt)}</p>
                      <p className={`text-[11px] font-semibold mt-1 inline-flex items-center gap-1 ${n.read ? 'text-success' : 'text-neutral-400'}`}>
                        {n.read ? <><Check size={11} /> Read</> : 'Unread'}
                      </p>
                    </div>
                  </button>
                  {open && (
                    <div className="px-5 pb-4 pt-1 bg-neutral-50 border-t border-neutral-100 ml-[52px] pr-5 rounded-b-xl">
                      <p className="text-[13px] text-neutral-600 leading-relaxed whitespace-pre-line">{n.body}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
