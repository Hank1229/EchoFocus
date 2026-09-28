'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLocale } from '@/lib/i18n'
import { LogOut } from 'lucide-react'
import { tellExtension } from '@/lib/extension-bridge'

export default function SignOutButton() {
  const router = useRouter()
  const { t } = useLocale()

  const handleSignOut = async () => {
    const supabase = createClient()
    // Product rule: one account, both surfaces together. The event drops the
    // extension's local session now; the global revoke is what makes it stick
    // (and the fallback the extension checks on its next popup open).
    tellExtension('signed-out')
    await supabase.auth.signOut({ scope: 'global' })
    router.push('/')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className="pressable flex items-center gap-1.5 rounded-md border border-line px-4 py-2 text-label text-content-secondary hover:border-line-strong hover:text-content"
    >
      <LogOut size={14} strokeWidth={1.5} />
      {t.settings.signOut}
    </button>
  )
}
