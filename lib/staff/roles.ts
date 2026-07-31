// Plain constants, deliberately kept out of lib/actions/staff.ts — a
// 'use server' file may only export async functions, so shared non-function
// values (role list, display labels) live here instead.
export const STAFF_ROLES = ['admissions_admin', 'attendance_admin', 'marks_admin'] as const
export type StaffRole = (typeof STAFF_ROLES)[number]

export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  admissions_admin: 'Admissions Admin',
  attendance_admin: 'Attendance Admin',
  marks_admin: 'Marks Admin',
}
