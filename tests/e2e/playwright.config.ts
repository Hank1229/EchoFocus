import { defineConfig } from '@playwright/test'

// End-to-end tests of the built extension (apps/extension/dist-vrt, the same
// build the visual suite loads). Nothing here compares pixels, so the suite
// runs on any Chromium: locally with `pnpm test:e2e`, in CI inside the
// Playwright image. Every spec launches its own browser and the tracking
// tests measure real time, so they run one at a time.
export default defineConfig({
  testDir: '.',
  outputDir: './test-results',
  timeout: 120_000,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  expect: { timeout: 15_000 },
})
