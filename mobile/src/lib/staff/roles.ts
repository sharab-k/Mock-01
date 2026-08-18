export const STAFF_ROLES = ['admissions_admin', 'attendance_admin', 'marks_admin'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  admissions_admin: 'Admissions Admin',
  attendance_admin: 'Attendance Admin',
  marks_admin: 'Marks Admin',
};
