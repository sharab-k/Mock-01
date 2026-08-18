import { callMobileAction } from '@/lib/api/mobile-handler'
import { updateTeacherAction, deleteTeacherAction } from '@/lib/actions/teachers'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return callMobileAction(request, (body, supabase) =>
    updateTeacherAction({ ...(body as Record<string, unknown>), id } as Parameters<typeof updateTeacherAction>[0], supabase),
  )
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return callMobileAction(request, (_body, supabase) => deleteTeacherAction({ id }, supabase))
}
