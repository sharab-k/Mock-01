import { callMobileAction } from '@/lib/api/mobile-handler'
import { createSubjectAction } from '@/lib/actions/subjects'

export async function POST(request: Request) {
  return callMobileAction(request, (body, supabase) =>
    createSubjectAction(body as Parameters<typeof createSubjectAction>[0], supabase),
  )
}
