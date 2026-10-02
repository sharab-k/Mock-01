import 'server-only'
import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TwilioProvider } from './twilio'
import { absenceAlertMessage, gradeAlertMessage } from './message-templates'
import type { NotificationChannel } from './provider'

const provider = new TwilioProvider()

async function logResult(channel: NotificationChannel, recipient: string, payload: string, ok: boolean) {
  const admin = createAdminClient()
  await admin.from('notification_log').insert({
    channel,
    recipient,
    payload,
    status: ok ? 'sent' : 'failed',
  })
}

// WhatsApp first, SMS as the network failover (CLAUDE.md §2) — tries both
// channels for a single logical alert, logs one notification_log row per
// channel attempted. A Twilio failure here must NEVER throw: the caller
// (the attendance/marks Server Action) has already committed the academic
// record, and a notification hiccup must not roll that back or bubble up.
async function dispatch(message: string, parentPhone: string): Promise<boolean> {
  try {
    const whatsapp = await provider.send('whatsapp', parentPhone, message)
    await logResult('whatsapp', parentPhone, message, whatsapp.ok)
    if (whatsapp.ok) return true

    const sms = await provider.send('sms', parentPhone, message)
    await logResult('sms', parentPhone, message, sms.ok)
    return sms.ok
  } catch {
    // Both provider.send and logResult already catch/report their own
    // failures — this is a last-resort guard so a bug in the pipeline itself
    // can never propagate back into the attendance/marks write path.
    return false
  }
}

export async function sendAbsenceAlert(studentName: string, rollNumber: string, parentPhone: string, classDate: string): Promise<boolean> {
  return dispatch(absenceAlertMessage(studentName, rollNumber, classDate), parentPhone)
}

export async function sendGradeAlert(studentName: string, parentPhone: string, subject: string, examType: string, score: number, maxScore: number): Promise<boolean> {
  return dispatch(gradeAlertMessage(studentName, subject, examType, score, maxScore), parentPhone)
}

// Twilio round-trips take seconds each, and a whole-class marks upload or
// attendance submit used to await every one of them inline — long enough to
// blow a serverless function's time limit and make the save look broken even
// though the academic rows had already committed. Runs the work after the
// response is sent (Next's after()); outside a request scope (unit tests,
// scripts) after() throws, so fall back to running inline.
export async function deferTask(task: () => Promise<unknown>): Promise<void> {
  try {
    after(async () => { try { await task() } catch { /* notification failures never surface */ } })
  } catch {
    try { await task() } catch { /* same non-blocking contract */ }
  }
}

export type GradeAlertJob = {
  studentId: string
  studentName: string
  subject: string
  examLabel: string
  score: number
  maxScore: number
}

// Looks up every job's parent phones in one query, then sends all alerts
// (a few at a time) after the response. Returns how many students have at
// least one phone to notify, so the caller can still report a count.
export async function queueGradeAlerts(jobs: GradeAlertJob[]): Promise<number> {
  if (jobs.length === 0) return 0

  const phonesByStudent = await getLinkedParentPhonesBatch(jobs.map((j) => j.studentId))
  const sends = jobs.flatMap((j) =>
    (phonesByStudent.get(j.studentId) ?? []).map((phone) => () => sendGradeAlert(j.studentName, phone, j.subject, j.examLabel, j.score, j.maxScore)),
  )

  await deferTask(async () => {
    const CONCURRENCY = 5
    for (let i = 0; i < sends.length; i += CONCURRENCY) {
      await Promise.all(sends.slice(i, i + CONCURRENCY).map((send) => send()))
    }
  })

  return jobs.filter((j) => (phonesByStudent.get(j.studentId)?.length ?? 0) > 0).length
}

export async function getLinkedParentPhonesBatch(studentIds: string[]): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>()
  if (studentIds.length === 0) return result

  const admin = createAdminClient()
  const { data } = await admin
    .from('parent_student_links')
    .select('student_id, profiles(phone)')
    .in('student_id', studentIds)

  for (const row of data ?? []) {
    const phone = row.profiles?.phone
    if (!phone) continue
    result.set(row.student_id, [...(result.get(row.student_id) ?? []), phone])
  }
  return result
}

// Resolves every parent phone linked to a student. Uses the service-role
// client because `profiles` has no RLS policy letting staff read another
// user's row (see lib/supabase/admin.ts) — same constraint the admissions
// enrolment flow already works around.
export async function getLinkedParentPhones(studentId: string): Promise<string[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('parent_student_links')
    .select('profiles(phone)')
    .eq('student_id', studentId)

  return (data ?? [])
    .map((row) => row.profiles?.phone)
    .filter((phone): phone is string => !!phone)
}
