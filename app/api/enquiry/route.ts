import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const EnquirySchema = z.object({
  student_name: z.string().min(1).max(200),
  parent_phone: z.string().min(1).max(20),
  program_interest: z.enum(['Primary Years', 'Middle School', 'Matriculation', 'Intermediate']),
  message: z.string().max(2000).optional(),
})

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = EnquirySchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = await createClient()

  // admission_enquiries' public_insert RLS policy (anon role, INSERT-only,
  // no select/update/delete) is what actually authorizes this — the public
  // form can never read back other families' enquiries.
  //
  // The public form only asks for the enrolling student's name and a broad
  // programme stage (not a specific grade) — admission_enquiries' parent_name
  // / grade_interest columns predate this form (built for the staff-facing
  // inbox). We store the submitted name as the contact name and leave grade
  // unspecified rather than guessing.
  const { error } = await supabase.from('admission_enquiries').insert({
    parent_name: parsed.data.student_name,
    parent_phone: parsed.data.parent_phone,
    grade_interest: 'Not specified',
    program_interest: parsed.data.program_interest,
    message: parsed.data.message || null,
  })

  if (error) {
    return NextResponse.json({ error: 'Could not submit enquiry.' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
