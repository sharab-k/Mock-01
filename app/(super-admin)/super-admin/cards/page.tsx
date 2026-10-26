import StudentCardsContent, { type CardStudent } from '@/components/dashboard/modules/StudentCardsContent'
import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/db/fetch-all'
import { GRADES } from '@/lib/students/constants'

export default async function SuperAdminStudentCardsPage() {
  const supabase = await createClient()
  const now = new Date()

  // Only the columns the list shows — the directory's full records are not needed
  // here — in grade, then G.R. number order (students.list_sort). Absence of a fee
  // row means unpaid, same convention as the Students page.
  const [rows, { data: payments }] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase
        .from('students')
        .select('id, roll_number, full_name, grade_level, section, status, gr_number')
        .is('deleted_at', null)
        .order('list_sort', { ascending: true })
        .order('id')
        .range(from, to),
    ),
    supabase.from('fee_payments').select('student_id, status').eq('year', now.getFullYear()).eq('month', now.getMonth() + 1),
  ])
  const feeByStudent = new Map((payments ?? []).map((p) => [p.student_id, p.status]))

  const students: CardStudent[] = rows.map((s) => ({
    id: s.id,
    full_name: s.full_name.trim(),
    gr_number: s.gr_number?.trim() || null,
    roll_number: s.roll_number,
    grade: s.grade_level,
    section: s.section,
    status: s.status === 'active' ? 'Active' : 'Inactive',
    fee_status: feeByStudent.get(s.id) === 'paid' ? 'paid' : 'unpaid',
  }))

  return <StudentCardsContent students={students} grades={GRADES} />
}
