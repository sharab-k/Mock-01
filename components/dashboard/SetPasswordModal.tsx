'use client'

import { useState } from 'react'
import { KeyRound, X, AlertCircle, Sparkles, Copy, Check, CheckCircle2 } from 'lucide-react'
import { suggestPasswordAction } from '@/lib/actions/generate-password'

type Props = {
  targetName: string
  /** Login email — shown so the admin knows exactly what to send along with
   *  the new password. Never editable here; just for display/copying. */
  username: string
  onSubmit: (newPassword: string) => Promise<{ ok: boolean; error?: string }>
  onClose: () => void
}

// Shared by Super Admin's staff/parent directories and Admissions Admin's
// student directory — admin types (or generates) a specific new password
// directly. Passwords are one-way hashed by Supabase Auth and can never be
// retrieved once set, so this "reset and hand over fresh credentials" flow
// is the only safe way to recover a forgotten login — there is no "look up
// the existing password" capability, by design.
export default function SetPasswordModal({ targetName, username, onSubmit, onClose }: Props) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    setGenerating(true)
    const { password: generated } = await suggestPasswordAction()
    setGenerating(false)
    if (generated) {
      setPassword(generated)
      setConfirmPassword(generated)
    }
  }

  const handleSubmit = async () => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setSaving(true)
    setError('')
    const outcome = await onSubmit(password)
    setSaving(false)
    if (outcome.ok) {
      setDone(true)
    } else {
      setError(outcome.error ?? 'Could not update the password.')
    }
  }

  const copyCredentials = async () => {
    try {
      await navigator.clipboard.writeText(`Username: ${username}\nPassword: ${password}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard blocked */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={() => !saving && onClose()} />
      <div className="relative w-full sm:max-w-sm bg-white rounded-3xl shadow-2xl z-10 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-ink-100 flex items-center justify-center">
              <KeyRound size={18} className="text-ink-600" />
            </div>
            <h3 className="text-[15px] font-bold text-neutral-900">{done ? 'Password updated' : 'Reset password'}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {done ? (
          <div className="px-6 py-5 space-y-4">
            <div className="flex flex-col items-center text-center gap-3 py-2">
              <div className="w-12 h-12 rounded-full bg-success-bg flex items-center justify-center">
                <CheckCircle2 size={22} className="text-success" />
              </div>
              <p className="text-[13px] text-neutral-600 leading-relaxed">
                Share these new credentials with <span className="font-medium text-neutral-900">{targetName}</span> — this password won&apos;t be shown again after you close this window.
              </p>
            </div>
            <div className="bg-ink-50 border border-ink-100 rounded-2xl p-4 space-y-2 font-mono text-[12.5px] text-neutral-800">
              <div className="flex justify-between gap-3"><span className="text-neutral-400 shrink-0">Username</span><span className="text-right break-all">{username}</span></div>
              <div className="flex justify-between gap-3"><span className="text-neutral-400 shrink-0">Password</span><span className="text-right break-all">{password}</span></div>
            </div>
            <button onClick={copyCredentials} className="w-full flex items-center justify-center gap-2 text-[12.5px] font-semibold text-ink-700 bg-white border border-ink-200 py-2.5 rounded-xl hover:bg-ink-100/50 transition-colors">
              {copied ? <><Check size={13} className="text-success" /> Copied</> : <><Copy size={13} /> Copy credentials</>}
            </button>
            <button onClick={onClose} className="w-full py-3 text-[13px] font-semibold text-white bg-ink-700 hover:bg-ink-800 rounded-xl transition-colors">Done</button>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            <div className="bg-neutral-50 border border-neutral-100 rounded-xl px-3.5 py-2.5">
              <p className="text-[11px] text-neutral-400">Username</p>
              <p className="text-[13px] font-mono text-neutral-800 break-all">{username}</p>
            </div>
            <p className="text-[13px] text-neutral-600 leading-relaxed">
              Set a new password for <span className="font-medium text-neutral-900">{targetName}</span>. They&apos;ll need it to sign in next time.
            </p>

            {error && (
              <div className="flex items-start gap-2.5 bg-danger-bg border border-danger/20 rounded-xl p-3">
                <AlertCircle size={14} className="text-danger mt-0.5 shrink-0" />
                <p className="text-[12px] text-danger leading-relaxed">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="block text-[12px] font-semibold text-neutral-700">New password</label>
              <button onClick={handleGenerate} disabled={generating} className="flex items-center gap-1 text-[11.5px] font-medium text-ink-600 hover:text-ink-800 transition-colors disabled:opacity-60">
                <Sparkles size={12} /> {generating ? 'Generating…' : 'Generate'}
              </button>
            </div>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] font-mono bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all -mt-2"
            />
            <div>
              <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Confirm password</label>
              <input
                type="text"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] font-mono bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button onClick={onClose} disabled={saving} className="flex-1 py-3 text-[13px] font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors disabled:opacity-60">Cancel</button>
              <button onClick={handleSubmit} disabled={saving} className="flex-1 py-3 text-[13px] font-semibold rounded-xl text-white bg-ink-700 hover:bg-ink-800 transition-colors disabled:opacity-60">
                {saving ? 'Saving…' : 'Set password'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
