// Ported from the web's lib/marks/tier.ts — same thresholds, same open
// question flagged in CLAUDE.md §14 (grading scale isn't SOW-confirmed yet).
// Tailwind class strings (TIER_STYLE) are dropped in favor of PillTone
// mapping (see tierTone below) since RN has no className.
export type Tier = 'Distinction' | 'Merit' | 'Pass' | 'Below Pass';

export const TIER_ORDER: Tier[] = ['Distinction', 'Merit', 'Pass', 'Below Pass'];

export const TIER_RANGE: Record<Tier, string> = {
  Distinction: '80% and above',
  Merit: '65% – 79%',
  Pass: '50% – 64%',
  'Below Pass': 'Below 50%',
};

export function tierOf(averagePct: number): Tier {
  if (averagePct >= 80) return 'Distinction';
  if (averagePct >= 65) return 'Merit';
  if (averagePct >= 50) return 'Pass';
  return 'Below Pass';
}
