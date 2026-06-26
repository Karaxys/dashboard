"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthShell } from "@/components/auth/auth-shell"
import { OAuthButtons } from "@/components/auth/oauth-buttons"
import { useAuth } from "@/lib/auth"
import { oauthErrorMessage } from "@/lib/oauth-errors"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status, login } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const code = searchParams.get("error")
    if (code) setError(oauthErrorMessage(code))
  }, [searchParams])

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard")
  }, [status, router])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email || !password) {
      setError("Enter your email and password.")
      return
    }
    setSubmitting(true)
    try {
      await login(email, password)
      router.replace("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <OAuthButtons />
      <div className="my-6 flex items-center gap-3 text-xs text-slate-500">
        <span className="h-px flex-1 bg-slate-800" />
        OR CONTINUE WITH EMAIL
        <span className="h-px flex-1 bg-slate-800" />
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
        >
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!error}
            className="border-slate-800 bg-slate-950"
            placeholder="you@company.com"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!error}
            className="border-slate-800 bg-slate-950"
            placeholder="••••••••"
          />
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="h-10 w-full rounded-full bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
        </Button>
      </form>
    </>
  )
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your Karaxys workspace."
      footer={
        <>
          New to Karaxys?{" "}
          <Link href="/signup" className="font-medium text-amber-400 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <Suspense fallback={<div className="h-64" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  )
}
