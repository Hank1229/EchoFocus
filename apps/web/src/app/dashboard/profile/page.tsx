import { redirect } from 'next/navigation'

// Profile merged into Settings → Account; old links keep working.
export default function ProfileRedirect() {
  redirect('/dashboard/settings?tab=account')
}
