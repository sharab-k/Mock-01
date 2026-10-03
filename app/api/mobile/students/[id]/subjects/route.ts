import { callMobileAction } from '@/lib/api/mobile-handler'
import { setStudentSubjectsAction } from '@/lib/actions/subject-enrollments'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return callMobileAction(request, (body, supabase) =>
    setStudentSubjectsAction({ ...(body as Record<string, unknown>), studentId: id } as Parameters<typeof setStudentSubjectsAction>[0], supabase),
  )
}
