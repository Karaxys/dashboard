import type { ReactNode } from "react"
import { MarketingShell } from "@/components/landing/marketing-shell"
import { DocsSidebar } from "@/components/docs/docs-sidebar"

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
        <div className="flex gap-12">
          <DocsSidebar />
          {children}
        </div>
      </div>
    </MarketingShell>
  )
}
