import { AppSidebar } from "@/components/sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { Protected } from "@/components/auth/protected"
import { DashboardShell } from "@/components/quick-start/dashboard-shell"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Protected>
      <DashboardShell>
        <AppSidebar />
        <SidebarInset>
          {children}
        </SidebarInset>
      </DashboardShell>
    </Protected>
  )
}
