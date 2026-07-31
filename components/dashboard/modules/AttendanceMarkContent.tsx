'use client'

import { useState } from 'react'
import { MessageSquare } from 'lucide-react'
import AttendanceMarker, { type MarkerClass } from '@/components/dashboard/AttendanceMarker'

export default function AttendanceMarkContent({ classes }: { classes: MarkerClass[] }) {
  const [toast, setToast] = useState<{ notified: number } | null>(null)

  const handleSubmitted = (summary: { present: number; absent: number; late: number; notified: number }) => {
    if (summary.notified > 0) {
      setToast({ notified: summary.notified })
      setTimeout(() => setToast(null), 4000)
    }
  }

  return (
    <>
      <AttendanceMarker classes={classes} onSubmitted={handleSubmitted} />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-neutral-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center shrink-0">
            <MessageSquare size={14} className="text-success" />
          </div>
          <p className="text-[13px]">
            <span className="font-semibold">{toast.notified} WhatsApp alert{toast.notified > 1 ? 's' : ''}</span> sent to parents of absent students
          </p>
        </div>
      )}
    </>
  )
}
