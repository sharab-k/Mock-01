import { callMobileAction } from '@/lib/api/mobile-handler'
import { markAttendanceAction } from '@/lib/actions/attendance'

export async function POST(request: Request) {
  return callMobileAction(request, (body, supabase) =>
    markAttendanceAction(body as Parameters<typeof markAttendanceAction>[0], supabase),
  )
}
