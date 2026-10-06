// Builds the extension the visual suite loads, into its own folder so the
// dist/ you load in Chrome is never replaced. Supabase points at a closed
// local port: the suite must never reach real data.
import { execFileSync } from 'node:child_process'

execFileSync('pnpm', ['--filter', '@echofocus/extension', 'exec', 'vite', 'build', '--outDir', 'dist-vrt', '--emptyOutDir'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_SUPABASE_URL: 'http://127.0.0.1:9',
    VITE_SUPABASE_ANON_KEY: 'vrt-anon-key',
    VITE_SUPABASE_FUNCTIONS_URL: 'http://127.0.0.1:9/functions/v1',
    VITE_DASHBOARD_URL: 'http://127.0.0.1:9',
  },
})
