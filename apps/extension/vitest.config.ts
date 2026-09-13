import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Tests run in plain node — nothing under test touches the DOM. The `chrome`
// namespace comes from the in-memory stub installed by src/test/setup.ts.
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
    setupFiles: ['./src/test/setup.ts'],
    // Pin the Edge Function base URL so assertions don't depend on a
    // developer's local .env (CI has none). No request ever leaves the
    // process — `fetch` is stubbed in every test that uses it.
    env: {
      VITE_SUPABASE_FUNCTIONS_URL: 'https://functions.test.invalid',
    },
  },
})
