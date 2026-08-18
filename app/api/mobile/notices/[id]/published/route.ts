import { callMobileAction } from '@/lib/api/mobile-handler'
import { setNoticePublishedAction } from '@/lib/actions/notices'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return callMobileAction(request, (body, supabase) =>
    setNoticePublishedAction({ ...(body as Record<string, unknown>), id } as Parameters<typeof setNoticePublishedAction>[0], supabase),
  )
}
