// DESIGN.md section 5 forbids entrance animations; the template previously
// played a fade-and-rise on every navigation. It stays as a plain wrapper so
// per-navigation remount semantics (scroll reset, effect re-runs) survive.
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <div className="flex min-w-0 flex-1 flex-col">{children}</div>
}
