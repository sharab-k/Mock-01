// Matching a spreadsheet row to a student. The G.R. number is the key, but the
// school's own sheets write it differently from the database ("F 501" in the
// sheet, "FA 501" in the system, "N101" vs "N 101"), the numbering itself
// sometimes disagrees, and a few rows have no G.R. at all. So:
//
//   1. exact G.R. (ignoring spaces/case)            -> accepted
//   2. same number part, compatible letters          -> accepted ONLY if the name agrees
//   3. name alone                                    -> accepted ONLY if at least two
//                                                       words agree, and only among
//                                                       the grades the sheet is for
//
// A wrong match would put a mark on the wrong child, so anything doubtful is
// refused and reported rather than guessed.

export type MatchStudent = { id: string; fullName: string; gr: string | null; grade: string; stream: string | null }
export type MatchResult =
  | { ok: true; student: MatchStudent; via: 'gr' | 'gr-number' | 'name'; ratio: number | null; hits: number }
  | { ok: false; error: string }

const MUHAMMAD = new Set(['m', 'md', 'mohd', 'mohammad', 'mohammed', 'muhammed', 'muhammad', 'muhamad', 'muhammmad', 'mohamad', 'muhaamad'])

export function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => (MUHAMMAD.has(t) ? 'muhammad' : t))
}

function editDistanceAtMost1(a: string, b: string): boolean {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1)
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1)
}

function sameToken(a: string, b: string): boolean {
  if (a === b) return true
  if (a.length >= 4 && b.length >= 4 && editDistanceAtMost1(a, b)) return true
  return a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))
}

// How many words the two names share, and what fraction of the shorter name
// that is (0..1).
export function nameAgreement(a: string, b: string): { hits: number; ratio: number } {
  const ta = nameTokens(a)
  const tb = nameTokens(b)
  if (ta.length === 0 || tb.length === 0) return { hits: 0, ratio: 0 }
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta]
  const used = new Set<number>()
  let hits = 0
  for (const t of short) {
    const j = long.findIndex((u, idx) => !used.has(idx) && sameToken(t, u))
    if (j !== -1) { used.add(j); hits++ }
  }
  return { hits, ratio: hits / short.length }
}

export const nameSimilarity = (a: string, b: string): number => nameAgreement(a, b).ratio

// "Strong" = enough to trust the name: two or more words agree and they cover
// most of the shorter name (a single shared first name is not enough).
export function isStrongAgreement(a: { hits: number; ratio: number }): boolean {
  return a.hits >= 2 && a.ratio >= 0.66
}

export const grKey = (raw: string): string => raw.toLowerCase().replace(/\s+/g, '')
const digitsOf = (raw: string): string => raw.replace(/\D/g, '')
const lettersOf = (raw: string): string => raw.toLowerCase().replace(/[^a-z]/g, '')

export function buildMatcher(students: MatchStudent[]) {
  const byKey = new Map<string, MatchStudent[]>()
  const byDigits = new Map<string, MatchStudent[]>()
  for (const s of students) {
    if (!s.gr) continue
    const k = grKey(s.gr)
    if (k) byKey.set(k, [...(byKey.get(k) ?? []), s])
    const d = digitsOf(s.gr)
    if (d) byDigits.set(d, [...(byDigits.get(d) ?? []), s])
  }

  const rank = (list: MatchStudent[], name: string) =>
    list
      .map((student) => ({ student, ...nameAgreement(name, student.fullName) }))
      .sort((x, y) => y.hits - x.hits || y.ratio - x.ratio)

  return function match(gr: string, name: string, allowedGrades?: ReadonlySet<string>): MatchResult {
    const inScope = (s: MatchStudent) => !allowedGrades || allowedGrades.has(s.grade)
    const key = grKey(gr)

    if (key) {
      const exact = (byKey.get(key) ?? []).filter(inScope)
      if (exact.length === 1) {
        const a = name ? nameAgreement(name, exact[0].fullName) : { hits: 0, ratio: 0 }
        return { ok: true, student: exact[0], via: 'gr', ratio: name ? a.ratio : null, hits: a.hits }
      }
      if (exact.length > 1) {
        const ranked = rank(exact, name)
        if (name && isStrongAgreement(ranked[0]) && !(ranked[1] && ranked[1].hits >= ranked[0].hits)) {
          return { ok: true, student: ranked[0].student, via: 'gr', ratio: ranked[0].ratio, hits: ranked[0].hits }
        }
        return { ok: false, error: `G.R. "${gr}" belongs to ${exact.length} students and the name "${name}" does not settle which.` }
      }

      const digits = digitsOf(gr)
      const letters = lettersOf(gr)
      if (digits) {
        const near = (byDigits.get(digits) ?? []).filter(inScope).filter((s) => {
          const l = lettersOf(s.gr ?? '')
          return letters === '' || l.startsWith(letters) || letters.startsWith(l)
        })
        const ranked = name ? rank(near, name) : []
        if (ranked[0] && isStrongAgreement(ranked[0]) && !(ranked[1] && ranked[1].hits >= ranked[0].hits)) {
          return { ok: true, student: ranked[0].student, via: 'gr-number', ratio: ranked[0].ratio, hits: ranked[0].hits }
        }
        if (near.length === 1 && name) {
          return { ok: false, error: `G.R. "${gr}" is ${near[0].fullName} (GR ${near[0].gr}) in the system, but the sheet says "${name}" — not saved, please check.` }
        }
      }
    }

    if (name) {
      const ranked = rank(students.filter(inScope), name)
      if (ranked[0] && isStrongAgreement(ranked[0]) && ranked[0].ratio >= 0.85 && !(ranked[1] && ranked[1].hits >= ranked[0].hits)) {
        return { ok: true, student: ranked[0].student, via: 'name', ratio: ranked[0].ratio, hits: ranked[0].hits }
      }
    }
    return { ok: false, error: gr ? `No student matches G.R. "${gr}"${name ? ` / "${name}"` : ''}.` : `No G.R. number, and no student matches the name "${name}".` }
  }
}

// The grades a result sheet is for, from its tab name ("xi a", "xii com",
// "com tcf" …). Used to keep fuzzy matches inside the right classes.
export function gradesForSheet(sheetName: string): ReadonlySet<string> {
  const n = sheetName.toLowerCase()
  const second = /\bxii\b/.test(n)
  const first = !second && /\bxi\b/.test(n)
  const commerce = /\bcom\b/.test(n)
  const out = new Set<string>()
  const addFirst = () => { if (!commerce) out.add('11'); out.add('ICOM-1') }
  const addSecond = () => { if (!commerce) out.add('12'); out.add('ICOM-2') }
  if (first) addFirst()
  else if (second) addSecond()
  else { addFirst(); addSecond() }
  if (commerce && !first && !second) { out.clear(); out.add('ICOM-1'); out.add('ICOM-2') }
  return out
}
