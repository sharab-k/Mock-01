import { NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveRequestClient } from '@/lib/supabase/session'
import { fetchReportData } from '@/lib/reports/report-data'
import { renderReportHtml } from '@/lib/reports/template'
import { renderHtmlToPdf } from '@/lib/reports/pdf'

const ParamsSchema = z.object({ studentId: z.string().uuid() })

const STAFF_ROLES = ['super_admin', 'admissions_admin', 'attendance_admin', 'marks_admin']

// Auth-gated against the session, never a client-supplied studentId alone:
// only a parent actually linked to this student, or a staff role, may
// request it. No separate student login exists (CLAUDE.md §4), so "the
// student themselves" resolves to the same check as "their linked parent."
export async function GET(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const parsed = ParamsSchema.safeParse(await params)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid student id.' }, { status: 400 })
  const { studentId } = parsed.data

  const supabase = await resolveRequestClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })

  let authorized = false
  if (profile.role === 'parent') {
    const { data: link } = await supabase
      .from('parent_student_links')
      .select('student_id')
      .eq('parent_id', user.id)
      .eq('student_id', studentId)
      .maybeSingle()
    authorized = !!link
  } else if (STAFF_ROLES.includes(profile.role)) {
    authorized = true
  }
  if (!authorized) return NextResponse.json({ error: 'Not authorized for this student.' }, { status: 403 })

  const reportData = await fetchReportData(studentId)
  if (!reportData) return NextResponse.json({ error: 'Student not found.' }, { status: 404 })

  const html = renderReportHtml(reportData)

  // @sparticuz/chromium's launch on Vercel's serverless runtime is failing
  // outright in this deployment (verified: every request 500s with an empty
  // body — a Chromium cold-launch/memory failure, not a report-data or
  // template bug). Rather than leave "download report" completely broken,
  // fall back to serving the same fully-rendered report template as HTML
  // directly — same content (every mark, the full attendance log), just not
  // converted to PDF bytes. Puppeteer stays the primary path so a working
  // Vercel Chromium config upgrades this back to a real PDF with no other
  // code change; this only degrades gracefully instead of hard-failing.
  try {
    const pdf = await renderHtmlToPdf(html)
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="progress-report-${reportData.student.rollNumber}.pdf"`,
      },
    })
  } catch (err) {
    console.error('[reports] Puppeteer PDF generation failed, serving HTML fallback:', err)
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="progress-report-${reportData.student.rollNumber}.html"`,
      },
    })
  }
}
