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

const storedSessionUser = z.object({ user: z.object({ id: z.string().min(1) }) })

// The signed-in account's id, read the same way: the dashboard's status
// check must not build a client or trigger a token refresh.
export function accountUserId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  try {
    const parsed = storedSessionUser.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data.user.id : null
  } catch {
    return null
  }
}
