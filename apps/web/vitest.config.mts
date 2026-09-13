import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Plain node environment — only `src/lib` logic is under test, no components.
export default defineConfig({
  resolve: {
    alias: {
      '@echofocus/shared': fileURLToPath(
        new URL('../../packages/shared/src/index.ts', import.meta.url),
      ),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Pin the Supabase config so URL assertions don't depend on a developer's
    // .env.local (CI has none). All fetches are stubbed — nothing goes out.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.test.invalid',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-test-key',
    },
  },
})
