'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, UserPlus, X, AlertTriangle } from 'lucide-react'
import { STAFF as INITIAL_STAFF, ROLE_DOT, INITIALS, type StaffMember } from '@/lib/mock/staff'

export default function SuperAdminStaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>(INITIAL_STAFF)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('All Roles')
  const [confirmTarget, setConfirmTarget] = useState<StaffMember | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return staff.filter((s) => {
      const matchesQuery = !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
      const matchesRole = roleFilter === 'All Roles' || s.role === roleFilter
      return matchesQuery && matchesRole
    })
  }, [staff, query, roleFilter])

  const applyToggle = () => {
    if (!confirmTarget) return
    setStaff((prev) => prev.map((s) => s.id === confirmTarget.id ? { ...s, status: s.status === 'Active' ? 'Inactive' : 'Active' } : s))
    setConfirmTarget(null)
  }

  return (
    <>
      <div>
        <Link href="/super-admin" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Dashboard
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-[20px] font-bold text-neutral-900">Staff Accounts</h1>
            <p className="text-[13px] text-neutral-500 mt-0.5">{staff.length} sub-administrator accounts</p>
          </div>
          <Link href="/super-admin/staff/new" className="flex items-center gap-2 px-3.5 py-2 bg-ink-700 text-white text-[13px] font-semibold rounded-xl hover:bg-ink-800 transition-colors no-underline">
            <UserPlus size={14} /> Add Administrator
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or email…" className="w-full pl-9 pr-3 py-2.5 text-[13px] border border-neutral-200 rounded-xl bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all" />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="text-[12.5px] border border-neutral-200 rounded-xl px-3 py-2.5 text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
          <option>All Roles</option>
          <option>Admissions Admin</option>
          <option>Attendance Admin</option>
          <option>Marks Admin</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[560px]">
            <thead>
              <tr className="bg-neutral-50 text-left">
                <th className="px-5 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Administrator</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider hidden sm:table-cell">Role</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider hidden md:table-cell">Last Login</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((a) => (
                <tr key={a.id} className={`hover:bg-neutral-50 transition-colors ${a.status === 'Inactive' ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-ink-100 text-ink-700 flex items-center justify-center font-mono text-[10px] font-bold shrink-0">{INITIALS(a.name)}</div>
                      <div className="min-w-0">
                        <span className="block font-medium text-neutral-900 truncate">{a.name}</span>
                        <span className="block text-[11px] text-neutral-400 truncate sm:hidden">{a.role}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 hidden sm:table-cell">
                    <span className="flex items-center gap-1.5 text-[12px] text-neutral-700">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ROLE_DOT[a.role]}`} />
                      {a.role}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-[12px] font-mono text-neutral-500 hidden md:table-cell">{a.lastLogin}</td>
                  <td className="px-3 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${a.status === 'Active' ? 'bg-success-bg text-success' : 'bg-neutral-100 text-neutral-500'}`}>{a.status}</span>
                  </td>
                  <td className="px-3 py-3.5">
                    <button onClick={() => setConfirmTarget(a)} className={`text-[11.5px] font-medium transition-colors ${a.status === 'Active' ? 'text-danger hover:text-danger/80' : 'text-success hover:text-success/80'}`}>
                      {a.status === 'Active' ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-[13px] text-neutral-400">No administrators match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={() => setConfirmTarget(null)} />
          <div className="relative w-full sm:max-w-sm bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${confirmTarget.status === 'Active' ? 'bg-danger-bg' : 'bg-success-bg'}`}>
                  <AlertTriangle size={18} className={confirmTarget.status === 'Active' ? 'text-danger' : 'text-success'} />
                </div>
                <h3 className="text-[15px] font-bold text-neutral-900">{confirmTarget.status === 'Active' ? 'Deactivate account?' : 'Reactivate account?'}</h3>
              </div>
              <button onClick={() => setConfirmTarget(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-[13px] text-neutral-600 leading-relaxed mb-5">
                {confirmTarget.status === 'Active'
                  ? `${confirmTarget.name} will immediately lose portal access.`
                  : `${confirmTarget.name} will regain portal access with their existing credentials.`}
              </p>
              <div className="flex items-center gap-3">
                <button onClick={() => setConfirmTarget(null)} className="flex-1 py-3 text-[13px] font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors">Cancel</button>
                <button onClick={applyToggle} className={`flex-1 py-3 text-[13px] font-semibold rounded-xl text-white transition-colors ${confirmTarget.status === 'Active' ? 'bg-danger hover:bg-danger/90' : 'bg-success hover:bg-success/90'}`}>
                  {confirmTarget.status === 'Active' ? 'Deactivate' : 'Reactivate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
