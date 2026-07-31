'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, ChevronUp, Copy, Check, UserPlus } from 'lucide-react'
import { STATUS_STYLE, type Enquiry, type EnquiryStatus } from '@/lib/admissions/enquiry-types'
import { STATUS_TO_DB } from '@/lib/admissions/enquiry-mapping'
import { updateEnquiryStatusAction } from '@/lib/actions/enquiries'

const STATUS_FILTERS: ('All' | EnquiryStatus)[] = ['All', 'Unread', 'Contacted', 'Awaiting Visit', 'Enrolled', 'Declined']
const NEXT_STATUS: Record<EnquiryStatus, EnquiryStatus> = {
  Unread: 'Contacted',
  Contacted: 'Awaiting Visit',
  'Awaiting Visit': 'Enrolled',
  Enrolled: 'Enrolled',
  Declined: 'Declined',
}

const INITIALS = (n: string) => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

type Props = {
  /** Route prefix for this dashboard's own links — lets Super Admin render the
   *  identical enquiry inbox within its own shell. */
  basePath?: string
  initialEnquiries: Enquiry[]
}

export default function AdmissionsEnquiriesContent({ basePath = '/admissions', initialEnquiries }: Props) {
  const [enquiries, setEnquiries] = useState<Enquiry[]>(initialEnquiries)
  const [statusFilter, setStatusFilter] = useState<'All' | EnquiryStatus>('All')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (statusFilter === 'All') return enquiries
    return enquiries.filter((e) => e.status === statusFilter)
  }, [enquiries, statusFilter])

  const copyPhone = async (phone: string) => {
    try { await navigator.clipboard.writeText(phone); setCopiedPhone(phone); setTimeout(() => setCopiedPhone(null), 1500) } catch { /* clipboard blocked */ }
  }

  const setStatus = async (id: string, status: EnquiryStatus) => {
    const previous = enquiries
    setEnquiries((prev) => prev.map((e) => e.id === id ? { ...e, status } : e))
    const outcome = await updateEnquiryStatusAction({ id, status: STATUS_TO_DB[status] })
    if (!outcome.ok) setEnquiries(previous)
  }

  const advanceStatus = (id: string) => {
    const current = enquiries.find((e) => e.id === id)
    if (current) setStatus(id, NEXT_STATUS[current.status])
  }

  const decline = (id: string) => {
    setStatus(id, 'Declined')
  }

  return (
    <>
      <div>
        <Link href={basePath} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Admissions
        </Link>
        <h1 className="text-[20px] font-bold text-neutral-900">Enquiry Inbox</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">{enquiries.length} total enquiries · {filtered.length} shown</p>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4 flex items-center gap-2 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-[12px] font-semibold px-3 py-1.5 rounded-full transition-colors ${
              statusFilter === s ? 'bg-ink-700 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="divide-y divide-neutral-100">
          {filtered.map((e) => (
            <div key={e.id}>
              <div
                className="flex items-start gap-3 px-5 py-4 hover:bg-neutral-50 transition-colors cursor-pointer select-none"
                onClick={() => setExpanded(expanded === e.id ? null : e.id)}
              >
                <div className="w-9 h-9 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">
                  {INITIALS(e.parent_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-neutral-900 text-[13.5px]">{e.parent_name}</span>
                    <span className="text-[11px] font-mono bg-ink-50 text-ink-700 px-1.5 py-0.5 rounded-md font-semibold">Gr {e.grade_interest}</span>
                    <span className="text-[11px] text-neutral-400">{e.received_at}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11.5px] font-mono text-neutral-500">{e.parent_phone}</span>
                    <button onClick={(ev) => { ev.stopPropagation(); copyPhone(e.parent_phone) }} className="text-neutral-300 hover:text-ink-600 transition-colors p-0.5 rounded" title="Copy phone">
                      {copiedPhone === e.parent_phone ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                    </button>
                  </div>
                  {e.message && (
                    <p className={`text-[12.5px] text-neutral-500 mt-1.5 leading-relaxed ${expanded === e.id ? '' : 'truncate'}`}>{e.message}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 mt-0.5">
                  <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLE[e.status]}`}>{e.status}</span>
                  {expanded === e.id ? <ChevronUp size={14} className="text-neutral-400" /> : <ChevronDown size={14} className="text-neutral-400" />}
                </div>
              </div>
              {expanded === e.id && (
                <div className="px-5 pb-4 pt-2 bg-neutral-50 border-t border-neutral-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <a href={`tel:${e.parent_phone}`} onClick={(ev) => ev.stopPropagation()} className="flex items-center gap-1.5 text-[12px] font-medium text-ink-600 hover:text-ink-800 bg-white border border-neutral-200 px-3 py-2 rounded-xl transition-colors no-underline">
                      Call {e.parent_name.split(' ')[0]}
                    </a>
                    {e.status !== 'Enrolled' && e.status !== 'Declined' && (
                      <button onClick={(ev) => { ev.stopPropagation(); advanceStatus(e.id) }} className="text-[12px] font-medium text-neutral-700 bg-white border border-neutral-200 px-3 py-2 rounded-xl hover:bg-neutral-100 transition-colors">
                        Mark as {NEXT_STATUS[e.status]}
                      </button>
                    )}
                    {e.status !== 'Enrolled' && e.status !== 'Declined' && (
                      <button onClick={(ev) => { ev.stopPropagation(); decline(e.id) }} className="text-[12px] font-medium text-danger bg-white border border-danger/20 px-3 py-2 rounded-xl hover:bg-danger-bg transition-colors">
                        Decline
                      </button>
                    )}
                    <Link href={`${basePath}/students/new`} onClick={(ev) => ev.stopPropagation()} className="flex items-center gap-1.5 text-[12px] font-semibold text-white bg-ink-700 hover:bg-ink-800 px-3 py-2 rounded-xl transition-colors no-underline ml-auto">
                      <UserPlus size={12} /> Convert to Student
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-5 py-10 text-center text-[13px] text-neutral-400">No enquiries in this status.</div>
          )}
        </div>
      </div>
    </>
  )
}
