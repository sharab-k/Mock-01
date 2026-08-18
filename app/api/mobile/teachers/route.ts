import { callMobileAction } from '@/lib/api/mobile-handler'
import { createTeacherAction } from '@/lib/actions/teachers'

export async function POST(request: Request) {
  return callMobileAction(request, (body, supabase) =>
    createTeacherAction(body as Parameters<typeof createTeacherAction>[0], supabase),
  )
}
