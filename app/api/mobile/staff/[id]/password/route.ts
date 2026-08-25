import { callMobileAction } from '@/lib/api/mobile-handler'
import { setStaffPasswordAction } from '@/lib/actions/staff'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return callMobileAction(request, (body, supabase) =>
    setStaffPasswordAction({ ...(body as Record<string, unknown>), id } as Parameters<typeof setStaffPasswordAction>[0], supabase),
  )
}
