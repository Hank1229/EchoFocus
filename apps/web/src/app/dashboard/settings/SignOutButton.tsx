'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLocale } from '@/lib/i18n'
import { LogOut } from 'lucide-react'

export default function SignOutButton() {
  const router = useRouter()
  const { t } = useLocale()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-1.5 px-4 py-2 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
    >
      <LogOut size={14} strokeWidth={1.75} />
      {t.settings.signOut}
    </button>
  )
}
