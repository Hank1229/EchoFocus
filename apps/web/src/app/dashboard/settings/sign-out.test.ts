import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { signOutOfDashboard } from './sign-out'

describe('signOutOfDashboard', () => {
  it('ends only this session, leaving the extension signed in', async () => {
    const calls: unknown[] = []
    const supabase = {
      auth: { signOut: async (options: unknown) => { calls.push(options); return { error: null } } },
    } as unknown as SupabaseClient
    await signOutOfDashboard(supabase)
    expect(calls).toEqual([{ scope: 'local' }])
  })
})
