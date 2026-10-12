import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { letterGrade, type LetterGrade } from '@/lib/marks/letter-grade'
import { tierOf, type Tier } from '@/lib/marks/tier'
import { fetchStudentSubjects, type StudentSubjectRow } from '@/lib/actions/subject-enrollments'
import type { Database } from '@/types/supabase'

export type StudentSearchHit = {
  id: string
  fullName: string
  rollNumber: string
  grNumber: string | null
  grade: string
  section: string
  status: string
}

// Characters that have meaning inside a PostgREST .or() filter string (commas
// separate conditions, parens group, % and * are wildcards). Stripped from the
// user's query so typing "Ali, Khan" or "(5)" can neither break the filter nor
// widen it.
function sanitizeQuery(raw: string): string {
  return raw.replace(/[,()%*\\:"]/g, ' ').replace(/\s+/g, ' ').trim()
}

async function requireSuperAdmin(supabase: SupabaseClient<Database>): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'super_admin'
}

// Search any student by name, G.R. number or roll number. Results come back in
// roll-number order, capped so a one-letter query can't pull the whole school.
export async function searchStudents(
  query: string,
  supabaseOverride?: SupabaseClient<Database>,
): Promise<{ ok: true; students: StudentSearchHit[] } | { ok: false; error: string }> {
  const supabase = supabaseOverride ?? await createClient()
  if (!(await requireSuperAdmin(supabase))) return { ok: false, error: 'Not authorized.' }

  const q = sanitizeQuery(query)
  if (q.length < 2) return { ok: true, students: [] }

  const { data, error } = await supabase
    .from('students')
    .select('id, full_name, roll_number, gr_number, grade_level, section, status')
    .is('deleted_at', null)
    .or(`full_name.ilike.%${q}%,gr_number.ilike.%${q}%,roll_number.ilike.%${q}%`)
    .order('roll_sort', { ascending: true })
    .limit(30)
  if (error) return { ok: false, error: 'Search failed. Please try again.' }

  return {
    ok: true,
    students: (data ?? []).map((s) => ({
      id: s.id,
      fullName: s.full_name.trim(),
      rollNumber: s.roll_number,
      grNumber: s.gr_number,
      grade: s.grade_level,
      section: s.section,
      status: s.status,
    })),
  }
}

export type AttendanceDay = { date: string; status: 'present' | 'absent' | 'late' }
export type MarkEntry = {
  id: string
  /** Test date for a class test; the day the mark was entered for the fixed exams. */
  date: string
  subject: string
  title: string
  kind: 'Monthly' | 'Half-Yearly' | 'Final' | 'Class test'
  term: string
  score: number
  max: number
  pct: number
  grade: LetterGrade
}
export type SubjectAverage = { subject: string; average: number; entries: number; grade: LetterGrade }

export type StudentRecord = {
  student: {
    id: string
    fullName: string
    rollNumber: string
    grNumber: string | null
    registrationNumber: string
    grade: string
    section: string
    program: string
    stream: string | null
    status: string
    enrollmentDate: string
    isLateEnrollment: boolean
    address: string | null
    guardianProfession: string | null
    previousSchool: string | null
    lastQualification: string | null
    registrationFee: number | null
    tuitionFee: number | null
  }
  parents: { name: string; email: string; phone: string; secondaryPhone: string | null; whatsapp2: string | null }[]
  subjects: StudentSubjectRow[]
  attendance: {
    days: AttendanceDay[]
    summary: { present: number; absent: number; late: number; total: number; pct: number | null }
  }
  marks: MarkEntry[]
  marksSummary: { average: number | null; tier: Tier | null; grade: LetterGrade | null; bySubject: SubjectAverage[] }
  fees: { year: number; month: number; status: string }[]
}

const KIND: Record<string, MarkEntry['kind']> = { monthly: 'Monthly', half_yearly: 'Half-Yearly', final: 'Final', custom: 'Class test' }

// PostgREST caps a response at 1000 rows; a long-enrolled student's attendance
// can approach that, so page through instead of silently truncating "all time".
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999)
    if (error) throw error
    out.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return out
}

// Everything on file for one student, up to today: profile, every attendance
// day, every mark of every test (fixed exams and class tests) with its date,
// subject averages, fee history, subjects and the linked parents' contacts.
// Super Admin only — RLS scopes the student/attendance/marks reads, and the
// parent contact lookup (service role) is gated by the explicit role check.
export async function fetchStudentRecord(
  studentId: string,
  supabaseOverride?: SupabaseClient<Database>,
): Promise<{ ok: true; record: StudentRecord } | { ok: false; error: string }> {
  const supabase = supabaseOverride ?? await createClient()
  if (!(await requireSuperAdmin(supabase))) return { ok: false, error: 'Not authorized.' }

  const { data: s } = await supabase
    .from('students')
    .select('id, full_name, roll_number, gr_number, registration_number, grade_level, section, program, stream, status, enrollment_date, is_late_enrollment, address, guardian_profession, previous_school, last_qualification, registration_fee, tuition_fee')
    .eq('id', studentId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!s) return { ok: false, error: 'Student not found.' }

  const admin = createAdminClient()
  const [attRows, markRows, feeRes, parentRes, subjectsRes] = await Promise.all([
    fetchAll((from, to) => supabase.from('attendance_records').select('class_date, status').eq('student_id', studentId).order('class_date', { ascending: false }).range(from, to)),
    fetchAll((from, to) => supabase.from('marks').select('id, subject, exam_type, score, max_score, term, created_at, tests(title, test_date)').eq('student_id', studentId).range(from, to)),
    supabase.from('fee_payments').select('year, month, status').eq('student_id', studentId).order('year', { ascending: false }).order('month', { ascending: false }),
    admin.from('parent_student_links').select('profiles(full_name, email, phone, secondary_phone, whatsapp_number_2)').eq('student_id', studentId),
    fetchStudentSubjects(studentId, supabase),
  ])

  const days: AttendanceDay[] = attRows.map((r) => ({ date: r.class_date, status: r.status as AttendanceDay['status'] }))
  const present = days.filter((d) => d.status === 'present').length
  const late = days.filter((d) => d.status === 'late').length
  const absent = days.filter((d) => d.status === 'absent').length
  const total = days.length

  const marks: MarkEntry[] = markRows
    .map((m) => {
      const pct = Math.round((m.score / m.max_score) * 10000) / 100
      return {
        id: m.id,
        date: m.exam_type === 'custom' && m.tests?.test_date ? m.tests.test_date : m.created_at.slice(0, 10),
        subject: m.subject,
        title: m.exam_type === 'custom' ? (m.tests?.title ?? 'Class test') : (KIND[m.exam_type] ?? m.exam_type),
        kind: KIND[m.exam_type] ?? 'Class test',
        term: m.term,
        score: m.score,
        max: m.max_score,
        pct,
        grade: letterGrade(m.score, m.max_score),
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.subject.localeCompare(b.subject))

  const average = marks.length > 0 ? Math.round(marks.reduce((a, m) => a + m.pct, 0) / marks.length) : null
  const bySubjectMap = new Map<string, { sum: number; n: number }>()
  for (const m of marks) {
    const cur = bySubjectMap.get(m.subject) ?? { sum: 0, n: 0 }
    cur.sum += m.pct
    cur.n++
    bySubjectMap.set(m.subject, cur)
  }
  const bySubject = Array.from(bySubjectMap, ([subject, v]) => {
    const avg = Math.round(v.sum / v.n)
    return { subject, average: avg, entries: v.n, grade: letterGrade(avg, 100) }
  }).sort((a, b) => a.subject.localeCompare(b.subject))

  return {
    ok: true,
    record: {
      student: {
        id: s.id,
        fullName: s.full_name.trim(),
        rollNumber: s.roll_number,
        grNumber: s.gr_number,
        registrationNumber: s.registration_number,
        grade: s.grade_level,
        section: s.section,
        program: s.program,
        stream: s.stream,
        status: s.status,
        enrollmentDate: s.enrollment_date,
        isLateEnrollment: s.is_late_enrollment,
        address: s.address,
        guardianProfession: s.guardian_profession,
        previousSchool: s.previous_school,
        lastQualification: s.last_qualification,
        registrationFee: s.registration_fee,
        tuitionFee: s.tuition_fee,
      },
      parents: (parentRes.data ?? []).flatMap((l) => (l.profiles ? [{
        name: l.profiles.full_name ?? '—',
        email: l.profiles.email,
        phone: l.profiles.phone ?? '—',
        secondaryPhone: l.profiles.secondary_phone,
        whatsapp2: l.profiles.whatsapp_number_2,
      }] : [])),
      subjects: subjectsRes.ok ? subjectsRes.subjects.filter((x) => x.enrolled) : [],
      attendance: { days, summary: { present, absent, late, total, pct: total > 0 ? Math.round(((present + late) / total) * 100) : null } },
      marks,
      marksSummary: { average, tier: average !== null ? tierOf(average) : null, grade: average !== null ? letterGrade(average, 100) : null, bySubject },
      fees: (feeRes.data ?? []).map((f) => ({ year: f.year, month: f.month, status: f.status })),
    },
  }
}
