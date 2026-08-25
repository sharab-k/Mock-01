import { NextResponse } from 'next/server'
import { authenticateBearerRequest } from '@/lib/supabase/bearer'
import { fetchParentEditContactsByStudentId } from '@/lib/admissions/parent-lookup'

// Full student directory for the mobile Student Directory screen — mirrors
// app/(super-admin)/super-admin/students/page.tsx's data shape exactly, so
// the mobile screen can reuse the same field set (full admission-form edit,
// login credentials). Role-gated here since there's no (super-admin) layout
// guard for an API route.
export async function GET(request: Request) {
  const auth = await authenticateBearerRequest(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { data: profile } = await auth.supabase.from('profiles').select('role').eq('id', auth.userId).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })

  const { data: rows } = await auth.supabase
    .from('students')
    .select(`
      id, roll_number, registration_number, full_name, grade_level, section, program, status,
      enrollment_date, is_late_enrollment, guardian_profession, previous_school, last_qualification,
      address, gr_number, registration_fee, tuition_fee, stream
    `)
    .is('deleted_at', null)
    .order('gr_number', { ascending: true })

  const studentIds = (rows ?? []).map((s) => s.id)
  const contactByStudent = await fetchParentEditContactsByStudentId(studentIds)

  const now = new Date()
  const { data: payments } = await auth.supabase
    .from('fee_payments')
    .select('student_id, status')
    .eq('year', now.getFullYear())
    .eq('month', now.getMonth() + 1)
  const feeStatusByStudent = new Map((payments ?? []).map((p) => [p.student_id, p.status]))

  const students = (rows ?? []).map((s) => ({
    id: s.id,
    roll_number: s.roll_number,
    registration_number: s.registration_number,
    full_name: s.full_name,
    grade: s.grade_level,
    section: s.section,
    program: s.program,
    status: s.status === 'active' ? 'Active' : 'Inactive',
    enrollment_date: s.enrollment_date,
    is_late_enrollment: s.is_late_enrollment,
    parent_id: contactByStudent.get(s.id)?.id ?? null,
    parent_name: contactByStudent.get(s.id)?.name ?? '—',
    parent_email: contactByStudent.get(s.id)?.email ?? null,
    parent_phone: contactByStudent.get(s.id)?.phone ?? '—',
    guardian_profession: s.guardian_profession,
    previous_school: s.previous_school,
    last_qualification: s.last_qualification,
    address: s.address,
    gr_number: s.gr_number,
    registration_fee: s.registration_fee,
    tuition_fee: s.tuition_fee,
    stream: s.stream,
    fee_status: feeStatusByStudent.get(s.id) ?? 'unpaid',
  }))

  return NextResponse.json({ students })
}
