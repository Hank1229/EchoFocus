// Falls back to production, never localhost: a build without the env var set
// still has to send users somewhere real.
export const DASHBOARD_URL =
  (import.meta.env.VITE_DASHBOARD_URL as string | undefined) ?? 'https://echo-focus-web.vercel.app'
