import Link from 'next/link'
import { ArrowLeft, Building2, MessageSquare, ShieldCheck } from 'lucide-react'

const ROLE_PERMISSIONS = [
  { role: 'Super Admin',      color: '#233357', access: 'Full system access, manages sub-admins, full audit log' },
  { role: 'Admissions Admin', color: '#A26D53', access: 'Create/delete students, issues parent credentials, enquiry inbox' },
  { role: 'Attendance Admin', color: '#487A63', access: 'Daily roster, single-click check-in, triggers absence alerts' },
  { role: 'Marks Admin',      color: '#7E587E', access: 'Bulk mark entry, tier evaluation, logged edit history' },
  { role: 'Student',          color: '#547B96', access: 'View own lectures, assignments, marks, attendance' },
  { role: 'Parent',           color: '#988671', access: 'Read-only attendance, marks, and progress for linked children' },
]

export default function SuperAdminSettingsPage() {
  return (
    <>
      <div>
        <Link href="/super-admin" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Dashboard
        </Link>
        <h1 className="text-[20px] font-bold text-neutral-900">System Settings</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">Academy information, notification provider, and role permissions</p>
      </div>

      {/* Academy info */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-ink-100 flex items-center justify-center">
            <Building2 size={16} className="text-ink-600" />
          </div>
          <h2 className="text-[14px] font-semibold text-neutral-900">Academy Information</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Institution name</p>
            <p className="text-[13.5px] text-neutral-800">JE Academy</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Address</p>
            <p className="text-[13.5px] text-neutral-400 italic">Pending confirmation from client</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Admissions email</p>
            <p className="text-[13.5px] text-neutral-800 font-mono">admissions@jeacademy.edu.pk</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Academic year</p>
            <p className="text-[13.5px] text-neutral-800">2025–26, Term 2</p>
          </div>
        </div>
      </div>

      {/* Notification provider */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-success-bg flex items-center justify-center">
            <MessageSquare size={16} className="text-success" />
          </div>
          <h2 className="text-[14px] font-semibold text-neutral-900">Notification Provider</h2>
        </div>
        <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl">
          <div>
            <p className="text-[13.5px] font-medium text-neutral-800">Twilio — WhatsApp Business API + SMS</p>
            <p className="text-[12px] text-neutral-500 mt-0.5">Attendance and grade alerts route through one vendor, SMS as failover</p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-warning bg-warning-bg px-3 py-1.5 rounded-full border border-warning/20 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-warning inline-block" />
            Pending configuration
          </span>
        </div>
      </div>

      {/* Roles & permissions */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-neutral-100">
          <div className="w-9 h-9 rounded-xl bg-ink-100 flex items-center justify-center">
            <ShieldCheck size={16} className="text-ink-600" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-neutral-900">Roles &amp; Permissions</h2>
            <p className="text-[11.5px] text-neutral-400 mt-0.5">Reference only — access is enforced at the database level via RLS</p>
          </div>
        </div>
        <div className="divide-y divide-neutral-100">
          {ROLE_PERMISSIONS.map((r) => (
            <div key={r.role} className="flex items-start gap-3 px-6 py-4">
              <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ background: r.color }} />
              <div>
                <p className="text-[13px] font-semibold text-neutral-900">{r.role}</p>
                <p className="text-[12.5px] text-neutral-500 mt-0.5">{r.access}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
