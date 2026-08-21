export type Grade = '9' | '10' | '11' | '12' | 'ICOM-1' | 'ICOM-2';
export type Section = 'A' | 'B' | 'C' | 'D' | 'E' | 'G1' | 'G2' | 'G3' | 'B1' | 'B2' | 'B3';
export type Program = 'SSC-1' | 'SSC-2' | 'HSC-1' | 'HSC-2' | 'ICOM-1' | 'ICOM-2';

// ICOM-1/ICOM-2 (Intermediate in Commerce) follow on after grade 12, as the
// next level up — a 2-year track in its own right, not a 13th/14th numeric
// grade, so the grade value and programme label are the same string.
export const GRADES: Grade[] = ['9', '10', '11', '12', 'ICOM-1', 'ICOM-2'];

// SSC = Matriculation (grades 9-10), HSC = Intermediate (grades 11-12). The
// programme choice IS the grade choice now (no separate grade picker).
export const PROGRAMS: Program[] = ['SSC-1', 'SSC-2', 'HSC-1', 'HSC-2', 'ICOM-1', 'ICOM-2'];

export const PROGRAM_GRADE: Record<Program, Grade> = {
  'SSC-1': '9',
  'SSC-2': '10',
  'HSC-1': '11',
  'HSC-2': '12',
  'ICOM-1': 'ICOM-1',
  'ICOM-2': 'ICOM-2',
};

// Grades sharing 11-12's co-ed lettered scheme (A-E) rather than 9-10's
// gender-split numbered one (G1-G3/B1-B3) — ICOM-1/ICOM-2 included, per the
// same co-ed convention as Intermediate.
const COED_GRADES: Grade[] = ['11', '12', 'ICOM-1', 'ICOM-2'];

export function sectionsForGrade(grade: Grade): Section[] {
  return COED_GRADES.includes(grade)
    ? ['A', 'B', 'C', 'D', 'E']
    : ['G1', 'G2', 'G3', 'B1', 'B2', 'B3'];
}

export const GRADE_SECTION_PAIRS: { grade: Grade; section: Section }[] =
  GRADES.flatMap((g) => sectionsForGrade(g).map((section) => ({ grade: g, section })));

export const INITIALS = (name: string) =>
  name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
