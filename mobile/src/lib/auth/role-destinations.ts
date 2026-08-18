import type { Database } from '@/types/supabase';

export type UserRole = Database['public']['Enums']['user_role'];

// Mirrors the web app's lib/auth/role-destinations.ts exactly — same role,
// same path string. No `(group)` prefix: Expo Router route groups are
// invisible in the URL just like Next's, so the actual path comes from the
// folder inside each group (app/(attendance)/attendance/index.tsx -> /attendance).
// No independent student login exists (CLAUDE.md §4) — `student` never gets
// assigned in practice, but maps to /parent for the same reason the web does.
export const ROLE_DESTINATIONS: Record<UserRole, string> = {
  super_admin: '/super-admin',
  admissions_admin: '/admissions',
  attendance_admin: '/attendance',
  marks_admin: '/marks',
  student: '/parent',
  parent: '/parent',
};
