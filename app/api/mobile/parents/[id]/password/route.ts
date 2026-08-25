import { callMobileAction } from '@/lib/api/mobile-handler'
import { setParentPasswordAction } from '@/lib/actions/parents'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return callMobileAction(request, (body, supabase) =>
    setParentPasswordAction({ ...(body as Record<string, unknown>), id } as Parameters<typeof setParentPasswordAction>[0], supabase),
  )
}
