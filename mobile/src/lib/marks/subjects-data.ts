import { supabase } from '@/lib/supabase/client';

export type SubjectStat = { name: string; entries: number; avg: number };

// Mirrors the web's lib/marks/subjects-data.ts (marks_subject_stats).
export async function fetchSubjectStats(): Promise<SubjectStat[]> {
  const { data } = await supabase.rpc('marks_subject_stats');

  return (data ?? [])
    .map((r) => ({ name: r.subject, entries: Number(r.entries), avg: Math.round(Number(r.avg_pct)) }))
    .sort((a, b) => b.entries - a.entries);
}
