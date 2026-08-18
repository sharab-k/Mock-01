import { callMobileAction } from '@/lib/api/mobile-handler'
import { updateNoticeAction } from '@/lib/actions/notices'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return callMobileAction(request, (body, supabase) =>
    updateNoticeAction({ ...(body as Record<string, unknown>), id } as Parameters<typeof updateNoticeAction>[0], supabase),
  )
}
