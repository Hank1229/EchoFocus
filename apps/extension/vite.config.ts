import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import path from 'path'
import manifest from './manifest.json'
import { externallyConnectableMatches } from './src/lib/handoff'

export default defineConfig(({ mode }) => {
  // The dashboard may message the extension from production only, plus the
  // dashboard this build points at (VITE_DASHBOARD_URL, e.g. localhost for a
  // local test build). loadEnv gives a value set in the shell priority over
  // .env, the same order import.meta.env uses at runtime.
  const { VITE_DASHBOARD_URL } = loadEnv(mode, __dirname, 'VITE_')
  return {
    plugins: [
      react(),
      crx({
        manifest: {
          ...manifest,
          externally_connectable: { matches: externallyConnectableMatches(VITE_DASHBOARD_URL || undefined) },
        },
      }),
    ],
    resolve: {
      alias: {
        // Longest first — a bare '@echofocus/shared' prefix alias would splice
        // subpaths onto index.ts ("index.ts/ui").
        '@echofocus/shared/ui': path.resolve(__dirname, '../../packages/shared/src/ui/index.ts'),
        '@echofocus/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
        '@': path.resolve(__dirname, './src'),
      },
    },
    // Prevent Vite from treating chrome API as external
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    },
    build: {
      rollupOptions: {
        input: {
          onboarding: path.resolve(__dirname, 'src/onboarding/index.html'),
        },
      },
    },
  }
})
