import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { logAction } from '@/lib/audit/log'
import { loadStudentLookup, resolveStudent } from '@/lib/uploads/students'
import { parseDate, pick, todayIso, type SheetRow } from '@/lib/uploads/sheet'
import type { UploadRowError } from '@/lib/marks/upload'

export type AttendanceUploadResult = {
  totalRows: number
  saved: number
  absent: number
  skipped: number
  errors: UploadRowError[]
}

const GR_COLS = ['grno', 'grnumber', 'gr', 'grn', 'registrationno']
const ROLL_COLS = ['rollno', 'rollnumber', 'roll']
const DATE_COLS = ['date', 'classdate', 'attendancedate']
const STATUS_COLS = ['status', 'attendance', 'mark']

const STATUS: Record<string, 'present' | 'absent' | 'late'> = {
  present: 'present', p: 'present', pr: 'present',
  absent: 'absent', a: 'absent', ab: 'absent',
  late: 'late', l: 'late',
}

// Validates and saves an attendance spreadsheet (one row = one student on one
// day). Dates may be in the past, so a missed week can be loaded in one go.
// Saved with a single upsert per chunk keyed on (student, day): re-uploading
// corrects earlier marks. The database trigger raises the parent's portal
// absence notice whenever a row newly becomes 'absent', so nothing extra is
// sent from here.
export async function processAttendanceUpload(
  supabase: SupabaseClient<Database>,
  userId: string,
  rows: SheetRow[],
): Promise<AttendanceUploadResult> {
  const errors: UploadRowError[] = []
  const today = todayIso()
  const lookup = await loadStudentLookup(supabase, rows.map((r) => pick(r.cells, GR_COLS)), rows.map((r) => pick(r.cells, ROLL_COLS)))

  const records = new Map<string, { student_id: string; class_date: string; status: 'present' | 'absent' | 'late'; marked_by: string }>()
  for (const r of rows) {
    const fail = (message: string) => errors.push({ row: r.rowNumber, message })
    const resolved = resolveStudent(lookup, pick(r.cells, GR_COLS), pick(r.cells, ROLL_COLS))
    if (!resolved.ok) { fail(resolved.error); continue }

    const dateRaw = pick(r.cells, DATE_COLS)
    const classDate = parseDate(dateRaw)
    if (!classDate) { fail(`Date is missing or not valid (got "${dateRaw || 'blank'}"). Use DD/MM/YYYY or YYYY-MM-DD.`); continue }
    if (classDate > today) { fail(`Date ${classDate} is in the future.`); continue }

    const statusRaw = pick(r.cells, STATUS_COLS)
    const status = STATUS[statusRaw.toLowerCase().replace(/[^a-z]/g, '')]
    if (!status) { fail(`Status must be Present, Absent or Late (got "${statusRaw || 'blank'}").`); continue }

    const key = `${resolved.student.id}|${classDate}`
    if (records.has(key)) { fail(`Duplicate: ${resolved.student.fullName} already appears for ${classDate}.`); continue }
    records.set(key, { student_id: resolved.student.id, class_date: classDate, status, marked_by: userId })
  }

  const all = Array.from(records.values())
  let saved = 0
  let absent = 0
  for (let i = 0; i < all.length; i += 500) {
    const chunk = all.slice(i, i + 500)
    const { error } = await supabase.from('attendance_records').upsert(chunk, { onConflict: 'student_id,class_date' })
    if (error) {
      errors.push({ row: 0, message: `A batch of ${chunk.length} records could not be saved. Please try the upload again.` })
      continue
    }
    saved += chunk.length
    absent += chunk.filter((c) => c.status === 'absent').length
  }

  if (saved > 0) await logAction(supabase, userId, `Attendance spreadsheet upload — ${saved} records`)

  errors.sort((a, b) => a.row - b.row)
  return { totalRows: rows.length, saved, absent, skipped: errors.length, errors: errors.slice(0, 100) }
}
