import { createClient } from '@/lib/supabase/server'

export type SubjectStat = { name: string; entries: number; avg: number }

export async function fetchSubjectStats(): Promise<SubjectStat[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('marks').select('subject, score, max_score')

  const subjectMap = new Map<string, { sum: number; count: number }>()
  for (const row of data ?? []) {
    const cur = subjectMap.get(row.subject) ?? { sum: 0, count: 0 }
    cur.sum += (row.score / row.max_score) * 100
    cur.count++
    subjectMap.set(row.subject, cur)
  }

  return Array.from(subjectMap.entries())
    .map(([name, v]) => ({ name, entries: v.count, avg: Math.round(v.sum / v.count) }))
    .sort((a, b) => b.entries - a.entries)
}
