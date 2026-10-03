// Mirrors the web's lib/marks/letter-grade.ts (pure functions, no server
// dependency). The school's grading scale (percentage -> grade):
//   80% and above  A-1      50% – 59.99%  C      33% – 39.99%  E
//   70% – 79.99%   A        40% – 49.99%  D      Below 33%     Fail
export type LetterGrade = 'A-1' | 'A' | 'B' | 'C' | 'D' | 'E' | 'Fail';

export const GRADE_SCALE: { grade: LetterGrade; range: string }[] = [
  { grade: 'A-1', range: '80% and above' },
  { grade: 'A', range: '70% – 79.99%' },
  { grade: 'B', range: '60% – 69.99%' },
  { grade: 'C', range: '50% – 59.99%' },
  { grade: 'D', range: '40% – 49.99%' },
  { grade: 'E', range: '33% – 39.99%' },
  { grade: 'Fail', range: 'Below 33%' },
];

export function letterGrade(score: number, max: number): LetterGrade {
  // Rounded to the scale's own 0.01% resolution so float noise can never tip a
  // boundary mark into the wrong band.
  const pct = Math.round((score / max) * 10000) / 100;
  if (pct >= 80) return 'A-1';
  if (pct >= 70) return 'A';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  if (pct >= 33) return 'E';
  return 'Fail';
}

// Maps onto StatusPill's existing tones — no new colours for new grades.
export type GradeTone = 'success' | 'ink' | 'warning' | 'danger';

export function gradeTone(grade: string): GradeTone {
  if (grade === 'A-1' || grade === 'A') return 'success';
  if (grade === 'B') return 'ink';
  if (grade === 'C' || grade === 'D') return 'warning';
  if (grade === 'E' || grade === 'Fail') return 'danger';
  return 'ink';
}
