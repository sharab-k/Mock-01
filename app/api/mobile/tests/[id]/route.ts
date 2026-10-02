import { callMobileAction } from '@/lib/api/mobile-handler'
import { updateTestAction } from '@/lib/actions/tests'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return callMobileAction(request, (body, supabase) =>
    updateTestAction({ ...(body as Record<string, unknown>), id } as Parameters<typeof updateTestAction>[0], supabase),
  )
}
