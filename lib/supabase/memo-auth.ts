import type { SupabaseClient } from '@supabase/supabase-js'

type AnyFn = (...args: unknown[]) => unknown

// `auth.getUser()` is a network round trip to Supabase Auth every single time —
// and a request used to ask the same question many times (layout, page, the
// data function, the role check inside it). This makes one client answer it
// once: later calls on the same client reuse the first result. A client
// instance lives for one request (see server.ts / bearer.ts), so the answer can
// never outlive the token it was checked against. Any call that changes the
// session (sign in/out, token refresh, user update) clears it.
export function withMemoizedGetUser<T extends SupabaseClient<never, never, never>>(client: T): T
export function withMemoizedGetUser<C extends { auth: SupabaseClient['auth'] }>(client: C): C
export function withMemoizedGetUser<C extends { auth: SupabaseClient['auth'] }>(client: C): C {
  const auth = client.auth as unknown as Record<string, AnyFn>
  const original = auth.getUser.bind(client.auth) as AnyFn
  let cached: Promise<{ error: unknown }> | null = null

  auth.getUser = (...args: unknown[]) => {
    if (args.length > 0) return original(...args) // an explicit JWT: never cache
    if (!cached) {
      const pending = original() as Promise<{ error: unknown }>
      cached = pending
      pending.then((r) => { if (r.error && cached === pending) cached = null }, () => { if (cached === pending) cached = null })
    }
    return cached
  }

  for (const name of ['signInWithPassword', 'signOut', 'setSession', 'updateUser', 'refreshSession', 'exchangeCodeForSession', 'verifyOtp']) {
    const fn = auth[name]
    if (typeof fn !== 'function') continue
    auth[name] = (...args: unknown[]) => {
      cached = null
      return fn.apply(client.auth, args)
    }
  }
  return client
}
