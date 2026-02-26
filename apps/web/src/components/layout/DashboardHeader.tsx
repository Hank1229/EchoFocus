'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface DashboardHeaderProps {
  title: string
  userEmail?: string
}

export default function DashboardHeader({ title: _title, userEmail }: DashboardHeaderProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2">
        <Image src="/images/logo-icon.png" alt="EchoFocus logo" width={32} height={32} className="rounded-lg" />
        <span className="font-bold text-sm tracking-wide hidden md:inline">
          <span style={{ color: '#E2E8F0' }}>Echo</span><span style={{ color: '#2DD4BF' }}>Focus</span>
        </span>
      </Link>

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
