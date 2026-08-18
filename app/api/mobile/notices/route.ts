import { callMobileAction } from '@/lib/api/mobile-handler'
import { createNoticeAction } from '@/lib/actions/notices'

export async function POST(request: Request) {
  return callMobileAction(request, (body, supabase) =>
    createNoticeAction(body as Parameters<typeof createNoticeAction>[0], supabase),
  )
}
