import { callMobileAction } from '@/lib/api/mobile-handler'
import { updateParentContactAction } from '@/lib/actions/parents'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return callMobileAction(request, (body, supabase) =>
    updateParentContactAction({ ...(body as Record<string, unknown>), id } as Parameters<typeof updateParentContactAction>[0], supabase),
  )
}
