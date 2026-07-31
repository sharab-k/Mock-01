import type { Database } from '@/types/supabase'

export type UserRole = Database['public']['Enums']['user_role']

// Single source of truth for "which portal root does this role land on."
// Used by the login Server Action (post-credential redirect), middleware
// (convenience redirect for an already-signed-in user hitting / or /login),
// and requireRole() (bounce a wrong-role visitor to their own portal).
// No `teacher` entry — that role was removed from the app; there's no
// (teacher) route group to redirect into.
export const ROLE_DESTINATIONS: Record<UserRole, string> = {
  super_admin:      '/super-admin',
  admissions_admin: '/admissions',
  attendance_admin: '/attendance',
  marks_admin:      '/marks',
  student:          '/student',
  parent:           '/parent',
}
