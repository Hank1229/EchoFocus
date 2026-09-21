import { redirect } from 'next/navigation'

// Site rules live in Settings → Categories now; old links keep working.
export default function RulesRedirect() {
  redirect('/dashboard/settings?tab=categories')
}
