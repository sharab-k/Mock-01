'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import AttendanceMarker from '@/components/dashboard/AttendanceMarker'

export default function MarkAttendancePage() {
  const [toast, setToast] = useState<{ absent: number } | null>(null)

  const handleSubmitted = (summary: { present: number; absent: number; late: number }) => {
    if (summary.absent > 0) {
      setToast({ absent: summary.absent })
      setTimeout(() => setToast(null), 4000)
    }
  }

  return (
    <>
      <div>
        <Link href="/attendance" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Attendance
        </Link>
        <h1 className="text-[20px] font-bold text-neutral-900">Mark Today&apos;s Attendance</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">Single-click check-in · submits trigger WhatsApp alerts for absences</p>
      </div>

      <AttendanceMarker onSubmitted={handleSubmitted} />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-neutral-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center shrink-0">
            <MessageSquare size={14} className="text-success" />
          </div>
          <p className="text-[13px]">
            <span className="font-semibold">{toast.absent} WhatsApp alert{toast.absent > 1 ? 's' : ''}</span> sent to parents of absent students
          </p>
        </div>
      )}
    </>
  )
}
