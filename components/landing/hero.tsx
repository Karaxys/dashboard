import Link from "next/link"
import { ArrowRight, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Reveal } from "./reveal"
import { TrafficCanvas } from "./traffic-canvas"
import { Beams } from "./beams"

const liveRows = [
  { method: "GET", path: "/api/v2/users/{id}", risk: "CRITICAL", tone: "text-rose-400", tag: "BOLA" },
  { method: "POST", path: "/api/v2/auth/login", risk: "MEDIUM", tone: "text-amber-300", tag: "Auth" },
  { method: "GET", path: "/api/v2/orders/export", risk: "HIGH", tone: "text-orange-400", tag: "PII" },
  { method: "PUT", path: "/internal/admin/flags", risk: "HIGH", tone: "text-orange-400", tag: "Shadow" },
  { method: "GET", path: "/api/v2/health", risk: "LOW", tone: "text-emerald-400", tag: "Public" },
]

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-24 sm:pt-40">
      <div className="grid-backdrop pointer-events-none absolute inset-0" aria-hidden />
      <TrafficCanvas className="opacity-90" />
      <Beams count={7} />
      <div className="glow-blob pointer-events-none absolute left-1/2 top-[-10%] h-[460px] w-[860px] -translate-x-1/2" aria-hidden />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-background/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            eBPF-powered API discovery & continuous security testing
          </span>
          <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            See every API.<br />
            <span className="text-gradient">Secure</span> the ones that matter.
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-lg text-muted-foreground">
            Karaxys captures live traffic at the kernel with eBPF, builds a complete API inventory,
            classifies sensitive data, and continuously tests for OWASP API risks — with no code
            changes, no SDKs, and no agents in your application.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="font-semibold">
              <Link href="/signup">
                Start free <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/dashboard">View live dashboard</Link>
            </Button>
          </div>
          <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" />
            Redaction-by-default · RBAC · SSRF-safe scanning
          </p>
        </Reveal>

        <Reveal delay={140}>
          <div className="lift-card glass-panel relative rounded-2xl border p-1.5 animate-float">
            <div className="flex items-center gap-1.5 px-3 py-2">
              <span className="size-2.5 rounded-full bg-rose-400/70" />
              <span className="size-2.5 rounded-full bg-amber-300/70" />
              <span className="size-2.5 rounded-full bg-emerald-400/70" />
              <span className="ml-3 text-xs text-muted-foreground">karaxys · live capture</span>
              <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" /> streaming
              </span>
            </div>
            <div className="rounded-xl bg-black/30 p-3 font-mono text-xs">
              <div className="grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-2.5">
                {liveRows.map((row) => (
                  <div key={row.path} className="contents">
                    <span className="text-sky-400">{row.method}</span>
                    <span className="truncate text-slate-300">{row.path}</span>
                    <span className={row.tone}>{row.risk}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-[11px] text-muted-foreground">
                <span>1,284 endpoints discovered</span>
                <span className="text-primary">43 open risks</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
