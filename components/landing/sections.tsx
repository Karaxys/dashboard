import Link from "next/link"
import {
  Radar,
  Database,
  ShieldAlert,
  Activity,
  Lock,
  Boxes,
  Network,
  GitBranch,
  KeyRound,
  ArrowRight,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Section, SectionHeading } from "./section"
import { Reveal } from "./reveal"
import { Pipeline } from "./pipeline"

const capabilities = [
  {
    icon: Radar,
    title: "Passive API discovery",
    body: "Surface shadow, deprecated, and undocumented endpoints from real traffic captured at the kernel — no SDKs, proxies, or app changes.",
  },
  {
    icon: Database,
    title: "Sensitive data classification",
    body: "Detect PII, secrets, tokens, and credentials in requests and responses, with deterministic redaction applied before anything is stored.",
  },
  {
    icon: ShieldAlert,
    title: "Active security testing",
    body: "Run BOLA, BFLA, broken auth, and excessive-data-exposure checks safely from captured samples with role-based attacker contexts.",
  },
  {
    icon: Activity,
    title: "Risk scoring engine",
    body: "Rank every endpoint by auth status, exposure, sensitive data, and live test findings so teams fix what matters first.",
  },
  {
    icon: Network,
    title: "Schema & parameter learning",
    body: "Automatically learn request/response schemas, headers, and per-parameter sensitivity and confidence over time.",
  },
  {
    icon: Boxes,
    title: "Container & Kubernetes aware",
    body: "Enrich every conversation with container, image, namespace, pod, and node metadata for workload-level context.",
  },
]

const useCases = [
  {
    title: "Shadow API discovery",
    body: "Find APIs your inventory, gateways, and docs never knew existed — before an attacker maps them for you.",
  },
  {
    title: "Pre-release security gates",
    body: "Catch BOLA and broken authorization on new and changed endpoints before they reach production.",
  },
  {
    title: "Sensitive data governance",
    body: "Prove exactly which endpoints expose PII and secrets, with redacted evidence ready for audits and reviews.",
  },
]

const securityPoints = [
  { icon: Lock, title: "Redaction before persistence", body: "Secrets and PII are masked before any storage, sample, or scan proof is written." },
  { icon: KeyRound, title: "RBAC & account scoping", body: "Every read and write is scoped to an account and gated by role." },
  { icon: GitBranch, title: "Auditable by design", body: "Signup, login, scans, and configuration changes are written to immutable audit logs." },
]

export function Capabilities() {
  return (
    <Section id="platform" lines>
      <SectionHeading
        eyebrow="Platform"
        title="One platform for API visibility and defense"
        description="From discovery to active testing, Karaxys covers the full API security lifecycle on a single durable, queue-backed pipeline."
      />
      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {capabilities.map((cap, i) => (
          <Reveal key={cap.title} delay={(i % 3) * 80}>
            <Card className="lift-card glass-panel h-full">
              <CardHeader>
                <span className="glass-chip flex size-10 items-center justify-center rounded-xl">
                  <cap.icon className="size-5 text-primary" />
                </span>
                <CardTitle className="mt-3 text-lg">{cap.title}</CardTitle>
                <CardDescription>{cap.body}</CardDescription>
              </CardHeader>
            </Card>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}

export function Workflow() {
  return (
    <Section id="workflow" beams>
      <SectionHeading
        eyebrow="How it works"
        title="Capture, analyze, and act — continuously"
        description="A decoupled write/read pipeline keeps ingestion fast while analysis and active testing scale independently."
      />
      <Pipeline />
    </Section>
  )
}

export function UseCases() {
  return (
    <Section id="use-cases">
      <SectionHeading
        eyebrow="Use cases"
        title="Built for security and platform teams"
        description="Whether you are hunting shadow APIs or gating releases, Karaxys fits how your team already works."
      />
      <div className="mt-14 grid gap-4 lg:grid-cols-3">
        {useCases.map((uc, i) => (
          <Reveal key={uc.title} delay={i * 80}>
            <Card className="lift-card glass-panel h-full">
              <CardHeader>
                <Badge variant="outline" className="w-fit border-primary/20 text-primary">
                  {`Use case ${i + 1}`}
                </Badge>
                <CardTitle className="mt-3 text-xl">{uc.title}</CardTitle>
                <CardDescription className="text-base">{uc.body}</CardDescription>
              </CardHeader>
            </Card>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}

export function Security() {
  return (
    <Section id="security" lines>
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <p className="text-sm font-medium uppercase tracking-widest text-primary">Security first</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            A security tool that holds itself to a higher standard
          </h2>
          <p className="mt-4 text-muted-foreground">
            Karaxys is engineered so the platform never becomes a source of leaks. Sensitive data is
            redacted before it is ever stored, access is scoped and audited, and active testing is
            guarded by SSRF protections, target allowlists, and rate limits.
          </p>
          <Button asChild variant="outline" className="mt-8">
            <Link href="/signup">
              Explore the platform <ArrowRight className="size-4" />
            </Link>
          </Button>
        </Reveal>
        <div className="grid gap-4">
          {securityPoints.map((point, i) => (
            <Reveal key={point.title} delay={i * 80}>
              <div className="lift-card glass-panel flex gap-4 rounded-2xl border p-5">
                <span className="glass-chip flex size-10 shrink-0 items-center justify-center rounded-xl">
                  <point.icon className="size-5 text-primary" />
                </span>
                <div>
                  <p className="font-semibold">{point.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{point.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  )
}

export function CallToAction() {
  return (
    <Section beams>
      <Reveal>
        <Card className="glass-panel relative overflow-hidden">
          <div
            className="glow-blob pointer-events-none absolute inset-x-0 bottom-[-40%] mx-auto h-80 w-[700px]"
            aria-hidden
          />
          <CardContent className="relative flex flex-col items-center gap-6 px-6 py-16 text-center">
            <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
              Bring every API into view today
            </h2>
            <p className="max-w-xl text-muted-foreground">
              Spin up Karaxys, connect a data source, and watch your API inventory and risk posture
              build itself in real time.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="font-semibold">
                <Link href="/signup">
                  Get started <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </Reveal>
    </Section>
  )
}
