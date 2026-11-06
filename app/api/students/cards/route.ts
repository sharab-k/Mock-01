import { NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveRequestClient } from '@/lib/supabase/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { MAX_BULK_CARDS, buildCardData } from '@/lib/cards/build'
import { renderStudentCardsPdf } from '@/lib/cards/student-card'

export const runtime = 'nodejs'

const BodySchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(MAX_BULK_CARDS) })

// Bulk ID cards: one PDF with a front and back page per student, in the order the
// ids were sent (the list's G.R.-number order). Super Admin only — a parent can
// only ever download their own child's card from the single-card route.
export async function POST(request: Request) {
  const supabase = await resolveRequestClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: `Choose between 1 and ${MAX_BULK_CARDS} students.` }, { status: 400 })
  const ids = Array.from(new Set(parsed.data.ids))

  const { data } = await createAdminClient()
    .from('students')
    .select('id, full_name, roll_number, gr_number, registration_number, grade_level, section, academic_year, photo_path')
    .in('id', ids)
    .is('deleted_at', null)
  const byId = new Map((data ?? []).map((s) => [s.id, s]))
  const students = ids.flatMap((id) => byId.get(id) ?? [])
  if (students.length === 0) return NextResponse.json({ error: 'No matching students.' }, { status: 404 })

  const pdf = await renderStudentCardsPdf(await buildCardData(students, { bulk: true }))
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="id-cards.pdf"',
      'Cache-Control': 'private, no-store',
    },
  })
}
