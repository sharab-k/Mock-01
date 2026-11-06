import { NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveRequestClient } from '@/lib/supabase/session'
import { buildVoucherData } from '@/lib/fees/vouchers'
import { renderVouchersPdf } from '@/lib/fees/voucher-pdf'

export const runtime = 'nodejs'

const MAX_BULK = 300
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function respond(request: Request, ids: string[], bulk: boolean) {
  const supabase = await resolveRequestClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  if (bulk) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
  }

  // Row-level security decides which vouchers this caller may read: a Super Admin sees
  // every one, a parent only their own children's — a stranger's id simply returns nothing.
  const vouchers = await buildVoucherData(ids, supabase)
  if (vouchers.length === 0) return NextResponse.json({ error: 'No matching vouchers.' }, { status: 404 })

  const pdf = await renderVouchersPdf(vouchers)
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${vouchers.length === 1 ? `voucher-${vouchers[0]!.voucherNo}` : 'vouchers'}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}

// One voucher: Super Admin, or the parent of that child.
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id') ?? ''
  if (!UUID.test(id)) return NextResponse.json({ error: 'Invalid voucher.' }, { status: 400 })
  return respond(request, [id], false)
}

// Bulk (a class, a section, a selection): Super Admin only. Send either voucher ids, or a
// month with student ids (the vouchers are looked up). Output is in class / section / roll order.
const BulkSchema = z.union([
  z.object({ ids: z.array(z.string().uuid()).min(1).max(MAX_BULK) }),
  z.object({ year: z.number().int().min(2020).max(2100), month: z.number().int().min(1).max(12), studentIds: z.array(z.string().uuid()).min(1).max(MAX_BULK) }),
])

export async function POST(request: Request) {
  const parsed = BulkSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: `Choose between 1 and ${MAX_BULK} vouchers.` }, { status: 400 })
  if ('ids' in parsed.data) return respond(request, Array.from(new Set(parsed.data.ids)), true)

  const { year, month, studentIds } = parsed.data
  const supabase = await resolveRequestClient(request)
  const { data } = await supabase.from('fee_voucher_status').select('id').eq('year', year).eq('month', month).in('student_id', Array.from(new Set(studentIds)))
  const ids = (data ?? []).map((v) => v.id!)
  if (ids.length === 0) return NextResponse.json({ error: 'No vouchers have been generated for these students yet.' }, { status: 404 })
  return respond(request, ids, true)
}
