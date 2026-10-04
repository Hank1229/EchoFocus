import { z } from 'zod'

const storedSession = z.object({ user: z.object({ email: z.string().min(1) }) })

// The email of the signed-in account, read from the session supabase-js keeps
// as a JSON string under supabase_session. Read-only: no client, no refresh.
export function accountEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  try {
    const parsed = storedSession.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data.user.email : null
  } catch {
    return null
  }
}
