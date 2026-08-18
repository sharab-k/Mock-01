import { callMobileAction } from '@/lib/api/mobile-handler'
import { updateStudentAction, deleteStudentAction } from '@/lib/actions/students'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return callMobileAction(request, (body, supabase) =>
    updateStudentAction({ ...(body as Record<string, unknown>), id } as Parameters<typeof updateStudentAction>[0], supabase),
  )
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return callMobileAction(request, (_body, supabase) => deleteStudentAction({ id }, supabase))
}
