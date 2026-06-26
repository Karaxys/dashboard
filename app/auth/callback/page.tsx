"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth"

// Landing page for the OAuth redirect: the backend has set the HttpOnly refresh
// cookie, so we exchange it for an access token and enter the dashboard.
export default function OAuthCallbackPage() {
  const router = useRouter()
  const { refresh } = useAuth()
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true
    void (async () => {
      const ok = await refresh()
      router.replace(ok ? "/dashboard" : "/login?error=session_failed")
    })()
  }, [refresh, router])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 text-slate-300">
      <Loader2 className="size-6 animate-spin text-amber-400" />
      <p className="text-sm">Completing sign in…</p>
    </div>
  )
}
