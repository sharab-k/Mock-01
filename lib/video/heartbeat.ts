import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { computeCreditedWatchedSeconds } from './credit-math'
import type { Database } from '@/types/supabase'

export type HeartbeatResult =
  | { ok: true; watchedSeconds: number; durationSeconds: number; completed: boolean }
  | { ok: false; error: string; status: number }

// Never trusts a client-reported delta or playback position (CLAUDE.md §7:
// "never trust a client-submitted total watch time"). The only input that
// matters is wall-clock time elapsed since THIS ROW's last recorded
// heartbeat — which is what makes seeking ahead a no-op (the server has no
// concept of playback position) and makes concurrent tabs on the same
// lecture not double-count (whichever tab's heartbeat lands first claims
// that window; the next tab's heartbeat moments later measures near-zero
// elapsed time since the row was just updated).
export async function recordHeartbeat(
  studentId: string,
  lectureId: string,
  supabaseOverride?: SupabaseClient<Database>,
): Promise<HeartbeatResult> {
  const supabase = supabaseOverride ?? await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.', status: 401 }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'parent') return { ok: false, error: 'Not authorized.', status: 403 }

  const { data: link } = await supabase
    .from('parent_student_links')
    .select('student_id')
    .eq('parent_id', user.id)
    .eq('student_id', studentId)
    .maybeSingle()
  if (!link) return { ok: false, error: 'Not authorized for this student.', status: 403 }

  const { data: lecture } = await supabase.from('video_lectures').select('duration_seconds').eq('id', lectureId).single()
  if (!lecture) return { ok: false, error: 'Lecture not found.', status: 404 }

  const { data: existing } = await supabase
    .from('video_watch_sessions')
    .select('watched_seconds, last_heartbeat_at')
    .eq('student_id', studentId)
    .eq('lecture_id', lectureId)
    .maybeSingle()

  const now = new Date()
  const watchedSeconds = computeCreditedWatchedSeconds({
    previousWatchedSeconds: existing?.watched_seconds ?? 0,
    lastHeartbeatAt: existing?.last_heartbeat_at ? new Date(existing.last_heartbeat_at) : null,
    now,
    durationSeconds: lecture.duration_seconds,
  })
  const completed = watchedSeconds >= lecture.duration_seconds * 0.9

  const { error } = await supabase.from('video_watch_sessions').upsert(
    { student_id: studentId, lecture_id: lectureId, watched_seconds: watchedSeconds, completed, last_heartbeat_at: now.toISOString() },
    { onConflict: 'student_id,lecture_id' },
  )
  if (error) return { ok: false, error: 'Could not record watch time.', status: 500 }

  return { ok: true, watchedSeconds, durationSeconds: lecture.duration_seconds, completed }
}
