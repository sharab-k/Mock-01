import { callMobileAction } from '@/lib/api/mobile-handler'
import { updateEnquiryStatusAction } from '@/lib/actions/enquiries'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return callMobileAction(request, (body, supabase) =>
    updateEnquiryStatusAction({ ...(body as Record<string, unknown>), id } as Parameters<typeof updateEnquiryStatusAction>[0], supabase),
  )
}
