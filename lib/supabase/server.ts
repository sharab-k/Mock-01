import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'
import type { Database } from '@/types/supabase'
import { withMemoizedGetUser } from '@/lib/supabase/memo-auth'

// One client per request (React cache) with a memoised auth.getUser(): a page
// render used to build a client and re-verify the user separately in the
// middleware, the layout, the page and each data function — each a round trip
// to Supabase. Now the first answer is reused for the rest of the request.
export const createClient = cache(async () => {
  const cookieStore = await cookies()

  const client = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: Parameters<typeof cookieStore.set>[2] }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component — safe to ignore
          }
        },
      },
    },
  )
  return withMemoizedGetUser(client)
})
