"use client"

import React from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { QuickStartProvider } from "./quick-start-context"
import { QuickStartSheet } from "./quick-start-sheet"

/**
 * DashboardShell is the client-side wrapper for the dashboard layout.
 * It owns the QuickStart context so both the Sidebar trigger and the Sheet
 * can share state without prop drilling or a separate route.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <QuickStartProvider>
      <SidebarProvider>
        {children}
        <QuickStartSheet />
      </SidebarProvider>
    </QuickStartProvider>
  )
}
