import { callMobileAction } from '@/lib/api/mobile-handler'
import { createTestAction } from '@/lib/actions/tests'

export async function POST(request: Request) {
  return callMobileAction(request, (body, supabase) =>
    createTestAction(body as Parameters<typeof createTestAction>[0], supabase),
  )
}
