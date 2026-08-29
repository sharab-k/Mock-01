import { callMobileAction } from '@/lib/api/mobile-handler'
import { bulkSaveTestMarksAction } from '@/lib/actions/marks'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return callMobileAction(request, (body, supabase) =>
    bulkSaveTestMarksAction({ ...(body as Record<string, unknown>), testId: id } as Parameters<typeof bulkSaveTestMarksAction>[0], supabase),
  )
}
