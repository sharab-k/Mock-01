// Canonical student roster shared across every dashboard's directory/list views.
// TODO: replace with a paginated Supabase query against the `students` table.

export type Grade = '9' | '10' | '11' | '12'
export type Section = 'A' | 'B' | 'C' | 'D'
export type StudentStatus = 'Active' | 'Inactive'

export type Student = {
  id: string
  roll_number: string
  full_name: string
  grade: Grade
  section: Section
  program: string
  status: StudentStatus
  enrollment_date: string
  is_late_enrollment: boolean
  avg_score: number
  attendance_pct: number
  parent_name: string
  parent_phone: string
}

export const GRADES: Grade[] = ['9', '10', '11', '12']
export const SECTIONS: Section[] = ['A', 'B', 'C', 'D']

const PROGRAM_BY_GRADE: Record<Grade, string> = {
  '9': 'Matriculation',
  '10': 'Matriculation',
  '11': 'Intermediate',
  '12': 'Intermediate',
}

// Real per-class enrolment totals — matches the counts already shown in the
// Admissions/Attendance/Marks dashboard grids (448 students school-wide).
export const GRADE_SECTION_TOTALS: Record<Grade, Record<Section, number>> = {
  '9': { A: 30, B: 28, C: 32, D: 26 },
  '10': { A: 31, B: 27, C: 29, D: 33 },
  '11': { A: 28, B: 30, C: 26, D: 29 },
  '12': { A: 24, B: 27, C: 25, D: 23 },
}

export const TOTAL_ENROLLED = Object.values(GRADE_SECTION_TOTALS)
  .flatMap((g) => Object.values(g))
  .reduce((a, b) => a + b, 0)

// Representative sample roster — 3 named students per section (48 total) used
// to populate directory/list pages. Real deployment paginates the full 448.
const NAMES: [string, string][] = [
  ['Ahmed Ali', 'Ali Hassan'], ['Sara Khan', 'Khalid Khan'], ['Bilal Raza', 'Raza Mehmood'],
  ['Fatima Noor', 'Noor Ahmed'], ['Hina Baig', 'Baig Sarwar'], ['Kamran Malik', 'Malik Yousuf'],
  ['Sana Mir', 'Mir Iqbal'], ['Dawood Ilyas', 'Ilyas Sheikh'], ['Tariq Ansari', 'Ansari Nadeem'],
  ['Amna Farooq', 'Farooq Ahmed'], ['Zara Hussain', 'Hussain Abbas'], ['Usman Sheikh', 'Sheikh Rafiq'],
  ['Mahnoor Iqbal', 'Iqbal Rasheed'], ['Hamza Siddiqui', 'Siddiqui Anwar'], ['Ayesha Tariq', 'Tariq Mahmood'],
  ['Owais Qureshi', 'Qureshi Salman'], ['Rabia Aslam', 'Aslam Nasir'], ['Junaid Baloch', 'Baloch Aftab'],
  ['Mariam Yousafzai', 'Yousafzai Karim'], ['Fahad Rehman', 'Rehman Zafar'], ['Nadia Chaudhry', 'Chaudhry Waseem'],
  ['Saad Hashmi', 'Hashmi Imran'], ['Iqra Zaidi', 'Zaidi Farhan'], ['Bilawal Shah', 'Shah Nawaz'],
  ['Anum Riaz', 'Riaz Sultan'], ['Waleed Aziz', 'Aziz Kamal'], ['Sidra Nawaz', 'Nawaz Hameed'],
  ['Haris Javed', 'Javed Iftikhar'], ['Komal Sultana', 'Sultana Bashir'], ['Ali Raza', 'Raza Iqbal'],
  ['Mehak Farhan', 'Farhan Shakeel'], ['Osama Tahir', 'Tahir Naeem'], ['Warda Ahsan', 'Ahsan Rauf'],
  ['Shayan Latif', 'Latif Qadir'], ['Nimra Saleem', 'Saleem Aziz'], ['Talha Zafar', 'Zafar Hussain'],
  ['Areeba Nasir', 'Nasir Jamil'], ['Ibrahim Qadir', 'Qadir Shafiq'], ['Laiba Shafiq', 'Shafiq Rehman'],
  ['Zain Abbas', 'Abbas Ghouri'], ['Rimsha Ghouri', 'Ghouri Basit'], ['Danish Rauf', 'Rauf Siraj'],
  ['Aiman Basit', 'Basit Farooqi'], ['Hassan Siraj', 'Siraj Alam'], ['Noreen Alam', 'Alam Wahab'],
  ['Salman Wahab', 'Wahab Kayani'], ['Farah Kayani', 'Kayani Idrees'],
]

function buildRoster(): Student[] {
  const roster: Student[] = []
  let nameIdx = 0
  let rollSeq = 1

  for (const grade of GRADES) {
    for (const section of SECTIONS) {
      for (let i = 0; i < 3; i++) {
        const [full_name, parent_name] = NAMES[nameIdx % NAMES.length]
        nameIdx++
        const roll_number = `JE-2026-${String(rollSeq).padStart(3, '0')}`
        rollSeq++
        const avg_score = 55 + ((rollSeq * 7) % 40)
        const attendance_pct = 78 + ((rollSeq * 5) % 20)
        const isLate = rollSeq % 11 === 0
        const isInactive = rollSeq % 23 === 0

        roster.push({
          id: roll_number,
          roll_number,
          full_name,
          grade,
          section,
          program: PROGRAM_BY_GRADE[grade],
          status: isInactive ? 'Inactive' : 'Active',
          enrollment_date: `${5 + (rollSeq % 20)} Jan 2026`,
          is_late_enrollment: isLate,
          avg_score,
          attendance_pct,
          parent_name,
          parent_phone: `03${(rollSeq % 9) + 1}${String(1000000 + rollSeq * 37).slice(0, 7)}`,
        })
      }
    }
  }

  return roster
}

export const STUDENTS: Student[] = buildRoster()

export function studentsByGradeSection(grade: string, section: string): Student[] {
  return STUDENTS.filter((s) => s.grade === grade && s.section === section)
}

export const INITIALS = (name: string) =>
  name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
