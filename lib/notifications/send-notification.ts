import 'server-only'
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
async function dispatch(message: string, parentPhone: string): Promise<void> {
  try {
    const whatsapp = await provider.send('whatsapp', parentPhone, message)
    await logResult('whatsapp', parentPhone, message, whatsapp.ok)
    if (whatsapp.ok) return

    const sms = await provider.send('sms', parentPhone, message)
    await logResult('sms', parentPhone, message, sms.ok)
  } catch {
    // Both provider.send and logResult already catch/report their own
    // failures — this is a last-resort guard so a bug in the pipeline itself
    // can never propagate back into the attendance/marks write path.
  }
}

export async function sendAbsenceAlert(studentName: string, parentPhone: string, classDate: string): Promise<void> {
  await dispatch(absenceAlertMessage(studentName, classDate), parentPhone)
}

export async function sendGradeAlert(studentName: string, parentPhone: string, subject: string, examType: string, score: number, maxScore: number): Promise<void> {
  await dispatch(gradeAlertMessage(studentName, subject, examType, score, maxScore), parentPhone)
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
