'use client'

import { useSearchParams } from 'next/navigation'

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials:       'Incorrect email or password. Please try again.',
  no_role:                   'Your account has not been assigned a role. Contact your administrator.',
  account_inactive:          'This account has been deactivated. Contact your Super Admin to restore access.',
  supabase_not_configured:   'Supabase is not configured yet. Use the dev portal links below to preview the dashboards.',
  reset_link_invalid:        'This password reset link is invalid or has expired. Please request a new one.',
}

const SUCCESS_MESSAGES: Record<string, string> = {
  password_updated: 'Password updated. Please sign in with your new password.',
}

// Reads ?error= / ?success= in the browser so the login page itself carries no
// per-request data and can be served statically from the edge. Render inside
// <Suspense> (useSearchParams opts out of static rendering otherwise).
export default function LoginMessages() {
  const params = useSearchParams()
  const error = params.get('error')
  const success = params.get('success')
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? 'Something went wrong. Please try again.') : null
  const successMessage = success ? (SUCCESS_MESSAGES[success] ?? null) : null

  return (
    <>
      {successMessage && (
        <div className="flex items-start gap-3 bg-success-bg border border-success/20 rounded-xl px-4 py-3">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-success shrink-0 mt-0.5" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <path d="M22 4 12 14.01l-3-3" />
          </svg>
          <p className="text-[13px] text-success leading-snug">{successMessage}</p>
        </div>
      )}
      {errorMessage && (
        <div className="flex items-start gap-3 bg-danger-bg border border-danger/20 rounded-xl px-4 py-3">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger shrink-0 mt-0.5" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-[13px] text-danger leading-snug">{errorMessage}</p>
        </div>
      )}
    </>
  )
}
