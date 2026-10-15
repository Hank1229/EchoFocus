import { defineConfig } from '@playwright/test'
import { EXTENSION_DIR, unpackedExtensionId } from './extension-id'

const WEB_PORT = 3100

// End-to-end tests of the built extension (apps/extension/dist-vrt, the same
// build the visual suite loads). Nothing here compares pixels, so the suite
// runs on any Chromium: locally with `pnpm test:e2e`, in CI inside the
// Playwright image. Every spec launches its own browser and the tracking
// tests measure real time, so they run one at a time. The dashboard-link
// specs also need the web app: next dev on 127.0.0.1, the host the test build
// lists under externally_connectable, with Supabase unreachable on purpose.
export default defineConfig({
  testDir: '.',
  outputDir: './test-results',
  timeout: 120_000,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
  },
  webServer: {
    command: `pnpm --filter @echofocus/web exec next dev -H 127.0.0.1 -p ${WEB_PORT}`,
    url: `http://127.0.0.1:${WEB_PORT}/dev/preview/link`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:9',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'e2e-anon-key',
      NEXT_PUBLIC_EXTENSION_IDS: unpackedExtensionId(EXTENSION_DIR),
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },
})
