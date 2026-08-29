import { callMobileAction } from '@/lib/api/mobile-handler'
import { removeSubjectAction } from '@/lib/actions/subjects'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return callMobileAction(request, (_body, supabase) => removeSubjectAction({ id }, supabase))
}
