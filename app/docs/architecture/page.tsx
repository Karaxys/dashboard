import type { Metadata } from "next"
import { DocPage, DocLede, H2, P, Strong, CodeBlock, DocTable, Callout, NextSteps } from "@/components/docs/doc-ui"

export const metadata: Metadata = {
  title: "Architecture — Karaxys Docs",
  description: "The services, data flow, and technology behind the Karaxys API security platform.",
}

export default function ArchitecturePage() {
  return (
    <DocPage>
      <DocLede
        eyebrow="Introduction"
        title="Architecture"
        description="Karaxys is a distributed system built from small, independently scalable services. This page explains each service, how data flows between them, and the technology choices behind the platform."
      />

      <H2>End-to-end data flow</H2>
      <P>
        Traffic flows in one direction — from the kernel where it is captured, through analysis, into the
        inventory, and finally into the scanner and dashboard. Each hop is decoupled by a durable queue so
        a burst of traffic never blocks analysis, and heavy scans never block ingestion.
      </P>
      <CodeBlock title="pipeline">
{`  target workloads (any process on a host)
        │   API traffic, including TLS
        ▼
  ┌──────────────────────────┐
  │  eBPF capture agent        │   kernel probes + userspace assembler
  └──────────────────────────┘
        │   reconstructed conversations (HTTPS ingest)
        ▼
  ┌──────────────────────────┐
  │  Ingestion service         │   authenticates, validates, enqueues
  └──────────────────────────┘
        │   durable event queue
        ▼
  ┌──────────────────────────┐
  │  Runtime analyzer          │   normalization, schema learning,
  │                            │   sensitive-data classification
  └──────────────────────────┘
        │
        ▼
     MongoDB  ◄────────────►  API server  ◄────────────►  Dashboard
                                   │
                                   │  scan jobs (queue + admission control)
                                   ▼
                            Scanner workers  ──►  target endpoints`}
      </CodeBlock>

      <H2>Services</H2>
      <P>
        The backend is a set of independent processes. Splitting them lets each scale to its own workload —
        capture is bursty, analysis is steady, and scanning is spiky — and lets a failure in one be isolated
        from the others.
      </P>
      <DocTable
        head={["Service", "Role"]}
        rows={[
          [<Strong key="1">API server</Strong>, "REST API and dashboard backend: authentication, inventory, scan control, findings, and account settings."],
          [<Strong key="2">Ingestion service</Strong>, "High-throughput endpoint that authenticates capture agents, validates conversations, and publishes them to the queue."],
          [<Strong key="3">Runtime analyzer</Strong>, "Consumes conversations, normalizes URLs, learns request/response schemas, and classifies sensitive data into the inventory."],
          [<Strong key="4">Scanner workers</Strong>, "Claim scan jobs, run security-test templates against target endpoints, and persist findings. Isolated from the rest of the backend."],
          [<Strong key="5">Dead-letter consumer</Strong>, "Recovers and quarantines messages that fail processing, so a single bad event never stalls the pipeline."],
        ]}
      />

      <Callout type="warn" title="An operational invariant">
        The runtime analyzer must run alongside the API server. Without it, traffic is accepted and
        acknowledged but the inventory never populates — the most common cause of an unexpectedly empty
        inventory in a self-hosted deployment.
      </Callout>

      <H2>Infrastructure dependencies</H2>
      <DocTable
        head={["Dependency", "Used for"]}
        rows={[
          [<Strong key="1">MongoDB</Strong>, "Primary datastore for inventory, scan jobs, findings, issues, audit logs, and accounts."],
          [<Strong key="2">Event queue</Strong>, "A Kafka-compatible log that decouples ingestion from analysis and buffers traffic bursts."],
          [<Strong key="3">In-memory coordinator</Strong>, "A Redis-compatible store used for distributed locks, scan admission control, and rate limiting."],
          [<Strong key="4">Object storage</Strong>, "S3-compatible storage for larger scan artifacts and captured payload spillover."],
        ]}
      />

      <H2>Distributed scan coordination</H2>
      <P>
        Scanning is the most resource-sensitive part of the platform — it makes real requests against real
        systems — so it runs under several layers of control enforced through the in-memory coordinator:
      </P>
      <DocTable
        head={["Control", "Purpose"]}
        rows={[
          [<Strong key="1">Global concurrency</Strong>, "A cluster-wide semaphore caps how many scan jobs run at once across all workers."],
          [<Strong key="2">Per-target rate limiting</Strong>, "A sliding window caps how frequently any single target is scanned, so tests never overwhelm a service."],
          [<Strong key="3">Per-job locking</Strong>, "A distributed lock guarantees each scan job is claimed and executed by exactly one worker."],
          [<Strong key="4">Admission leases</Strong>, "Time-bounded leases release capacity automatically if a worker dies mid-scan."],
        ]}
      />
      <P>
        Because jobs are claimed from a shared queue under these controls, you scale throughput simply by
        running more scanner workers — no worker is aware of any other, and capacity is negotiated entirely
        through the coordinator.
      </P>

      <H2>Technology stack</H2>
      <DocTable
        head={["Layer", "Technology"]}
        rows={[
          [<Strong key="1">Capture agent</Strong>, <>eBPF (C) in kernel space, with a userspace assembler written in Go.</>],
          [<Strong key="2">Backend services</Strong>, "Go, compiled to small static binaries and shipped as minimal container images."],
          [<Strong key="3">Scanner engine</Strong>, <>The Nuclei engine, embedded directly in the scanner worker via its Go SDK.</>],
          [<Strong key="4">Dashboard</Strong>, "Next.js, React, and Tailwind CSS."],
          [<Strong key="5">Packaging</Strong>, "Docker Compose for local and single-host deployments; each service is independently deployable."],
        ]}
      />

      <NextSteps
        links={[
          { label: "eBPF capture agent", href: "/docs/ebpf-agent", desc: "The capture layer in depth." },
          { label: "Scanner engine", href: "/docs/scanner", desc: "How suites, jobs, and templates work." },
          { label: "Quick start", href: "/docs/getting-started", desc: "Run the whole stack locally." },
          { label: "Security & privacy", href: "/docs/security", desc: "RBAC, redaction, and scan safety." },
        ]}
      />
    </DocPage>
  )
}
