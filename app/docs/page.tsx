import type { Metadata } from "next"
import { Radar, ScanSearch, ShieldCheck, Boxes } from "lucide-react"
import { DocPage, DocLede, H2, P, Strong, NextSteps, DocTable } from "@/components/docs/doc-ui"

export const metadata: Metadata = {
  title: "Documentation — Karaxys",
  description: "How Karaxys discovers, inventories, and security-tests your APIs from real traffic.",
}

const changelog = [
  { version: "v0.8", date: "Jul 2026", note: "OWASP-mapped scan suites with live fan-out progress, redesigned scanner, and a full documentation site." },
  { version: "v0.7", date: "Jun 2026", note: "New marketing site, OAuth sign-in, and a refreshed dashboard shell." },
  { version: "v0.6", date: "May 2026", note: "Async scanner workers, issue deduplication, and scan progress timelines." },
  { version: "v0.5", date: "Apr 2026", note: "Queue-backed ingestion and runtime analyzer split into dedicated services." },
]

const pillars = [
  { icon: Radar, title: "Capture", body: "A Linux eBPF agent observes API traffic at the kernel — no SDKs, no proxies, no code changes." },
  { icon: Boxes, title: "Inventory", body: "Traffic is normalized into a live inventory of endpoints, schemas, and sensitive-data classifications." },
  { icon: ScanSearch, title: "Test", body: "A Nuclei-based scanner runs OWASP-mapped test suites against discovered endpoints, safely and on demand." },
  { icon: ShieldCheck, title: "Govern", body: "Findings are deduplicated into issues with RBAC, redaction, and audit logging across every tenant." },
]

export default function DocsOverview() {
  return (
    <DocPage>
      <DocLede
        eyebrow="Documentation"
        title="Welcome to Karaxys"
        description="Karaxys is a distributed API security platform. It discovers your APIs from real traffic, builds a continuously updated inventory with sensitive-data classification, and runs active security tests — without changing a line of application code."
      />

      <H2>What Karaxys does</H2>
      <P>
        Modern applications expose far more API surface than any team can track by hand. Karaxys closes
        that gap by watching real traffic and turning it into an actionable security picture. The platform
        is organized around four stages that form a continuous loop.
      </P>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {pillars.map((p) => (
          <div key={p.title} className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
            <span className="flex size-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800">
              <p.icon className="size-4 text-amber-400" />
            </span>
            <h3 className="mt-3 text-sm font-semibold text-slate-100">{p.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">{p.body}</p>
          </div>
        ))}
      </div>

      <H2>Why kernel-level capture</H2>
      <P>
        Traditional API discovery relies on SDKs you install in every service, or proxies you route
        traffic through. Both are invasive, incomplete, and easy to bypass. Karaxys instead captures at
        the operating-system layer using <Strong>eBPF</Strong>, so it sees traffic from any process on a
        host — including encrypted TLS connections — with zero instrumentation and negligible overhead.
      </P>

      <H2>How the pieces fit</H2>
      <P>
        The platform is split into independent services that communicate over a durable queue, so capture,
        analysis, and testing scale separately. At a glance:
      </P>
      <DocTable
        head={["Component", "Responsibility"]}
        rows={[
          [<Strong key="a">Capture agent</Strong>, "Kernel-space eBPF program + userspace assembler that reconstruct API conversations and ship them to the backend."],
          [<Strong key="b">Ingestion & analysis</Strong>, "Normalizes conversations, learns endpoint schemas, and classifies sensitive data into the inventory."],
          [<Strong key="c">Scanner workers</Strong>, "Execute security test suites against inventory endpoints under strict concurrency and rate controls."],
          [<Strong key="d">Dashboard & API</Strong>, "The interface and REST API for inventory, scans, findings, and account settings."],
        ]}
      />

      <H2 id="changelog">Changelog</H2>
      <P>
        A running log of what shipped recently. Newest first.
      </P>
      <ol className="mt-6 space-y-0 border-l border-slate-800">
        {changelog.map((entry) => (
          <li key={entry.version} className="relative pl-6 pb-6 last:pb-0">
            <span className="absolute -left-1.25 top-1.5 size-2.5 rounded-full border border-amber-500/40 bg-amber-500/30" />
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="font-semibold text-amber-400">{entry.version}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-500">{entry.date}</span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">{entry.note}</p>
          </li>
        ))}
      </ol>

      <NextSteps
        links={[
          { label: "Core concepts", href: "/docs/concepts", desc: "The vocabulary behind inventory, findings, and suites." },
          { label: "Architecture", href: "/docs/architecture", desc: "Services, data flow, and the technology stack." },
          { label: "Quick start", href: "/docs/getting-started", desc: "Stand up the platform and see your first inventory." },
          { label: "eBPF capture agent", href: "/docs/ebpf-agent", desc: "How traffic is captured at the kernel, in depth." },
        ]}
      />
    </DocPage>
  )
}
