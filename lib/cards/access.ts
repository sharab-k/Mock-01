import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveRequestClient } from '@/lib/supabase/session'
import { createAdminClient } from '@/lib/supabase/admin'

const ParamsSchema = z.object({ id: z.string().uuid() })

export type CardActor = { userId: string; role: 'super_admin' | 'parent' }

// Who may touch a student's ID card: a Super Admin, or a parent linked to that
// student. Every other role (and any other parent) is refused.
export async function authorizeCard(
  request: Request,
  params: Promise<{ id: string }>,
): Promise<{ studentId: string; actor: CardActor } | { error: NextResponse }> {
  const parsed = ParamsSchema.safeParse(await params)
  if (!parsed.success) return { error: NextResponse.json({ error: 'Invalid student id.' }, { status: 400 }) }

  const supabase = await resolveRequestClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Not signed in.' }, { status: 401 }) }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const studentId = parsed.data.id
  if (profile?.role === 'super_admin') return { studentId, actor: { userId: user.id, role: 'super_admin' } }

  if (profile?.role === 'parent') {
    const { data: link } = await supabase
      .from('parent_student_links').select('student_id')
      .eq('parent_id', user.id).eq('student_id', studentId).maybeSingle()
    if (link) return { studentId, actor: { userId: user.id, role: 'parent' } }
  }
  return { error: NextResponse.json({ error: 'Not authorized for this student.' }, { status: 403 }) }
}

export async function loadCardStudent(studentId: string) {
  const { data } = await createAdminClient()
    .from('students')
    .select('id, full_name, roll_number, gr_number, grade_level, section, academic_year, photo_path, deleted_at')
    .eq('id', studentId)
    .maybeSingle()
  return data && !data.deleted_at ? data : null
}
