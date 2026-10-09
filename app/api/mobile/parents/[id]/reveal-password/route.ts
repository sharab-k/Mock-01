import { callMobileAction } from '@/lib/api/mobile-handler'
import { revealParentPasswordAction } from '@/lib/actions/parents'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return callMobileAction(request, (_body, supabase) => revealParentPasswordAction({ id }, supabase))
}
