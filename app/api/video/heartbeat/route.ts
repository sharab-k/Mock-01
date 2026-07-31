import { NextResponse } from 'next/server'
import { z } from 'zod'
import { recordHeartbeat } from '@/lib/video/heartbeat'

const BodySchema = z.object({
  studentId: z.string().uuid(),
  lectureId: z.string().uuid(),
})

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })

  const result = await recordHeartbeat(parsed.data.studentId, parsed.data.lectureId)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  return NextResponse.json({
    watchedSeconds: result.watchedSeconds,
    durationSeconds: result.durationSeconds,
    completed: result.completed,
  })
}
