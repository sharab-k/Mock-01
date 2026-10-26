import { describe, expect, it, vi } from 'vitest'
import { buildMessages, deadTokens, sendPush } from '../expo'

const notice = { id: 'n1', kind: 'absence', title: 'Notification of Absence', body: 'Dear Parents…', studentId: 's1' }

describe('push messages', () => {
  it('builds one high-priority message per phone on the default channel', () => {
    const m = buildMessages(['ExponentPushToken[a]', 'ExponentPushToken[b]'], notice)
    expect(m).toHaveLength(2)
    expect(m[0]).toMatchObject({ to: 'ExponentPushToken[a]', channelId: 'default', priority: 'high', data: { notificationId: 'n1', kind: 'absence', studentId: 's1' } })
  })

  it('clips very long text', () => {
    const m = buildMessages(['t'], { ...notice, body: 'x'.repeat(5000) })
    expect(m[0].body.length).toBe(1000)
  })

  it('finds tokens Expo says are dead', () => {
    const m = buildMessages(['a', 'b'], notice)
    expect(deadTokens(m, [{ status: 'ok' }, { status: 'error', details: { error: 'DeviceNotRegistered' } }])).toEqual(['b'])
    expect(deadTokens(m, [{ status: 'error', details: { error: 'MessageRateExceeded' } }])).toEqual([])
  })
})

describe('sendPush', () => {
  const reply = (data: unknown, status = 200) => vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => ({ data }) })

  it('counts sent and failed, and reports dead tokens', async () => {
    const m = buildMessages(['a', 'b', 'c'], notice)
    const f = reply([{ status: 'ok' }, { status: 'error', details: { error: 'DeviceNotRegistered' } }, { status: 'ok' }])
    expect(await sendPush(m, f as unknown as typeof fetch)).toEqual({ sent: 2, failed: 1, dead: ['b'] })
  })

  it('splits into batches of 100', async () => {
    const m = buildMessages(Array.from({ length: 150 }, (_, i) => `t${i}`), notice)
    const f = vi.fn().mockImplementation(async (_u: string, init: { body: string }) => ({
      ok: true,
      status: 200,
      json: async () => ({ data: (JSON.parse(init.body) as unknown[]).map(() => ({ status: 'ok' })) }),
    }))
    const r = await sendPush(m, f as unknown as typeof fetch)
    expect(f).toHaveBeenCalledTimes(2)
    expect(r.sent).toBe(150)
  })

  it('a network failure or an error response counts as failed, never throws', async () => {
    const m = buildMessages(['a', 'b'], notice)
    expect(await sendPush(m, vi.fn().mockRejectedValue(new Error('down')) as unknown as typeof fetch)).toEqual({ sent: 0, failed: 2, dead: [] })
    expect(await sendPush(m, reply([], 500) as unknown as typeof fetch)).toEqual({ sent: 0, failed: 2, dead: [] })
  })
})
