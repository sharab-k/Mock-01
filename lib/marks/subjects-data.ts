import { createClient } from '@/lib/supabase/server'

export type SubjectStat = { name: string; entries: number; avg: number }

export async function fetchSubjectStats(): Promise<SubjectStat[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('marks_subject_stats')

  return (data ?? [])
    .map((r) => ({ name: r.subject, entries: Number(r.entries), avg: Math.round(Number(r.avg_pct)) }))
    .sort((a, b) => b.entries - a.entries)
}
