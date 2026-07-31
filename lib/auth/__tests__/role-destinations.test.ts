import { describe, expect, it } from 'vitest'
import { ROLE_DESTINATIONS } from '../role-destinations'
import { ROLE_META } from '../role-meta'

// The exact 6 roles per CLAUDE.md §4 — no `teacher`. Hardcoded here rather
// than derived from the enum so this test fails loudly if someone adds a
// role to the DB without updating the app-side maps, or vice versa.
const EXPECTED_ROLES = [
  'super_admin',
  'admissions_admin',
  'attendance_admin',
  'marks_admin',
  'student',
  'parent',
] as const

describe('role maps stay in sync with the 6-role model', () => {
  it('ROLE_DESTINATIONS has exactly the expected roles, each pointing at a route group', () => {
    expect(Object.keys(ROLE_DESTINATIONS).sort()).toEqual([...EXPECTED_ROLES].sort())
    for (const role of EXPECTED_ROLES) {
      expect(ROLE_DESTINATIONS[role]).toMatch(/^\/[a-z-]+$/)
    }
  })

  it('ROLE_META has exactly the expected roles, each with a label and a hex color', () => {
    expect(Object.keys(ROLE_META).sort()).toEqual([...EXPECTED_ROLES].sort())
    for (const role of EXPECTED_ROLES) {
      expect(ROLE_META[role].label.length).toBeGreaterThan(0)
      expect(ROLE_META[role].color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('never reintroduces the removed teacher role', () => {
    expect('teacher' in ROLE_DESTINATIONS).toBe(false)
    expect('teacher' in ROLE_META).toBe(false)
  })
})
