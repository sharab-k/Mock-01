import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Most test files are live-Supabase RLS integration tests that each
    // sign in several throwaway users via the real Auth API. Running files
    // in parallel (Vitest's default) fans out enough concurrent
    // signInWithPassword calls to trip Supabase's auth rate limiter as the
    // suite has grown — sequential file execution trades some wall-clock
    // time for a suite that doesn't flake under its own concurrency.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
})
