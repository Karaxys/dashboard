import Link from "next/link"
import {
  CheckCircle2,
  Database,
  KeyRound,
  ShieldHalf,
  Network,
  Boxes,
  ArrowRight,
  Lock,
  GitBranch,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Section, SectionHeading } from "./section"
import { Reveal } from "./reveal"
import { Pipeline } from "./pipeline"
import { FindingsMockup, InventoryMockup } from "./mockups"

// ─── Feature: Detect ────────────────────────────────────────────────────────

const detectBullets = [
  {
    title: "Near-zero false positives",
    body: "eBPF captures ground truth from actual traffic — no synthetic probes, no guesswork.",
  },
  {
    title: "50+ OWASP API tests",
    body: "BOLA, BFLA, broken auth, mass assignment, and excessive data exposure tested continuously.",
  },
  {
    title: "User & session-level context",
    body: "Every finding is tied to the exact user, session, and role that triggered it.",
  },
  {
    title: "Risk scored from day one",
    body: "No manual tuning — endpoints ranked by auth status, exposure, and live test results.",
  },
]

export function FeatureDetect() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">
              Detection
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Detect API risks the moment they appear
            </h2>
            <p className="mt-4 text-slate-400">
              Karaxys runs continuous active security tests against your discovered endpoints,
              modeled on real attacker techniques — not just passively watching traffic.
            </p>
            <ul className="mt-8 space-y-5">
              {detectBullets.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-amber-400" />
                  <div>
                    <p className="font-semibold text-slate-100">{item.title}</p>
                    <p className="mt-0.5 text-sm text-slate-400">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={100}>
            <FindingsMockup />
          </Reveal>
        </div>
      </div>
    </section>
  )
}

// ─── Feature: Inventory ──────────────────────────────────────────────────────

const inventoryFeatures = [
  { icon: Database,  title: "Endpoints",      body: "Surface shadow, deprecated, and undocumented APIs from real kernel-captured traffic." },
  { icon: ShieldHalf,title: "Sensitive Data", body: "PII, secrets, and tokens classified per endpoint and per response field." },
  { icon: KeyRound,  title: "Authentication", body: "Map auth coverage — know exactly which endpoints are exposed without auth." },
  { icon: Lock,      title: "Data Redaction", body: "Sensitive values masked before any storage or scan proof is written." },
  { icon: Network,   title: "Schema Learning",body: "Automatic parameter types and request/response schema inference over time." },
  { icon: Boxes,     title: "K8s Aware",      body: "Every API enriched with container, image, namespace, and pod-level context." },
]

export function FeatureInventory() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <Reveal>
            <InventoryMockup />
          </Reveal>

          <Reveal delay={100}>
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">
              Inventory
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Build a complete API inventory automatically
            </h2>
            <p className="mt-4 text-slate-400">
              Karaxys discovers every endpoint your services expose — including the shadow APIs your
              gateways, scanners, and docs never captured.
            </p>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {inventoryFeatures.map((feat) => (
                <div key={feat.title} className="flex gap-3">
                  <feat.icon className="mt-0.5 size-4 shrink-0 text-amber-400" />
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{feat.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{feat.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

// ─── Feature: Security (Metlo-style two-col) ─────────────────────────────────

const securityPoints = [
  {
    icon: Lock,
    title: "Redaction before persistence",
    body: "Secrets and PII are masked before any storage, sample, or scan proof is written.",
  },
  {
    icon: KeyRound,
    title: "RBAC & account scoping",
    body: "Every read and write is scoped to an account and gated by role.",
  },
  {
    icon: GitBranch,
    title: "Auditable by design",
    body: "Signup, login, scans, and configuration changes are written to immutable audit logs.",
  },
]

export function Security() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">
              Security first
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              A security tool that holds itself to a higher standard
            </h2>
            <p className="mt-4 text-slate-400">
              Karaxys is engineered so the platform never becomes a source of leaks. Sensitive data
              is redacted before it is ever stored, access is scoped and audited, and active testing
              is guarded by SSRF protections, target allowlists, and rate limits.
            </p>
            <Button
              asChild
              variant="outline"
              className="mt-8 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white"
            >
              <Link href="/signup">
                Explore the platform <ArrowRight className="size-4" />
              </Link>
            </Button>
          </Reveal>

          <div className="space-y-4">
            {securityPoints.map((point, i) => (
              <Reveal key={point.title} delay={i * 80}>
                <div className="flex gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800">
                    <point.icon className="size-5 text-amber-400" />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-100">{point.title}</p>
                    <p className="mt-1 text-sm text-slate-400">{point.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Workflow (How it works) — preserved ─────────────────────────────────────

export function Workflow() {
  return (
    <Section id="workflow">
      <SectionHeading
        eyebrow="How it works"
        title="Capture, analyze, and act — continuously"
        description="A decoupled write/read pipeline keeps ingestion fast while analysis and active testing scale independently."
      />
      <Pipeline />
    </Section>
  )
}

// ─── CTA — preserved ─────────────────────────────────────────────────────────

export function CallToAction() {
  return (
    <section
      className="relative overflow-hidden py-40"
      style={{
        background: [
          "radial-gradient(ellipse 70% 50% at 50% 50%, oklch(0.55 0.16 83 / 0.45) 0%, oklch(0.34 0.10 82 / 0.30) 45%, transparent 72%)",
          "radial-gradient(ellipse 85% 65% at 50% 50%, oklch(0.26 0.08 82 / 0.55) 0%, transparent 70%)",
          "repeating-radial-gradient(circle at 50% 50%, transparent 0, transparent 38px, oklch(0.65 0.15 84 / 0.10) 38px, oklch(0.65 0.15 84 / 0.10) 39px)",
        ].join(", "),
      }}
    >
      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <Reveal>
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Bring every API into view today
          </h2>
          <p className="mt-6 mx-auto max-w-xl text-lg text-slate-400">
            Spin up Karaxys, connect a data source, and watch your API inventory and risk posture
            build itself in real time.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400"
            >
              <Link href="/signup">
                Get started <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white"
            >
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
