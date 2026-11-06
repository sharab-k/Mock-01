import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { downloadPhoto } from '@/lib/cards/storage'
import { gradeLabel, sessionLabel, type StudentCardData } from '@/lib/cards/card-data'

// Most cards one PDF may hold. Photos are downscaled for bulk output, so a full
// batch stays well under a serverless response limit.
export const MAX_BULK_CARDS = 100

const BULK_PHOTO = { width: 300, height: 360 } // 5:6, plenty for a 50 mm card at 150 dpi

export type CardStudentRow = {
  id: string
  full_name: string
  roll_number: string
  gr_number: string | null
  registration_number: string
  grade_level: string
  section: string
  academic_year: number
  photo_path: string | null
}

type Parent = { name: string; phone: string }

// The parent shown on the card: the first account linked to the student (oldest
// link first). Uses the service-role client because staff cannot read another
// user's profile row (see lib/supabase/admin.ts); callers have already
// authorised the request.
async function loadParents(studentIds: string[]): Promise<Map<string, Parent>> {
  const out = new Map<string, Parent>()
  if (studentIds.length === 0) return out
  const { data } = await createAdminClient()
    .from('parent_student_links')
    .select('student_id, created_at, profiles(full_name, phone, secondary_phone)')
    .in('student_id', studentIds)
    .order('created_at', { ascending: true })
  for (const row of data ?? []) {
    if (out.has(row.student_id)) continue
    out.set(row.student_id, {
      name: row.profiles?.full_name?.trim() ?? '',
      phone: (row.profiles?.phone || row.profiles?.secondary_phone || '').trim(),
    })
  }
  return out
}

async function cardPhoto(path: string | null, bulk: boolean): Promise<Uint8Array | null> {
  if (!path) return null
  const photo = await downloadPhoto(path)
  if (!photo) return null
  if (!bulk) return new Uint8Array(photo)
  // Loaded only when resizing for a bulk batch — the single card needs no image library.
  const { default: sharp } = await import('sharp')
  const small = await sharp(photo).resize(BULK_PHOTO.width, BULK_PHOTO.height, { fit: 'cover' }).jpeg({ quality: 78, mozjpeg: true }).toBuffer()
  return new Uint8Array(small)
}

// Everything a card prints, for the given students, in the order given.
export async function buildCardData(students: CardStudentRow[], opts: { bulk?: boolean } = {}): Promise<StudentCardData[]> {
  const parents = await loadParents(students.map((s) => s.id))
  const bulk = opts.bulk ?? false

  const out: StudentCardData[] = []
  // A few photos at a time: bounded memory and storage requests for a full batch.
  for (let i = 0; i < students.length; i += 10) {
    const chunk = students.slice(i, i + 10)
    const photos = await Promise.all(chunk.map((s) => cardPhoto(s.photo_path, bulk)))
    chunk.forEach((s, j) => {
      const parent = parents.get(s.id)
      out.push({
        fullName: s.full_name.trim(),
        parentName: parent?.name ?? '',
        registrationNumber: s.registration_number,
        contact: parent?.phone ?? '',
        grNumber: s.gr_number?.trim() || s.roll_number,
        gradeLabel: gradeLabel(s.grade_level),
        section: s.section,
        session: sessionLabel(s.academic_year),
        photoJpeg: photos[j],
      })
    })
  }
  return out
}
