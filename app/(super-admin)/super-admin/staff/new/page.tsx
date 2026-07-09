'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, UserCog } from 'lucide-react'

const ROLES = ['Admissions Admin', 'Attendance Admin', 'Marks Admin']

export default function NewStaffPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState(ROLES[0])
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    // TODO: replace with a Supabase insert into `profiles` (role = admin sub-type)
    setTimeout(() => {
      setStatus('success')
      setTimeout(() => router.push('/super-admin/staff'), 1600)
    }, 900)
  }

  return (
    <>
      <div>
        <Link href="/super-admin/staff" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500 hover:text-ink-700 transition-colors no-underline mb-4 group">
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Staff Accounts
        </Link>
        <h1 className="text-[20px] font-bold text-neutral-900">Add Administrator</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">Creates a sub-admin account with immediate portal access</p>
      </div>

      <div className="max-w-lg bg-white rounded-2xl border border-neutral-200 shadow-1 p-7">
        {status === 'success' ? (
          <div className="flex flex-col items-center text-center py-8 gap-4">
            <div className="w-14 h-14 rounded-full bg-success-bg flex items-center justify-center">
              <CheckCircle2 size={26} className="text-success" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-neutral-900">Administrator created</p>
              <p className="text-[13px] text-neutral-500 mt-1">{name} has been added as {role}. Redirecting…</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center shrink-0">
                <UserCog size={18} className="text-ink-600" />
              </div>
              <p className="text-[13px] text-neutral-500">New sub-administrator will receive login credentials by email.</p>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Full name</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ms. Ayesha Malik" className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all" />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Email address</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@jeacademy.edu.pk" className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all" />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Phone</label>
              <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03XX XXXXXXX" className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all" />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-white focus:outline-none focus:ring-1 focus:ring-ink-300 cursor-pointer">
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>

            <button type="submit" disabled={status === 'submitting'} className="w-full inline-flex items-center justify-center gap-2 text-[14px] font-semibold rounded-xl px-6 py-3.5 bg-ink-700 text-white hover:bg-ink-800 transition-colors disabled:opacity-60 mt-2">
              {status === 'submitting' ? 'Creating account…' : 'Create Administrator'}
            </button>
          </form>
        )}
      </div>
    </>
  )
}
