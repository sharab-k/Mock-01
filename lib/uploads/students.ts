import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { idKey, grKey } from '@/lib/uploads/sheet'

export type UploadStudent = { id: string; fullName: string; gradeLevel: string }

export type StudentLookup = {
  byGr: Map<string, UploadStudent[]>
  byRoll: Map<string, UploadStudent[]>
}

async function inBatches<T, R>(items: T[], size: number, run: (batch: T[]) => PromiseLike<R[]>): Promise<R[]> {
  const out: R[] = []
  for (let i = 0; i < items.length; i += size) out.push(...(await run(items.slice(i, i + size))))
  return out
}

// Loads the students a spreadsheet refers to, in batches (PostgREST puts .in()
// lists in the URL, so a whole school's worth in one call overflows it). GR
// numbers in the real data are messy and occasionally duplicated, so each key
// maps to a list and callers treat >1 match as ambiguous.
export async function loadStudentLookup(
  supabase: SupabaseClient<Database>,
  grs: string[],
  rolls: string[],
): Promise<StudentLookup> {
  const byGr = new Map<string, UploadStudent[]>()
  const byRoll = new Map<string, UploadStudent[]>()
  const add = (map: Map<string, UploadStudent[]>, key: string, s: UploadStudent) => {
    if (!key) return
    const list = map.get(key) ?? []
    if (!list.some((x) => x.id === s.id)) list.push(s)
    map.set(key, list)
  }

  // Whitespace inside stored GR numbers is inconsistent ("N 101", "N101 "), so
  // fetch candidates with a loose per-key ilike on the compact form, then match
  // exactly on the normalised key in code.
  const uniqueGrs = Array.from(new Set(grs.map(grKey).filter(Boolean)))
  const rows = await inBatches(uniqueGrs, 40, async (batch) => {
    const filter = batch.map((g) => `gr_number.ilike.%${Array.from(g.replace(/[,()%*\\:"]/g, '')).join('%')}%`).join(',')
    const { data } = await supabase.from('students').select('id, full_name, grade_level, gr_number, roll_number').is('deleted_at', null).or(filter)
    return data ?? []
  })
  for (const r of rows) add(byGr, grKey(r.gr_number ?? ''), { id: r.id, fullName: r.full_name.trim(), gradeLevel: r.grade_level })

  const uniqueRolls = Array.from(new Set(rolls.map(idKey).filter(Boolean)))
  const rollRows = await inBatches(uniqueRolls, 100, async (batch) => {
    const { data } = await supabase.from('students').select('id, full_name, grade_level, roll_number').is('deleted_at', null).in('roll_number', batch.map((r) => r.toUpperCase()))
    return data ?? []
  })
  for (const r of rollRows) add(byRoll, idKey(r.roll_number), { id: r.id, fullName: r.full_name.trim(), gradeLevel: r.grade_level })

  return { byGr, byRoll }
}

// Roll number wins when given (it is unique); otherwise the G.R. number.
export function resolveStudent(
  lookup: StudentLookup,
  gr: string,
  roll: string,
): { ok: true; student: UploadStudent } | { ok: false; error: string } {
  if (roll) {
    const found = lookup.byRoll.get(idKey(roll))
    if (found?.length === 1) return { ok: true, student: found[0] }
    if (!found?.length) return { ok: false, error: `No student with roll number "${roll}".` }
  }
  if (gr) {
    const found = lookup.byGr.get(grKey(gr))
    if (found?.length === 1) return { ok: true, student: found[0] }
    if (found && found.length > 1) return { ok: false, error: `G.R. number "${gr}" matches ${found.length} students — add the roll number column.` }
    return { ok: false, error: `No student with G.R. number "${gr}".` }
  }
  return { ok: false, error: 'Missing G.R. number or roll number.' }
}
