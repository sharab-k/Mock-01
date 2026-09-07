import { callMobileAction } from '@/lib/api/mobile-handler'
import { updateTimetablePeriodAction, deleteTimetablePeriodAction } from '@/lib/actions/timetable'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return callMobileAction(request, (body, supabase) =>
    updateTimetablePeriodAction({ ...(body as Record<string, unknown>), id } as Parameters<typeof updateTimetablePeriodAction>[0], supabase),
  )
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return callMobileAction(request, (_body, supabase) => deleteTimetablePeriodAction({ id }, supabase))
}
