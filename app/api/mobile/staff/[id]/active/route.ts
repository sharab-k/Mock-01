import { callMobileAction } from '@/lib/api/mobile-handler'
import { setStaffActiveAction } from '@/lib/actions/staff'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return callMobileAction(request, (body, supabase) =>
    setStaffActiveAction({ ...(body as Record<string, unknown>), id } as Parameters<typeof setStaffActiveAction>[0], supabase),
  )
}
