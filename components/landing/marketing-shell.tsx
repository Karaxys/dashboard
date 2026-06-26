import { LandingNavbar } from "./navbar"
import { LandingFooter } from "./footer"

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNavbar />
      <main className="pt-16">{children}</main>
      <LandingFooter />
    </div>
  )
}

export function PageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <section className="relative overflow-hidden border-b border-white/5 py-20">
      <div className="grid-backdrop pointer-events-none absolute inset-0" aria-hidden />
      <div className="glow-blob pointer-events-none absolute left-1/2 top-[-30%] h-80 w-[700px] -translate-x-1/2" aria-hidden />
      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">{description}</p>
      </div>
    </section>
  )
}
