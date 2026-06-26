"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth"

// Client-side guard for authenticated areas. The backend is the real enforcer
// (every API call 401s without a valid session); this gates the UI and routes
// unauthenticated users to /login, preserving where they were headed.
export function Protected({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === "guest") {
      const next = pathname && pathname !== "/dashboard" ? `?next=${encodeURIComponent(pathname)}` : ""
      router.replace(`/login${next}`)
    }
  }, [status, router, pathname])

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="size-6 animate-spin text-amber-400" />
      </div>
    )
  }
  return <>{children}</>
}
