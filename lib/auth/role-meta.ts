import type { UserRole } from './role-destinations'

// Display label + role-identity color per CLAUDE.md §6 (role.* tokens) — used
// to build the UserInfo the sidebar/topbar render, derived from the real
// signed-in profile instead of a hardcoded MOCK_USER per route group.
export const ROLE_META: Record<UserRole, { label: string; color: string }> = {
  super_admin:      { label: 'Super Admin', color: '#233357' },
  admissions_admin: { label: 'Admissions',  color: '#A26D53' },
  attendance_admin: { label: 'Attendance',  color: '#487A63' },
  marks_admin:      { label: 'Marks',       color: '#7E587E' },
  student:          { label: 'Student',     color: '#547B96' },
  parent:           { label: 'Parent',      color: '#988671' },
}
