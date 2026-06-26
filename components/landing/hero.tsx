import Image from "next/image"
import Link from "next/link"
import { ArrowRight, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Reveal } from "./reveal"

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-32 sm:pt-36 sm:pb-40">

      {/* Rising-sun horizon — bright amber dome whose center sits just below the fold, so only the rising curve shows */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            /* tight bright amber core rising from the very bottom edge */
            "radial-gradient(ellipse 55% 70% at 50% 100%, oklch(0.70 0.22 78 / 0.55) 0%, transparent 60%)",
            /* tall amber dome fading high up into the dark sky */
            "radial-gradient(ellipse 95% 110% at 50% 100%, oklch(0.55 0.18 77 / 0.45) 0%, oklch(0.42 0.13 76 / 0.12) 45%, transparent 72%)",
          ].join(", "),
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-[5fr_7fr] lg:gap-16">

          {/* Left: text */}
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
              <span className="size-1.5 animate-pulse rounded-full bg-amber-400" />
              eBPF-powered · No code changes required
            </div>
            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              See every API.<br />
              <span className="text-amber-400">Secure</span> the ones<br />
              that matter.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-400">
              Karaxys captures live traffic at the kernel with eBPF, builds a complete
              API inventory, and{" "}
              <span className="text-slate-200">continuously tests for OWASP API risks</span>
              {" "}— with no SDKs, no agents, and no code changes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400"
              >
                <Link href="/signup">
                  Try Karaxys for Free <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white"
              >
                <Link href="/dashboard">View live dashboard</Link>
              </Button>
            </div>
            <p className="mt-6 flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="size-4 text-amber-500/70" />
              Redaction-by-default · RBAC · SSRF-safe scanning
            </p>
          </Reveal>

          {/* Right: product screenshot — tilted in perspective */}
          <Reveal delay={100}>
            <div
              className="overflow-hidden rounded-2xl border border-slate-700/50 shadow-2xl shadow-amber-950/40 ring-1 ring-white/5"
              style={{
                transform: "perspective(1400px) rotateX(8deg) rotateY(-4deg) rotateZ(1.5deg)",
                transformOrigin: "center top",
              }}
            >
              <Image
                src="/hero.png"
                alt="Karaxys dashboard — live API capture and risk view"
                width={1280}
                height={800}
                className="w-full h-auto"
                priority
              />
            </div>
          </Reveal>

        </div>
      </div>
    </section>
  )
}
