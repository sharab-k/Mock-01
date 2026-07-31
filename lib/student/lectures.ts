import { createClient } from '@/lib/supabase/server'
import type { LectureProgress } from './dashboard-data'

export async function fetchStudentLectures(studentId: string): Promise<LectureProgress[]> {
  const supabase = await createClient()

  const [lecturesRes, sessionsRes] = await Promise.all([
    supabase.from('video_lectures').select('id, title, subject, duration_seconds').order('created_at', { ascending: true }),
    supabase.from('video_watch_sessions').select('lecture_id, watched_seconds, completed').eq('student_id', studentId),
  ])

  const sessionByLecture = new Map((sessionsRes.data ?? []).map((s) => [s.lecture_id, s]))

  return (lecturesRes.data ?? []).map((l) => {
    const session = sessionByLecture.get(l.id)
    return {
      id: l.id,
      subject: l.subject,
      title: l.title,
      durationSeconds: l.duration_seconds,
      watchedSeconds: session?.watched_seconds ?? 0,
      completed: session?.completed ?? false,
    }
  })
}
