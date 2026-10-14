import type { SupabaseClient } from '@supabase/supabase-js'

// The dashboard and the extension each hold their own session, so this ends
// the dashboard's alone: a signed-in extension keeps uploading until it is
// signed out in its own Options page.
export async function signOutOfDashboard(supabase: SupabaseClient): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' })
}
