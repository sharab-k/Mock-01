import { callMobileAction } from '@/lib/api/mobile-handler'
import { bulkSaveMarksAction } from '@/lib/actions/marks'

export async function POST(request: Request) {
  return callMobileAction(request, (body, supabase) =>
    bulkSaveMarksAction(body as Parameters<typeof bulkSaveMarksAction>[0], supabase),
  )
}
