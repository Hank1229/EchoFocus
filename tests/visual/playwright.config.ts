import { defineConfig } from '@playwright/test'

// Screenshots only compare when they come from the same renderer, so the
// suite runs in the pinned Playwright Linux image, locally through
// tests/visual/docker.sh and in CI as the job's container.
if (!process.env.CI && process.env.VRT_IN_DOCKER !== '1') {
  throw new Error('Run the visual suite with `pnpm test:visual` (Docker), not directly.')
}

const WEB_PORT = 3100

export default defineConfig({
  testDir: '.',
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  outputDir: './test-results',
  timeout: 60_000,
  workers: 2,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: './playwright-report', open: 'never' }]],
  expect: {
    timeout: 15_000,
    toHaveScreenshot: {
      // A pixel counts as different past threshold 0.2 (anti-aliasing shifts
      // stay under it); one counted pixel fails the shot, so a 1px layout
      // shift fails while the renderer's noise does not.
      threshold: 0.2,
      maxDiffPixels: 0,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    },
  },
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
  },
  projects: [
    { name: 'extension', testMatch: 'extension.spec.ts' },
    { name: 'dashboard', testMatch: 'dashboard.spec.ts' },
  ],
  webServer: {
    command: `pnpm --filter @echofocus/web exec next dev -p ${WEB_PORT}`,
    url: `http://localhost:${WEB_PORT}/dev/preview/guide`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      // Unreachable on purpose: the preview pages must never touch real data.
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:9',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'vrt-anon-key',
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },
})
