// Ported from the web's lib/attendance/late-policy.ts — grades 9-10 split by
// gender with their own cutoff times (Girls classes run earlier in the day,
// Boys later); 11-12/ICOM-1/ICOM-2 (co-ed) use a relative
// 15-minutes-after-class-starts rule instead of a fixed clock time.
const CLOCK_CUTOFF_GRADES = ['9', '10'];

export function lateCutoffLabel(grade: string, section: string): string {
  if (!CLOCK_CUTOFF_GRADES.includes(grade)) {
    return '15 mins after class starts';
  }
  return section.startsWith('G') ? 'After 4:15 PM' : 'After 6:45 PM';
}
