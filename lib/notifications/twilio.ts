import 'server-only'
import twilio from 'twilio'
import type { NotificationChannel, NotificationProvider, NotificationSendResult } from './provider'

// Client is built once per module load, not per send — the SDK's own
// guidance, and avoids re-parsing credentials on every notification.
// Lazy (only constructed on first send()) so a missing/placeholder
// TWILIO_ACCOUNT_SID never throws at import time — the account-not-found
// error below is what surfaces instead, same non-blocking-failure
// contract the pipeline has always had (CLAUDE.md §7).
let client: ReturnType<typeof twilio> | null = null

export class TwilioProvider implements NotificationProvider {
  async send(channel: NotificationChannel, recipient: string, message: string): Promise<NotificationSendResult> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const from = channel === 'whatsapp' ? process.env.TWILIO_WHATSAPP_FROM : process.env.TWILIO_SMS_FROM

    if (!accountSid || !authToken || !from) {
      return { ok: false, error: 'Twilio is not configured (missing env vars).' }
    }

    if (!client) client = twilio(accountSid, authToken)

    const to = channel === 'whatsapp' ? `whatsapp:${recipient}` : recipient
    const fromAddress = channel === 'whatsapp' ? `whatsapp:${from}` : from

    try {
      await client.messages.create({ from: fromAddress, to, body: message })
      return { ok: true }
    } catch (err) {
      // The SDK throws a RestException with .code/.message for any Twilio
      // API error (auth failure, unapproved template outside the 24h
      // session window, invalid number, etc.) — surfaced as-is into
      // notification_log so a failure is diagnosable from the audit trail
      // instead of a bare "failed" with no reason.
      const code = err && typeof err === 'object' && 'code' in err ? ` (code ${(err as { code: unknown }).code})` : ''
      return { ok: false, error: (err instanceof Error ? err.message : 'Unknown Twilio request failure.') + code }
    }
  }
}
