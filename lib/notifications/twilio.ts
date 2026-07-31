import 'server-only'
import type { NotificationChannel, NotificationProvider, NotificationSendResult } from './provider'

// Raw REST call instead of the `twilio` npm SDK — one HTTP POST is all this
// needs, and it avoids adding a dependency for what's a single endpoint.
export class TwilioProvider implements NotificationProvider {
  async send(channel: NotificationChannel, recipient: string, message: string): Promise<NotificationSendResult> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const from = channel === 'whatsapp' ? process.env.TWILIO_WHATSAPP_FROM : process.env.TWILIO_SMS_FROM

    if (!accountSid || !authToken || !from) {
      return { ok: false, error: 'Twilio is not configured (missing env vars).' }
    }

    const to = channel === 'whatsapp' ? `whatsapp:${recipient}` : recipient

    try {
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        },
        body: new URLSearchParams({ From: from, To: to, Body: message }),
      })

      if (!response.ok) {
        const body = await response.text()
        return { ok: false, error: `Twilio ${response.status}: ${body.slice(0, 300)}` }
      }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Unknown Twilio request failure.' }
    }
  }
}
