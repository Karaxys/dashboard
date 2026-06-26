import { AppSidebar } from "@/components/sidebar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Protected } from "@/components/auth/protected"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Protected>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </Protected>
  )
}