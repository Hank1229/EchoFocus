import SettingsScreen from '@/demo/SettingsScreen'

export default async function DemoSettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  return <SettingsScreen tab={tab} />
}
