// Pure function, no Supabase/Next dependency — the actual anti-cheat
// invariants (seek-ahead immunity, multi-tab non-double-counting, duration
// capping) live entirely in this math, so it's tested directly rather than
// through the Route Handler that wraps it.
export const MAX_CREDIT_SECONDS = 20

export function computeCreditedWatchedSeconds(params: {
  previousWatchedSeconds: number
  lastHeartbeatAt: Date | null
  now: Date
  durationSeconds: number
}): number {
  const { previousWatchedSeconds, lastHeartbeatAt, now, durationSeconds } = params

  if (!lastHeartbeatAt) {
    // First-ever heartbeat for this (student, lecture) pair — establishes the
    // baseline with zero credit; the NEXT heartbeat measures real elapsed time.
    return Math.round(Math.min(previousWatchedSeconds, durationSeconds))
  }

  const elapsedSeconds = (now.getTime() - lastHeartbeatAt.getTime()) / 1000
  const credit = Math.max(0, Math.min(elapsedSeconds, MAX_CREDIT_SECONDS))
  return Math.round(Math.min(previousWatchedSeconds + credit, durationSeconds))
}
