export type NotificationChannel = 'whatsapp' | 'sms'

export type NotificationSendResult =
  | { ok: true }
  | { ok: false; error: string }

// Provider-agnostic interface (CLAUDE.md §2/§8) — Twilio today, swappable
// without touching the pipeline that calls this.
export interface NotificationProvider {
  send(channel: NotificationChannel, recipient: string, message: string): Promise<NotificationSendResult>
}
