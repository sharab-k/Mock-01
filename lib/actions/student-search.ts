'use server'

import { searchStudents, type StudentSearchHit } from '@/lib/students/record'

// Thin Server Action wrapper so the search box can call it from the client.
// Authorization (Super Admin only) lives in searchStudents itself.
export async function searchStudentsAction(query: string): Promise<{ ok: true; students: StudentSearchHit[] } | { ok: false; error: string }> {
  return searchStudents(query)
}
