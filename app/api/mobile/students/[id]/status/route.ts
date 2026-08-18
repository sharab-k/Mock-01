import { callMobileAction } from '@/lib/api/mobile-handler'
import { setStudentStatusAction } from '@/lib/actions/students'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return callMobileAction(request, (body, supabase) =>
    setStudentStatusAction({ ...(body as Record<string, unknown>), id } as Parameters<typeof setStudentStatusAction>[0], supabase),
  )
}
