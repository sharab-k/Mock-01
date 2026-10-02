import { NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveRequestClient } from '@/lib/supabase/session'
import { notifyAbsence } from '@/lib/notifications/send-notification'

const BodySchema = z.object({
  studentId: z.string().uuid(),
  studentName: z.string().min(1),
  classDate: z.string().min(1),
})

// Thin external entry point for the notification pipeline (CLAUDE.md §8's
// folder structure). The attendance Server Action calls the same
// lib/notifications functions directly in-process — an HTTP round-trip to
// this same server for every absence would just be latency with no benefit.
// This route exists for anything that needs to trigger a resend from outside
// that immediate request (a retry action, a future admin "resend alert"
// button) without duplicating the pipeline logic.
export async function POST(request: Request) {
  const supabase = await resolveRequestClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['attendance_admin', 'marks_admin', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })

  const { data: student } = await supabase.from('students').select('roll_number').eq('id', parsed.data.studentId).single()
  const { parents } = await notifyAbsence({
    studentId: parsed.data.studentId,
    studentName: parsed.data.studentName,
    rollNumber: student?.roll_number ?? '',
    classDate: parsed.data.classDate,
    createdBy: user.id,
  })

  // `sent` means delivered to the parent portal(s); WhatsApp/SMS is attempted
  // in the background on top of that and may fail independently (see
  // notification_log).
  return NextResponse.json({ ok: true, notified: parents, sent: parents > 0 })
}
