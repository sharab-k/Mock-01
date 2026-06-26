// Run `npx supabase gen types typescript --local > types/supabase.ts` once Supabase is initialised.
// Minimal hand-written stub so TypeScript compiles before the DB is set up.
// Never hand-edit the real generated file.

export type UserRole =
  | 'super_admin'
  | 'admissions_admin'
  | 'attendance_admin'
  | 'marks_admin'
  | 'teacher'
  | 'student'
  | 'parent'

export type ProfileRow = {
  id: string
  role: UserRole
  full_name: string | null
  phone: string | null
  email: string
  created_at: string
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: Omit<ProfileRow, 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<ProfileRow>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
    }
    CompositeTypes: Record<string, never>
  }
}
