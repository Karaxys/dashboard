import Link from "next/link"
import { ShieldCheck, Radar, Lock } from "lucide-react"
import { Logo } from "@/components/landing/logo"

const highlights = [
  { icon: Radar, text: "Discover every API from live eBPF traffic" },
  { icon: ShieldCheck, text: "Continuous OWASP API security testing" },
  { icon: Lock, text: "Redaction-by-default, RBAC, and audit logs" },
]

// Split auth layout: branded panel on the left, form on the right.
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  footer: React.ReactNode
}) {
  return (
    <div className="grid min-h-screen bg-slate-950 text-slate-100 lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-center lg:p-12">
        {/* Amber horizon glow — wide, flat arc */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: [
              "radial-gradient(ellipse 150% 45% at 50% 102%, oklch(0.70 0.22 78 / 0.42) 0%, transparent 60%)",
              "radial-gradient(ellipse 180% 60% at 50% 102%, oklch(0.55 0.18 77 / 0.32) 0%, oklch(0.42 0.13 76 / 0.10) 45%, transparent 72%)",
            ].join(", "),
          }}
        />
        <Link href="/" className="absolute left-12 top-[26%] inline-block" aria-label="Karaxys home">
          <Logo size="lg" />
        </Link>
        <div className="relative">
          <h2 className="max-w-md text-3xl font-bold tracking-tight">
            See every API. <span className="text-amber-400">Secure</span> the ones that matter.
          </h2>
          <ul className="mt-8 space-y-4">
            {highlights.map((h) => (
              <li key={h.text} className="flex items-center gap-3 text-slate-300">
                <span className="flex size-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60">
                  <h.icon className="size-4 text-amber-400" />
                </span>
                {h.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="absolute bottom-12 left-12 text-sm text-slate-500">
          © {new Date().getFullYear()} Karaxys
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Link href="/" aria-label="Karaxys home">
              <Logo />
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-8 text-center text-sm text-slate-400">{footer}</div>
        </div>
      </div>
    </div>
  )
}
