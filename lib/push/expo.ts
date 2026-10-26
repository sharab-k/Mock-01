// Expo Push API client: builds the messages for one notification and reads back
// which phone tokens Expo says are dead. No Supabase / Next imports, so it is
// unit-testable on its own. Docs: https://docs.expo.dev/push-notifications/sending-notifications/
export const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const MAX_BATCH = 100
// Android shows a push only if its channel exists on the phone; the app creates this one.
export const PUSH_CHANNEL = 'default'

export type PushNotice = { id: string; kind: string; title: string; body: string; studentId: string }
export type PushMessage = {
  to: string
  title: string
  body: string
  data: { notificationId: string; kind: string; studentId: string }
  sound: 'default'
  channelId: string
  priority: 'high'
}

// Notification bodies are letters ("Dear Parents, …"); the lock screen shows the
// first lines and the full text expands, so only the hard payload limit matters.
const clip = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

export function buildMessages(tokens: string[], n: PushNotice): PushMessage[] {
  return tokens.map((to) => ({
    to,
    title: clip(n.title, 100),
    body: clip(n.body, 1000),
    data: { notificationId: n.id, kind: n.kind, studentId: n.studentId },
    sound: 'default' as const,
    channelId: PUSH_CHANNEL,
    priority: 'high' as const,
  }))
}

type Ticket = { status: 'ok' | 'error'; details?: { error?: string } }

// Tokens whose ticket says DeviceNotRegistered (app uninstalled / token revoked):
// stop sending to them.
export function deadTokens(messages: PushMessage[], tickets: Ticket[]): string[] {
  const dead: string[] = []
  tickets.forEach((t, i) => {
    if (t.status === 'error' && t.details?.error === 'DeviceNotRegistered' && messages[i]) dead.push(messages[i].to)
  })
  return dead
}

export type SendResult = { sent: number; failed: number; dead: string[] }

export async function sendPush(messages: PushMessage[], fetchImpl: typeof fetch = fetch): Promise<SendResult> {
  let sent = 0
  let failed = 0
  const dead: string[] = []
  for (let i = 0; i < messages.length; i += MAX_BATCH) {
    const batch = messages.slice(i, i + MAX_BATCH)
    try {
      const res = await fetchImpl(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify(batch),
        signal: AbortSignal.timeout(8000),
      })
      const json = (await res.json().catch(() => null)) as { data?: Ticket[] } | null
      if (!res.ok || !json?.data) { failed += batch.length; continue }
      sent += json.data.filter((t) => t.status === 'ok').length
      failed += json.data.filter((t) => t.status !== 'ok').length
      dead.push(...deadTokens(batch, json.data))
    } catch {
      failed += batch.length
    }
  }
  return { sent, failed, dead }
}
