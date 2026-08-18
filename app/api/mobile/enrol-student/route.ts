import { callMobileAction } from '@/lib/api/mobile-handler'
import { enrolStudentAction } from '@/lib/actions/enrol-student'

export async function POST(request: Request) {
  return callMobileAction(request, (body, supabase) =>
    enrolStudentAction(body as Parameters<typeof enrolStudentAction>[0], supabase),
  )
}
