// Tier thresholds — CLAUDE.md §14 flags the exact grading scale/weights as an
// open question the SOW never defined. These four bands match what the UI
// already showed before this was wired to real data; treat this as a default
// that needs the client's sign-off, not a confirmed requirement. Computed at
// query time, never stored — CLAUDE.md §4's Phase 4 prompt explicitly calls
// for a computed value, not a stored column.
export type Tier = 'Distinction' | 'Merit' | 'Pass' | 'Below Pass'

export const TIER_ORDER: Tier[] = ['Distinction', 'Merit', 'Pass', 'Below Pass']

export const TIER_RANGE: Record<Tier, string> = {
  Distinction: '80% and above',
  Merit: '65% – 79%',
  Pass: '50% – 64%',
  'Below Pass': 'Below 50%',
}

export const TIER_STYLE: Record<Tier, { textColor: string; bgColor: string; barColor: string }> = {
  Distinction: { textColor: 'text-success', bgColor: 'bg-success-bg', barColor: 'bg-success' },
  Merit:       { textColor: 'text-ink-600', bgColor: 'bg-ink-50',     barColor: 'bg-ink-500' },
  Pass:        { textColor: 'text-warning', bgColor: 'bg-warning-bg', barColor: 'bg-warning' },
  'Below Pass':{ textColor: 'text-danger',  bgColor: 'bg-danger-bg',  barColor: 'bg-danger' },
}

export function tierOf(averagePct: number): Tier {
  if (averagePct >= 80) return 'Distinction'
  if (averagePct >= 65) return 'Merit'
  if (averagePct >= 50) return 'Pass'
  return 'Below Pass'
}
