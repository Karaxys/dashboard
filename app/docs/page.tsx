import type { Metadata } from "next"
import Link from "next/link"
import { Rocket, Plug, ShieldCheck, Terminal, ArrowUpRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MarketingShell, PageHeader } from "@/components/landing/marketing-shell"
import { Reveal } from "@/components/landing/reveal"

export const metadata: Metadata = {
  title: "Documentation — Karaxys",
  description: "Set up, configure, and operate the Karaxys API security platform.",
}

const sections = [
  { icon: Rocket, title: "Getting started", body: "Spin up the backend, dashboard, and an eBPF agent, then watch your inventory build itself.", links: ["Quick start", "Architecture overview", "Concepts & terminology"] },
  { icon: Plug, title: "Data sources", body: "Connect eBPF capture, active URL crawls, or imports from OpenAPI, Postman, and HAR.", links: ["eBPF Linux agent", "Active URL scanning", "OpenAPI / HAR import"] },
  { icon: Terminal, title: "API reference", body: "Authenticate and call the Karaxys API for inventory, scans, issues, and settings.", links: ["Authentication", "Inventory & endpoints", "Scans & issues"] },
  { icon: ShieldCheck, title: "Security & operations", body: "RBAC, redaction, retention, scan allowlists, and production hardening.", links: ["RBAC & accounts", "Redaction & retention", "Scan policy & SSRF protections"] },
]

const changelog = [
  { version: "v0.7", date: "Jun 2026", note: "New marketing site, OAuth sign-in, and a refreshed dashboard shell." },
  { version: "v0.6", date: "May 2026", note: "Async scanner workers, issue deduplication, and scan progress timelines." },
  { version: "v0.5", date: "Apr 2026", note: "Queue-backed ingestion and runtime analyzer split into dedicated services." },
]

export default function DocsPage() {
  return (
    <MarketingShell>
      <PageHeader
        eyebrow="Documentation"
        title="Everything you need to run Karaxys"
        description="Guides and references for setting up data sources, operating the platform, and integrating with your stack."
      />

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2">
            {sections.map((section, i) => (
              <Reveal key={section.title} delay={(i % 2) * 80}>
                <Card className="lift-card glass-panel h-full">
                  <CardContent className="p-6">
                    <span className="glass-chip flex size-10 items-center justify-center rounded-xl">
                      <section.icon className="size-5 text-primary" />
                    </span>
                    <h2 className="mt-4 text-lg font-semibold">{section.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{section.body}</p>
                    <ul className="mt-4 space-y-2">
                      {section.links.map((link) => (
                        <li key={link}>
                          <span className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                            {link} <ArrowUpRight className="size-3.5" />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="changelog" className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight">Changelog</h2>
          <div className="mt-8 space-y-4">
            {changelog.map((entry, i) => (
              <Reveal key={entry.version} delay={i * 70}>
                <div className="glass-panel flex gap-4 rounded-2xl border p-5">
                  <Badge variant="outline" className="h-fit border-primary/20 text-primary">{entry.version}</Badge>
                  <div>
                    <p className="text-xs text-muted-foreground">{entry.date}</p>
                    <p className="mt-1 text-sm">{entry.note}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-10 text-sm text-muted-foreground">
            Looking for something specific?{" "}
            <Link href="/resources" className="text-primary hover:underline">Browse all resources</Link>.
          </p>
        </div>
      </section>
    </MarketingShell>
  )
}
