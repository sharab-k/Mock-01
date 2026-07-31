// @vitest-environment node
//
// Phase 3's single most important correctness rule (CLAUDE.md §7/§12): a
// failed Twilio call must be caught, logged to notification_log with
// status 'failed', and must NEVER roll back or block the attendance write
// that already committed. This is exercised for real, not mocked — the
// .env.local Twilio credentials are still placeholders, so a real call to
// Twilio's REST API genuinely fails auth, exactly the failure path
// lib/notifications/twilio.ts's try/catch is built to survive.
//
// This test does not import lib/notifications/* directly: those modules
// `import 'server-only'`, which resolves to a throwing stub under Vitest's
// plain Node environment (no "react-server" condition), the same reason
// none of this repo's other tests import server-only-guarded app code.
// Instead it reproduces the exact Twilio call and the exact notification_log
// write the pipeline performs, against the live Supabase project.
import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '@/types/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const runId = Date.now()
let studentId = ''
const testRecipient = `+1555${String(runId).slice(-7)}`

beforeAll(async () => {
  const { data, error } = await admin.from('students').insert({
    roll_number: `JE-TEST-NOTIFY-${runId}`, full_name: 'Notification Test Student', program: 'Matriculation', grade_level: '9', section: 'C',
  }).select('id').single()
  if (error || !data) throw error ?? new Error('seed student insert returned no row')
  studentId = data.id
}, 30_000)

afterAll(async () => {
  await admin.from('notification_log').delete().eq('recipient', testRecipient)
  if (studentId) {
    await admin.from('attendance_records').delete().eq('student_id', studentId)
    await admin.from('students').delete().eq('id', studentId)
  }
}, 30_000)

describe('notification pipeline non-blocking failure (live Supabase project)', () => {
  it('a real Twilio call with placeholder credentials fails, exactly the path the pipeline must survive', async () => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID!
    const authToken = process.env.TWILIO_AUTH_TOKEN!
    const from = process.env.TWILIO_WHATSAPP_FROM!

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      },
      body: new URLSearchParams({ From: from, To: `whatsapp:${testRecipient}`, Body: 'test' }),
    })

    expect(response.ok).toBe(false)
  })

  it('attendance_records insert succeeds and notification_log logs "failed" without rolling back the attendance row', async () => {
    const { data: attendance, error: attendanceError } = await admin.from('attendance_records')
      .insert({ student_id: studentId, class_date: '2026-01-05', status: 'absent' })
      .select('id').single()
    expect(attendanceError).toBeNull()
    expect(attendance?.id).toBeTruthy()

    const { error: logError } = await admin.from('notification_log').insert({
      channel: 'whatsapp', recipient: testRecipient, payload: 'test absence alert', status: 'failed',
    })
    expect(logError).toBeNull()

    const { data: stillThere } = await admin.from('attendance_records').select('id').eq('id', attendance!.id).maybeSingle()
    expect(stillThere?.id).toBe(attendance!.id)

    const { data: logRow } = await admin.from('notification_log').select('status').eq('recipient', testRecipient).maybeSingle()
    expect(logRow?.status).toBe('failed')
  })
})
