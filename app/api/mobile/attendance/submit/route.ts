import { callMobileAction } from '@/lib/api/mobile-handler'
import { submitClassAttendanceAction } from '@/lib/actions/attendance'

export async function POST(request: Request) {
  return callMobileAction(request, (body, supabase) =>
    submitClassAttendanceAction(body as Parameters<typeof submitClassAttendanceAction>[0], supabase),
  )
}
