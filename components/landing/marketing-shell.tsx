import type { ReactNode } from "react"
import { LandingNavbar } from "./navbar"
import { LandingFooter } from "./footer"

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <LandingNavbar />
      <main className="pt-16">{children}</main>
      <LandingFooter />
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <p className="font-mono text-sm font-semibold uppercase tracking-widest text-amber-400">{eyebrow}</p>
        <h1 className="mt-3 font-mono text-4xl font-bold tracking-tight text-white sm:text-5xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-slate-400">{description}</p>
      </div>
    </section>
  )
}
