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

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status, signup } = useAuth()

  const [name, setName] = useState("")
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
    if (!name.trim()) return setError("Enter your name.")
    if (!email) return setError("Enter your email.")
    if (password.length < 8) return setError("Password must be at least 8 characters.")

    setSubmitting(true)
    try {
      await signup({ name: name.trim(), email, password })
      router.replace("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <OAuthButtons />
      <div className="my-6 flex items-center gap-3 text-xs text-slate-500">
        <span className="h-px flex-1 bg-slate-800" />
        OR SIGN UP WITH EMAIL
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
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border-slate-800 bg-slate-950"
            placeholder="Ada Lovelace"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-slate-800 bg-slate-950"
            placeholder="you@company.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-slate-800 bg-slate-950"
            placeholder="At least 8 characters"
          />
          <p className="text-xs text-slate-500">Use 8+ characters with a mix of letters and numbers.</p>
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="h-10 w-full rounded-full bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : "Create account"}
        </Button>
      </form>
    </>
  )
}

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Start discovering and securing your APIs in minutes."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-amber-400 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <Suspense fallback={<div className="h-72" />}>
        <SignupForm />
      </Suspense>
    </AuthShell>
  )
}
