import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, BookOpen, Plug, Rocket, ShieldCheck, Terminal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { MarketingShell, PageHeader } from "@/components/landing/marketing-shell"
import { Reveal } from "@/components/landing/reveal"

export const metadata: Metadata = {
  title: "Documentation — Karaxys",
  description: "Set up, configure, and operate the Karaxys API security platform.",
}

const sections = [
  {
    icon: Rocket,
    title: "Getting started",
    body: "Spin up the backend, dashboard, and an eBPF agent, then watch your inventory build itself.",
    links: ["Quick start", "Architecture overview", "Concepts & terminology"],
  },
  {
    icon: Plug,
    title: "Data sources",
    body: "Connect eBPF capture, active URL crawls, or imports from OpenAPI, Postman, and HAR.",
    links: ["eBPF Linux agent", "Active URL scanning", "OpenAPI / HAR import"],
  },
  {
    icon: Terminal,
    title: "API reference",
    body: "Authenticate and call the Karaxys API for inventory, scans, issues, and settings.",
    links: ["Authentication", "Inventory & endpoints", "Scans & issues"],
  },
  {
    icon: ShieldCheck,
    title: "Security & operations",
    body: "RBAC, redaction, retention, scan allowlists, and production hardening.",
    links: ["RBAC & accounts", "Redaction & retention", "Scan policy & SSRF protections"],
  },
]

const sidebarLinks = [
  { label: "Documentation", href: "/docs", active: true },
  { label: "Blog",          href: "/resources#blog" },
  { label: "GitHub",        href: "https://github.com/karaxys" },
  { label: "Discord",       href: "#" },
  { label: "Contact Us",    href: "/resources#contact" },
]

const sidebarSections = [
  {
    heading: "Introduction",
    links: ["Welcome to Karaxys", "Getting Started", "Security", "Performance"],
  },
  {
    heading: "Inventory",
    links: ["Endpoint Discovery", "Sensitive Data", "Authentication", "Custom Sensitive Data"],
  },
  {
    heading: "Detection",
    links: ["Attack Detection", "Attack Context"],
  },
  {
    heading: "Active Testing",
    links: ["Overview", "Custom Tests", "Test Contexts"],
  },
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

      <div className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="flex gap-12">
          {/* Sidebar */}
          <aside className="hidden w-52 shrink-0 lg:block">
            <nav className="sticky top-24 space-y-6">
              <ul className="space-y-1">
                {sidebarLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                        link.active
                          ? "bg-amber-500/10 font-medium text-amber-400"
                          : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="border-t border-slate-800/60 pt-6 space-y-6">
                {sidebarSections.map((sec) => (
                  <div key={sec.heading}>
                    <p className="px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
                      {sec.heading}
                    </p>
                    <ul className="mt-2 space-y-0.5">
                      {sec.links.map((link) => (
                        <li key={link}>
                          <span className="block rounded-md px-3 py-1.5 text-sm text-slate-500 transition-colors hover:bg-slate-800/60 hover:text-slate-300 cursor-pointer">
                            {link}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </nav>
          </aside>

          {/* Main content */}
          <div className="min-w-0 flex-1">
            {/* Doc section cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              {sections.map((section, i) => (
                <Reveal key={section.title} delay={(i % 2) * 80}>
                  <div className="group rounded-xl border border-slate-800 bg-slate-950/60 p-6 transition-colors hover:border-slate-700 hover:bg-slate-950">
                    <span className="flex size-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-800">
                      <section.icon className="size-5 text-amber-400" />
                    </span>
                    <h2 className="mt-4 text-base font-semibold text-slate-100">{section.title}</h2>
                    <p className="mt-1 text-sm text-slate-400">{section.body}</p>
                    <ul className="mt-4 space-y-2">
                      {section.links.map((link) => (
                        <li key={link}>
                          <span className="inline-flex items-center gap-1 text-sm text-amber-400 hover:underline cursor-pointer">
                            {link} <ArrowRight className="size-3" />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* Changelog */}
            <div id="changelog" className="mt-16">
              <h2 className="text-xl font-bold tracking-tight text-white">Changelog</h2>
              <div className="mt-6 space-y-3">
                {changelog.map((entry, i) => (
                  <Reveal key={entry.version} delay={i * 70}>
                    <div className="flex gap-4 rounded-xl border border-slate-800 bg-slate-950/40 p-5">
                      <Badge
                        variant="outline"
                        className="h-fit shrink-0 border-amber-500/30 text-amber-400"
                      >
                        {entry.version}
                      </Badge>
                      <div>
                        <p className="text-xs text-slate-500">{entry.date}</p>
                        <p className="mt-1 text-sm text-slate-300">{entry.note}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
              <p className="mt-8 text-sm text-slate-500">
                Looking for something specific?{" "}
                <Link href="/resources" className="text-amber-400 hover:underline">
                  Browse all resources
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </MarketingShell>
  )
}
