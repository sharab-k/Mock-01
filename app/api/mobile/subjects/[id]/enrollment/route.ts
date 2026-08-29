import { callMobileAction } from '@/lib/api/mobile-handler'
import { setSubjectEnrollmentAction } from '@/lib/actions/subject-enrollments'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return callMobileAction(request, (body, supabase) =>
    setSubjectEnrollmentAction({ ...(body as Record<string, unknown>), subjectId: id } as Parameters<typeof setSubjectEnrollmentAction>[0], supabase),
  )
}
