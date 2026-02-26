'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

interface DashboardHeaderProps {
  title: string
  userEmail?: string
}

export default function DashboardHeader({ title, userEmail }: DashboardHeaderProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
      <h1 className="text-lg font-bold text-slate-100">{title}</h1>

      <div className="flex items-center gap-4">
        {userEmail && (
          <span className="text-xs text-slate-500 hidden sm:block truncate max-w-48">
            {userEmail}
          </span>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          title="Sign out"
        >
          <LogOut size={18} strokeWidth={1.75} />
          Sign Out
        </button>
      </div>
    </header>
  )
}
