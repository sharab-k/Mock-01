// Turning the sheet's subject abbreviations into real subjects for a given
// student. Many columns are shared by two groups ("M/B" = Mathematics for most
// students, Biology for pre-medical ones), so which subject a mark belongs to
// depends on the student's stream/grade — never guessed from the mark itself.

import type { ColumnTotals } from '@/lib/marks/wide-sheet'

const ABBREVIATIONS: Record<string, RegExp> = {
  M: /^(mathematics|maths|math)$/,
  MATH: /^(mathematics|maths|math)$/,
  B: /^biology$/,
  CH: /^chemistry$/,
  CM: /^computer(science|studies)?$/,
  PHY: /^physics$/,
  URD: /^urdu$/,
  ISL: /^islamiat$/,
  ENG: /^english$/,
  PST: /^pak(istan)?studies$/,
  ACC: /^account(s|ing)?$/,
  POC: /^principleofcommerce$/,
  STATS: /^(stats|statistics)$/,
  BANK: /^bank(ing)?$/,
}

export const normalizeSubject = (name: string): string => name.toLowerCase().replace(/[^a-z]/g, '')

export function isKnownAbbreviation(abbr: string): boolean {
  return abbr in ABBREVIATIONS
}

export type SubjectEntry = { name: string; grade: string }

// The grade's own spelling of the subject ("Mathematics" vs "MATHEMATICS").
export function subjectNameFor(abbr: string, grade: string, subjects: SubjectEntry[]): string | null {
  const re = ABBREVIATIONS[abbr]
  if (!re) return null
  const found = subjects
    .filter((s) => s.grade === grade && re.test(normalizeSubject(s.name)))
    .map((s) => s.name)
    .sort()
  return found[0] ?? null
}

export type Group = { grade: string; stream: string | null }
const isSecondYear = (g: string): boolean => g === '12' || g === 'ICOM-2'

// Which alternative of a shared column this student takes, or null when the
// student's data cannot say.
export function chooseAlternative(alts: string[], s: Group): string | null {
  if (alts.length === 1) return alts[0]
  const has = (a: string, b: string): boolean => alts.includes(a) && alts.includes(b)
  if (has('M', 'B')) {
    if (s.stream === 'Pre-Medical') return 'B'
    if (s.stream === 'Pre-Engineering' || s.stream === 'Computer Science') return 'M'
    return null
  }
  if (has('CH', 'CM')) {
    if (s.stream === 'Computer Science') return 'CM'
    if (s.stream === 'Pre-Medical' || s.stream === 'Pre-Engineering') return 'CH'
    return null
  }
  if (has('ISL', 'PST')) return isSecondYear(s.grade) ? 'PST' : 'ISL'
  if (has('ACC', 'STATS')) return isSecondYear(s.grade) ? 'STATS' : 'ACC'
  return null
}

// The total marks of the chosen alternative from the column's header.
export function totalFor(totals: ColumnTotals, alts: string[], chosen: string, s: Group): number | null {
  if (totals.byKey[chosen] !== undefined) return totals.byKey[chosen]
  const yearKey = isSecondYear(s.grade) ? 'XII' : 'XI'
  if (totals.byKey[yearKey] !== undefined) return totals.byKey[yearKey]
  if (totals.positional.length > 1) return totals.positional[alts.indexOf(chosen)] ?? null
  return totals.single
}
