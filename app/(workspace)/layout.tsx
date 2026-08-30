import { AppShell } from "@/components/app-shell"
import { FixtureProvider } from "@/components/fixture-provider"

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <FixtureProvider>
      <AppShell>{children}</AppShell>
    </FixtureProvider>
  )
}
