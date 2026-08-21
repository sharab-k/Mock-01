import type { Grade } from '@/lib/students/constants'

const INTERMEDIATE_GRADES: Grade[] = ['11', '12']

// Grades 9-10 split by gender with their own cutoff times (Girls classes run
// earlier in the day, Boys later); 11-12 (Intermediate, co-ed) uses a
// relative 15-minutes-after-class-starts rule instead of a fixed clock time.
export function lateCutoffLabel(grade: string, section: string): string {
  if (INTERMEDIATE_GRADES.includes(grade as Grade)) {
    return '15 mins after class starts'
  }
  return section.startsWith('G') ? 'After 4:15 PM' : 'After 6:45 PM'
}
