import { Github } from "lucide-react"
import { getApiBaseUrl } from "@/lib/config"

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.3 14.6 2.4 12 2.4 6.9 2.4 2.8 6.5 2.8 11.6S6.9 20.8 12 20.8c5.4 0 9-3.8 9-9.1 0-.6-.07-1.1-.16-1.5H12z" />
    </svg>
  )
}

// Full-page navigation to the backend OAuth start endpoint (not fetch), so the
// provider redirect flow and HttpOnly cookies work correctly.
export function OAuthButtons() {
  const start = (provider: string) => `${getApiBaseUrl()}/auth/oauth/${provider}`
  return (
    <div className="grid grid-cols-2 gap-3">
      <a
        href={start("google")}
        className="flex h-10 items-center justify-center gap-2 rounded-md border border-slate-800 bg-slate-950 text-sm font-medium text-slate-200 transition-colors hover:border-slate-700 hover:bg-slate-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
      >
        <GoogleIcon />
        Google
      </a>
      <a
        href={start("github")}
        className="flex h-10 items-center justify-center gap-2 rounded-md border border-slate-800 bg-slate-950 text-sm font-medium text-slate-200 transition-colors hover:border-slate-700 hover:bg-slate-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
      >
        <Github className="size-4" />
        GitHub
      </a>
    </div>
  )
}
