'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Bell, CalendarX, GraduationCap } from 'lucide-react'
import { markAllNotificationsReadAction } from '@/lib/actions/notifications'
import type { InboxNotification } from '@/lib/notifications/inbox'

const KIND_ICON = { absence: CalendarX, grade: GraduationCap } as const
const KIND_STYLE = { absence: 'bg-danger-bg text-danger', grade: 'bg-ink-100 text-ink-700' } as const

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function ParentNotificationsContent({ notifications }: { notifications: InboxNotification[] }) {
  // Unread dots reflect what was unread when the page opened; the server copy
  // is marked read right after, so they clear on the next visit.
  const [unreadAtOpen] = useState(() => new Set(notifications.filter((n) => !n.read).map((n) => n.id)))

  useEffect(() => {
    if (unreadAtOpen.size > 0) void markAllNotificationsReadAction()
  }, [unreadAtOpen])

  return (
    <>
      <div>
        <Link href="/parent" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Dashboard
        </Link>
        <h1 className="text-[20px] font-bold text-neutral-900">Notifications</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">
          {notifications.length === 0 ? 'Nothing yet' : `${notifications.length} message${notifications.length === 1 ? '' : 's'} from the school`}
          {unreadAtOpen.size > 0 && ` · ${unreadAtOpen.size} new`}
        </p>
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-3"><Bell size={20} className="text-neutral-300" /></div>
          <p className="text-[13px] text-neutral-400">Absence alerts and new results will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const Icon = KIND_ICON[n.kind]
            return (
              <div key={n.id} className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-5">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${KIND_STYLE[n.kind]}`}><Icon size={16} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[14px] font-semibold text-neutral-900">{n.title}</p>
                      {unreadAtOpen.has(n.id) && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-ink-700 text-white">New</span>}
                    </div>
                    <p className="text-[11.5px] text-neutral-400 mt-0.5">{n.studentName} · <span className="font-mono">{formatWhen(n.createdAt)}</span></p>
                    <p className="text-[13px] text-neutral-700 leading-relaxed mt-3 whitespace-pre-line">{n.body}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
