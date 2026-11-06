import { describe, expect, it } from 'vitest'
import {
  ALL_SUBJECTS, FACULTIES, SUBJECTS_BY_FACULTY, facultiesForSubject, isUnplaced, studentInSubjectList, subjectsForFaculty,
} from '../first-year-subjects'

const PE = 'Pre-Engineering'
const PM = 'Pre-Medical'
const CS = 'Computer Science'

// Who appears in the list for a subject, over one student of each faculty.
function listed(subject: string, faculty: (typeof FACULTIES)[number] | null = null) {
  return [PE, PM, CS].filter((stream) => studentInSubjectList(stream, subject, faculty))
}

describe('First Year subject lists (document §5)', () => {
  it('Physics shows all three faculties', () => expect(listed('Physics')).toEqual([PE, PM, CS]))
  it('Mathematics shows Pre-Engineering and Computer Science only', () => expect(listed('Mathematics')).toEqual([PE, CS]))
  it('Chemistry shows Pre-Engineering and Pre-Medical only', () => expect(listed('Chemistry')).toEqual([PE, PM]))
  it('Biology shows Pre-Medical only', () => expect(listed('Biology')).toEqual([PM]))
  it('Computer Science shows Computer Science only', () => expect(listed('Computer Science')).toEqual([CS]))
  it.each(['English', 'Urdu', 'Islamiat'])('%s shows every faculty', (subject) => expect(listed(subject)).toEqual([PE, PM, CS]))
})

describe('faculty narrowing', () => {
  it('a chosen faculty only lists its own students', () => {
    expect(listed('Physics', PM)).toEqual([PM])
    expect(listed('Mathematics', CS)).toEqual([CS])
  })
  it('a faculty that does not study the subject lists nobody', () => {
    expect(listed('Biology', PE)).toEqual([])
    expect(listed('Computer Science', PM)).toEqual([])
  })
})

describe('subject menus (document §3)', () => {
  it('each faculty has six subjects and every one is a known subject', () => {
    for (const f of FACULTIES) {
      expect(SUBJECTS_BY_FACULTY[f]).toHaveLength(6)
      for (const s of SUBJECTS_BY_FACULTY[f]) expect(ALL_SUBJECTS).toContain(s)
    }
  })
  it('Pre-Engineering studies Mathematics but not Biology', () => {
    expect(subjectsForFaculty(PE)).toContain('Mathematics')
    expect(subjectsForFaculty(PE)).not.toContain('Biology')
  })
  it('with no faculty chosen every subject is offered', () => expect(subjectsForFaculty(null)).toEqual(ALL_SUBJECTS))
  it('Biology belongs to Pre-Medical alone', () => expect(facultiesForSubject('Biology')).toEqual([PM]))
})

describe('students whose faculty is not set', () => {
  it('appear for subjects every faculty takes', () => {
    for (const s of ['Physics', 'English', 'Urdu', 'Islamiat']) expect(studentInSubjectList(null, s, null)).toBe(true)
  })
  it('cannot be placed in a faculty-specific subject, and are reported as unplaced', () => {
    for (const s of ['Mathematics', 'Chemistry', 'Biology', 'Computer Science']) {
      expect(studentInSubjectList(null, s, null)).toBe(false)
      expect(isUnplaced(null, s)).toBe(true)
    }
    expect(isUnplaced(null, 'Physics')).toBe(false)
  })
  it('never appear once a faculty is chosen', () => expect(studentInSubjectList(null, 'Physics', PE)).toBe(false))
  it('a student in another stream (Commerce) takes none of these subjects', () => {
    for (const s of ALL_SUBJECTS) {
      expect(studentInSubjectList('Commerce', s, null)).toBe(false)
      expect(isUnplaced('Commerce', s)).toBe(false)
    }
  })
})
