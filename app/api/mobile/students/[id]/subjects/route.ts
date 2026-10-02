import { callMobileAction } from '@/lib/api/mobile-handler'
import { setStudentElectivesAction } from '@/lib/actions/subject-enrollments'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return callMobileAction(request, (body, supabase) =>
    setStudentElectivesAction({ ...(body as Record<string, unknown>), studentId: id } as Parameters<typeof setStudentElectivesAction>[0], supabase),
  )
}
