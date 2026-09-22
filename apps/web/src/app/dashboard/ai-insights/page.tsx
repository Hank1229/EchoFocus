import { redirect } from 'next/navigation'

// The snapshot page merged into Today's review (DESIGN.md section 8); the old
// route stays as a redirect so bookmarks and the extension's older links land
// somewhere sensible.
export default function AiInsightsPage() {
  redirect('/dashboard/today')
}
