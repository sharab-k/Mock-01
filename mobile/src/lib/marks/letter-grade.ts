// Ported verbatim from the web's lib/marks/letter-grade.ts (pure function,
// no server dependency).
export function letterGrade(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 75) return 'A-';
  if (pct >= 70) return 'B+';
  if (pct >= 65) return 'B';
  if (pct >= 60) return 'B-';
  if (pct >= 55) return 'C+';
  if (pct >= 50) return 'C';
  return 'F';
}
