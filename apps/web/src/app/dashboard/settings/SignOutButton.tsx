'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLocale } from '@/lib/i18n'
import { DemoNote, useReadOnly } from '@/lib/demo'
import { LogOut } from 'lucide-react'
import { signOutOfDashboard } from './sign-out'

export default function SignOutButton() {
  const router = useRouter()
  const { t } = useLocale()
  const { readOnly, title } = useReadOnly()

  const handleSignOut = async () => {
    await signOutOfDashboard(createClient())
    router.push('/')
    router.refresh()
  }

  return (
    <>
      <button
        onClick={handleSignOut}
        disabled={readOnly}
        title={title}
        className="pressable flex items-center gap-1.5 rounded-md border border-line px-4 py-2 text-label text-content-secondary hover:border-line-strong hover:text-content disabled:cursor-not-allowed disabled:opacity-50"
      >
        <LogOut size={14} strokeWidth={1.5} />
        {t.settings.signOut}
      </button>
      <DemoNote />
    </>
  )
}
