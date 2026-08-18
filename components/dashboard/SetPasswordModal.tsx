'use client'

import { useState } from 'react'
import { KeyRound, X, AlertCircle } from 'lucide-react'

type Props = {
  targetName: string
  onSubmit: (newPassword: string) => Promise<{ ok: boolean; error?: string }>
  onClose: () => void
}

// Shared by Super Admin's staff/parent directories and Admissions Admin's
// student directory — admin types a specific new password directly (no
// email), matching this repo's other confirm-modal visual conventions.
export default function SetPasswordModal({ targetName, onSubmit, onClose }: Props) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
      onClose()
    } else {
      setError(outcome.error ?? 'Could not update the password.')
    }
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
            <h3 className="text-[15px] font-bold text-neutral-900">Reset password</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-[13px] text-neutral-600 leading-relaxed">
            Set a new password for <span className="font-medium text-neutral-900">{targetName}</span>. They&apos;ll need it to sign in next time.
          </p>

          {error && (
            <div className="flex items-start gap-2.5 bg-danger-bg border border-danger/20 rounded-xl p-3">
              <AlertCircle size={14} className="text-danger mt-0.5 shrink-0" />
              <p className="text-[12px] text-danger leading-relaxed">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-neutral-700 mb-1.5">Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-[13px] bg-neutral-50 placeholder-neutral-400 focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-400/10 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button onClick={onClose} disabled={saving} className="flex-1 py-3 text-[13px] font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors disabled:opacity-60">Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="flex-1 py-3 text-[13px] font-semibold rounded-xl text-white bg-ink-700 hover:bg-ink-800 transition-colors disabled:opacity-60">
              {saving ? 'Saving…' : 'Set password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
