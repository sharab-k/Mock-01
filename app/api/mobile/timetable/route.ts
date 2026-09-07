import { callMobileAction } from '@/lib/api/mobile-handler'
import { createTimetablePeriodAction } from '@/lib/actions/timetable'

export async function POST(request: Request) {
  return callMobileAction(request, (body, supabase) =>
    createTimetablePeriodAction(body as Parameters<typeof createTimetablePeriodAction>[0], supabase),
  )
}
