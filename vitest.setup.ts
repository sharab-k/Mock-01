import '@testing-library/jest-dom'

// Load .env.local for tests that hit the real Supabase project (e.g.
// lib/auth/__tests__/rls.integration.test.ts). Guarded — CI environments
// that inject env vars directly won't have this file, and that's fine.
try {
  process.loadEnvFile('.env.local')
} catch {
  // no .env.local present — assume env vars are already set (CI)
}
