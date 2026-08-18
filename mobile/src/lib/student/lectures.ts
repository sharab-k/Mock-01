import { supabase } from '@/lib/supabase/client';

export type LectureProgress = {
  id: string;
  subject: string;
  title: string;
  durationSeconds: number;
  watchedSeconds: number;
  completed: boolean;
};

// Ported from the web's lib/student/lectures.ts.
export async function fetchStudentLectures(studentId: string): Promise<LectureProgress[]> {
  const [lecturesRes, sessionsRes] = await Promise.all([
    supabase.from('video_lectures').select('id, title, subject, duration_seconds').order('created_at', { ascending: true }),
    supabase.from('video_watch_sessions').select('lecture_id, watched_seconds, completed').eq('student_id', studentId),
  ]);

  const sessionByLecture = new Map((sessionsRes.data ?? []).map((s) => [s.lecture_id, s]));

  return (lecturesRes.data ?? []).map((l) => {
    const session = sessionByLecture.get(l.id);
    return {
      id: l.id,
      subject: l.subject,
      title: l.title,
      durationSeconds: l.duration_seconds,
      watchedSeconds: session?.watched_seconds ?? 0,
      completed: session?.completed ?? false,
    };
  });
}
