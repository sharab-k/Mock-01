import { NextResponse } from 'next/server'
import { z } from 'zod'

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

  // TODO: persist to admission_enquiries table once Supabase is wired up
  // For now, log and return success so the form is usable during dev
  console.info('[enquiry]', parsed.data)

  return NextResponse.json({ success: true }, { status: 201 })
}
