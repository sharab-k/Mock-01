import type { UserRole } from './role-destinations';
import type { PortalRole } from '@/constants/theme';

// Mirrors the web app's lib/auth/role-meta.ts labels. `student` reuses the
// same entry as `parent` for the color/RoleColors key since there's no
// separate student portal color and no role is ever actually 'student'.
export const ROLE_META: Record<UserRole, { label: string; portalRole: PortalRole }> = {
  super_admin: { label: 'Super Admin', portalRole: 'super_admin' },
  admissions_admin: { label: 'Admissions', portalRole: 'admissions_admin' },
  attendance_admin: { label: 'Attendance', portalRole: 'attendance_admin' },
  marks_admin: { label: 'Marks', portalRole: 'marks_admin' },
  student: { label: 'Student', portalRole: 'student' },
  parent: { label: 'Parent', portalRole: 'parent' },
};
