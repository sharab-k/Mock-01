import { describe, expect, it } from 'vitest'
import { computeCreditedWatchedSeconds, MAX_CREDIT_SECONDS } from '../credit-math'

// Phase 6 step 6 (BACKEND-IMPLEMENTATION-PLAN.md): tab blur / pause / seek-ahead
// / multiple-tabs edge cases. These are properties of the crediting math
// itself, not the Route Handler around it, so they're tested directly and
// fast — no live Supabase round trip needed for the algorithm's correctness.
describe('computeCreditedWatchedSeconds', () => {
  it('credits zero on the very first heartbeat (no prior baseline to measure elapsed time from)', () => {
    const result = computeCreditedWatchedSeconds({
      previousWatchedSeconds: 0,
      lastHeartbeatAt: null,
      now: new Date('2026-01-01T00:00:10Z'),
      durationSeconds: 600,
    })
    expect(result).toBe(0)
  })

  it('credits real elapsed wall-clock time between two normal heartbeats', () => {
    const result = computeCreditedWatchedSeconds({
      previousWatchedSeconds: 10,
      lastHeartbeatAt: new Date('2026-01-01T00:00:00Z'),
      now: new Date('2026-01-01T00:00:05Z'),
      durationSeconds: 600,
    })
    expect(result).toBe(15) // 10 + 5s elapsed
  })

  it('clamps a single heartbeat\'s credit even if the gap is huge (e.g. a stray/late call, or seek-ahead can\'t inflate this — position is never read)', () => {
    const result = computeCreditedWatchedSeconds({
      previousWatchedSeconds: 10,
      lastHeartbeatAt: new Date('2026-01-01T00:00:00Z'),
      now: new Date('2026-01-01T01:00:00Z'), // 1 hour later
      durationSeconds: 6000,
    })
    expect(result).toBe(10 + MAX_CREDIT_SECONDS)
  })

  it('never credits past the lecture duration', () => {
    const result = computeCreditedWatchedSeconds({
      previousWatchedSeconds: 595,
      lastHeartbeatAt: new Date('2026-01-01T00:00:00Z'),
      now: new Date('2026-01-01T00:00:10Z'),
      durationSeconds: 600,
    })
    expect(result).toBe(600)
  })

  it('tab blur / pause: simply not calling this function credits nothing — no special case needed', () => {
    // The client-side gating (visibilitychange + isPlaying) means the
    // function is never invoked during blur/pause; there's no "zero delta"
    // input to test because no heartbeat is sent at all in that state.
    // What IS testable here: a heartbeat that DOES arrive after a genuine
    // multi-minute background gap still only credits the capped ceiling,
    // not the true elapsed time, so a background tab can't inflate progress
    // even if one heartbeat slips through.
    const result = computeCreditedWatchedSeconds({
      previousWatchedSeconds: 0,
      lastHeartbeatAt: new Date('2026-01-01T00:00:00Z'),
      now: new Date('2026-01-01T00:05:00Z'), // 5 minutes backgrounded
      durationSeconds: 600,
    })
    expect(result).toBe(MAX_CREDIT_SECONDS)
  })

  it('multiple tabs on the same lecture do not double-count: the second near-simultaneous heartbeat measures almost no elapsed time', () => {
    const t0 = new Date('2026-01-01T00:00:00Z')
    const tabAHeartbeatAt = new Date('2026-01-01T00:00:05Z')

    // Tab A's heartbeat lands first and claims the 5s window.
    const afterTabA = computeCreditedWatchedSeconds({
      previousWatchedSeconds: 0,
      lastHeartbeatAt: t0,
      now: tabAHeartbeatAt,
      durationSeconds: 600,
    })
    expect(afterTabA).toBe(5)

    // Tab B's heartbeat for the SAME row arrives 200ms later — the row's
    // last_heartbeat_at was just updated by tab A, so tab B measures a
    // near-zero gap instead of double-crediting its own independent 5s tick.
    const tabBHeartbeatAt = new Date(tabAHeartbeatAt.getTime() + 200)
    const afterTabB = computeCreditedWatchedSeconds({
      previousWatchedSeconds: afterTabA,
      lastHeartbeatAt: tabAHeartbeatAt,
      now: tabBHeartbeatAt,
      durationSeconds: 600,
    })
    expect(afterTabB).toBe(5) // +0 (rounded), not +5 again
  })
})
