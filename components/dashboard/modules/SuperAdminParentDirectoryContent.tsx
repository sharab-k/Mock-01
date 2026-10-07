'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, X, Copy, Check, KeyRound, Phone, MessageCircle, ShieldCheck, Users } from 'lucide-react'
import type { ParentDirectoryRow } from '@/lib/admissions/parent-lookup'
import { setParentPasswordAction } from '@/lib/actions/parents'
import SetPasswordModal from '@/components/dashboard/SetPasswordModal'

const INITIALS = (name: string) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

// The async Clipboard API needs a secure origin and permission; some browsers
// (and plain-http addresses) refuse it. Fall back to the older select-and-copy
// route so a copy button never silently does nothing.
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    try {
      return document.execCommand('copy')
    } catch {
      return false
    } finally {
      area.remove()
    }
  }
}

// One labelled value with its own copy button — shows a check for a moment
// after copying so it's obvious the click worked.
function CopyField({ label, value, mono = true, icon }: { label: string; value: string; mono?: boolean; icon?: React.ReactNode }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    if (await copyText(value)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }
  return (
    <div className="flex items-center gap-3 bg-neutral-50 border border-neutral-100 rounded-xl px-3.5 py-2.5">
      {icon && <div className="text-neutral-400 shrink-0">{icon}</div>}
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-semibold text-neutral-400 uppercase tracking-wider">{label}</p>
        <p className={`text-[13px] text-neutral-900 break-all ${mono ? 'font-mono' : 'font-medium'}`}>{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${label}`}
        className={`shrink-0 flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${copied ? 'bg-success-bg text-success' : 'bg-white border border-neutral-200 text-ink-700 hover:bg-ink-50'}`}
      >
        {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
      </button>
    </div>
  )
}

function allDetailsText(p: ParentDirectoryRow): string {
  const lines = [
    `Parent: ${p.name}`,
    `Username: ${p.email}`,
    `Phone: ${p.phone}`,
    ...(p.secondaryPhone ? [`Secondary phone: ${p.secondaryPhone}`] : []),
    ...(p.whatsapp2 ? [`WhatsApp: ${p.whatsapp2}`] : []),
    `Children:`,
    ...p.children.map((c) => `  - ${c.name} · Grade ${c.grade}-${c.section} · Roll ${c.roll}${c.grNumber ? ` · GR# ${c.grNumber}` : ''}`),
  ]
  return lines.join('\n')
}

export default function SuperAdminParentDirectoryContent({ parents }: { parents: ParentDirectoryRow[] }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<ParentDirectoryRow | null>(null)
  const [passwordTarget, setPasswordTarget] = useState<ParentDirectoryRow | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return parents
    return parents.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.children.some((c) => c.name.toLowerCase().includes(q) || c.roll.toLowerCase().includes(q)),
    )
  }, [parents, query])

  const copyAll = async (p: ParentDirectoryRow) => {
    if (await copyText(allDetailsText(p))) {
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 1500)
    }
  }

  return (
    <>
      <div>
        <Link href="/super-admin" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Dashboard
        </Link>
        <h1 className="text-[20px] font-bold text-neutral-900">Parent Directory</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">{parents.length} parent accounts · click a parent for their full details</p>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by parent, child, username or phone…"
            className="w-full pl-9 pr-3 py-2.5 text-[13px] border border-neutral-200 rounded-xl bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[520px]">
            <thead>
              <tr className="bg-neutral-50 text-left">
                <th className="px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Parent / Guardian</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider hidden md:table-cell">Username</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider hidden sm:table-cell">Phone</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Linked Children</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((p) => (
                <tr key={p.key} onClick={() => { setSelected(p); setCopiedAll(false) }} className="hover:bg-neutral-50 transition-colors cursor-pointer">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-ink-100 text-ink-700 flex items-center justify-center font-mono text-[10px] font-bold shrink-0">{INITIALS(p.name)}</div>
                      <span className="font-medium text-neutral-900">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 font-mono text-[11.5px] text-neutral-500 hidden md:table-cell truncate max-w-[180px]">{p.email}</td>
                  <td className="px-3 py-3.5 font-mono text-[12px] text-neutral-500 hidden sm:table-cell">{p.phone}</td>
                  <td className="px-3 py-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      {p.children.map((c) => (
                        <span key={c.roll} className="text-[10.5px] font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full">
                          {c.name} <span className="font-mono text-neutral-400">· {c.grade}{c.section}</span>
                        </span>
                      ))}
                      {p.children.length > 1 && (
                        <span className="text-[10.5px] font-semibold text-ink-600 bg-ink-50 px-2 py-0.5 rounded-full">
                          {p.children.length} siblings
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3.5">
                    <button onClick={(e) => { e.stopPropagation(); setPasswordTarget(p) }} className="text-[11.5px] font-medium text-ink-600 hover:text-ink-800 transition-colors">
                      Reset password
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-[13px] text-neutral-400">No parents match this search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-neutral-900/40" onClick={() => setSelected(null)} />
          <div className="relative w-full sm:max-w-md bg-white h-full shadow-2xl z-10 overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 sticky top-0 bg-white z-10">
              <h3 className="text-[15px] font-bold text-neutral-900">Parent Details</h3>
              <button onClick={() => setSelected(null)} aria-label="Close" className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-ink-100 text-ink-700 flex items-center justify-center font-mono text-[16px] font-bold shrink-0">{INITIALS(selected.name)}</div>
                <div className="min-w-0">
                  <p className="text-[16px] font-bold text-neutral-900">{selected.name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${selected.isActive ? 'bg-success-bg text-success' : 'bg-neutral-100 text-neutral-500'}`}>
                      {selected.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-[11px] text-neutral-400">Account created {formatDate(selected.createdAt)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => copyAll(selected)}
                className={`w-full flex items-center justify-center gap-2 text-[12.5px] font-semibold py-2.5 rounded-xl border transition-colors ${copiedAll ? 'bg-success-bg text-success border-success/20' : 'bg-ink-700 text-white border-ink-700 hover:bg-ink-800'}`}
              >
                {copiedAll ? <><Check size={13} /> All details copied</> : <><Copy size={13} /> Copy all details</>}
              </button>

              <div className="space-y-2.5">
                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5"><ShieldCheck size={12} /> Login credentials</p>
                <CopyField label="Username" value={selected.email} icon={<KeyRound size={14} />} />
                <div className="bg-warning-bg/60 border border-warning/20 rounded-xl px-3.5 py-3">
                  <p className="text-[12px] font-semibold text-neutral-800">Password</p>
                  <p className="text-[11.5px] text-neutral-600 leading-relaxed mt-1">
                    Passwords are stored encrypted and can&apos;t be read back — not even by an administrator. If the parent has forgotten it,
                    set a new one here and copy it to send them.
                  </p>
                  <button
                    onClick={() => setPasswordTarget(selected)}
                    className="mt-2.5 w-full flex items-center justify-center gap-2 text-[12.5px] font-semibold text-ink-700 bg-white border border-ink-100 py-2 rounded-lg hover:bg-ink-50 transition-colors"
                  >
                    <KeyRound size={13} /> Set a new password &amp; copy it
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Contact</p>
                <CopyField label="Phone / WhatsApp" value={selected.phone} icon={<Phone size={14} />} />
                {selected.secondaryPhone && <CopyField label="Secondary phone" value={selected.secondaryPhone} icon={<Phone size={14} />} />}
                {selected.whatsapp2 && <CopyField label="Second WhatsApp" value={selected.whatsapp2} icon={<MessageCircle size={14} />} />}
              </div>

              <div className="space-y-2.5">
                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={12} /> Linked children ({selected.children.length})
                </p>
                {selected.children.map((c) => (
                  <div key={c.roll} className="bg-neutral-50 border border-neutral-100 rounded-xl px-3.5 py-3">
                    <p className="text-[13px] font-semibold text-neutral-900">{c.name}</p>
                    <p className="text-[11.5px] font-mono text-neutral-500 mt-0.5">
                      Grade {c.grade}-{c.section} · Roll {c.roll}{c.grNumber ? ` · GR# ${c.grNumber}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {passwordTarget && (
        <SetPasswordModal
          targetName={passwordTarget.name}
          username={passwordTarget.email}
          onClose={() => setPasswordTarget(null)}
          onSubmit={(newPassword) => setParentPasswordAction({ id: passwordTarget.key, newPassword })}
        />
      )}
    </>
  )
}
