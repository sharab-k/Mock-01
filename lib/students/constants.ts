export type Grade = '9' | '10' | '11' | '12'
export type Section = 'A' | 'B' | 'C' | 'D' | 'E' | 'G1' | 'G2' | 'G3' | 'B1' | 'B2' | 'B3'
export type Program = 'SSC-1' | 'SSC-2' | 'HSC-1' | 'HSC-2'

export const GRADES: Grade[] = ['9', '10', '11', '12']

// SSC = Matriculation (grades 9-10), HSC = Intermediate (grades 11-12) — the
// standard Pakistani-school terms. The programme choice IS the grade choice
// now (no separate grade picker); Primary Years/Middle School were dropped
// since this app only ever enrolled grades 9-12, so they never mapped to
// anything real.
export const PROGRAMS: Program[] = ['SSC-1', 'SSC-2', 'HSC-1', 'HSC-2']

export const PROGRAM_GRADE: Record<Program, Grade> = {
  'SSC-1': '9',
  'SSC-2': '10',
  'HSC-1': '11',
  'HSC-2': '12',
}

const INTERMEDIATE_GRADES: Grade[] = ['11', '12']

// Grades 9-10 split by gender with 3 numbered sections each (Girls: G1-G3,
// Boys: B1-B3); 11-12 (Intermediate) is co-ed with 5 lettered sections (A-E).
export function sectionsForGrade(grade: Grade): Section[] {
  return INTERMEDIATE_GRADES.includes(grade)
    ? ['A', 'B', 'C', 'D', 'E']
    : ['G1', 'G2', 'G3', 'B1', 'B2', 'B3']
}

export const GRADE_SECTION_PAIRS: { grade: Grade; section: Section }[] =
  GRADES.flatMap((g) => sectionsForGrade(g).map((section) => ({ grade: g, section })))

export const INITIALS = (name: string) =>
  name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
