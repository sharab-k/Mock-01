import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authorizeCard, loadCardStudent } from '@/lib/cards/access'
import { groupsForGrade, isGroupForGrade } from '@/lib/cards/groups'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveRequestClient } from '@/lib/supabase/session'
import { logAction } from '@/lib/audit/log'

export const runtime = 'nodejs'

// The group printed on a student's ID card. It has to be chosen before the card can be generated:
// a parent chooses it once, and only the Super Admin can change it afterwards (the same rule as the photo).

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeCard(request, params)
  if ('error' in auth) return auth.error
  const student = await loadCardStudent(auth.studentId)
  if (!student) return NextResponse.json({ error: 'Student not found.' }, { status: 404 })

  const group = student.card_group && isGroupForGrade(student.grade_level, student.card_group) ? student.card_group : null
  return NextResponse.json({
    group,
    options: groupsForGrade(student.grade_level),
    canChange: auth.actor.role === 'super_admin' || group === null,
  })
}

const BodySchema = z.object({ group: z.string().min(1).max(40) })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeCard(request, params)
  if ('error' in auth) return auth.error
  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Choose a group.' }, { status: 400 })

  const student = await loadCardStudent(auth.studentId)
  if (!student) return NextResponse.json({ error: 'Student not found.' }, { status: 404 })
  const group = parsed.data.group
  if (!isGroupForGrade(student.grade_level, group)) {
    return NextResponse.json({ error: `For this class the group must be one of: ${groupsForGrade(student.grade_level).join(', ')}.` }, { status: 400 })
  }

  // The write uses the service role after the checks above. For a parent it is conditional on the group still
  // being empty, so two parallel requests cannot both win and a chosen group cannot be overwritten.
  let query = createAdminClient().from('students').update({ card_group: group }).eq('id', student.id)
  if (auth.actor.role === 'parent') query = query.is('card_group', null)
  const { data, error } = await query.select('id').maybeSingle()
  if (error) return NextResponse.json({ error: 'Could not save the group.' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'The group has already been chosen. Ask the academy office to change it.' }, { status: 409 })

  const supabase = await resolveRequestClient(request)
  await logAction(supabase, auth.actor.userId, `${student.card_group ? 'Changed' : 'Set'} ID card group - ${student.full_name} · ${student.roll_number} · ${group}`)
  return NextResponse.json({ ok: true, group })
}
