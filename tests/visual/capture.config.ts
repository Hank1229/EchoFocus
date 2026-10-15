import { defineConfig } from '@playwright/test'

// Asset capture, not a test: demo-popup.capture.ts writes the popup pictures
// the /demo Today page shows. Run it with `pnpm capture:demo-popup`, which
// uses the visual suite's Docker image so the fonts match the baselines.
if (process.env.VRT_IN_DOCKER !== '1') {
  throw new Error('Run the capture with `pnpm capture:demo-popup` (Docker), not directly.')
}

export default defineConfig({
  testDir: '.',
  testMatch: 'demo-popup.capture.ts',
  outputDir: './test-results',
  timeout: 60_000,
  workers: 1,
  reporter: [['list']],
})
