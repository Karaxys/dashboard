import type { Metadata } from "next"
import { DocPage, DocLede, H2, H3, P, Strong, Code, CodeBlock, UL, LI, DocTable, Callout, NextSteps } from "@/components/docs/doc-ui"

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

      <H2>Design principles</H2>
      <P>
        Before the individual services make sense, it helps to know the four constraints that shaped every
        boundary in the system. Each service exists because one of these forces made it necessary to split it
        out:
      </P>
      <DocTable
        head={["Principle", "Consequence in the architecture"]}
        rows={[
          [<Strong key="1">Decouple bursty from steady work</Strong>, "Capture is spiky and analysis is even; a durable log sits between them so a traffic spike is absorbed as queue depth instead of dropped events or backpressure onto the agent."],
          [<Strong key="2">Isolate the dangerous part</Strong>, "The scanner makes real requests against real systems. It runs as its own worker pool with no shared state, so a misbehaving scan can never corrupt ingestion or the inventory."],
          [<Strong key="3">Scale each stage independently</Strong>, "Ingestion, analysis, and scanning have different resource profiles. Splitting them lets you add analyzer replicas or scanner workers without touching the rest of the stack."],
          [<Strong key="4">Fail in one place, not everywhere</Strong>, "A poison message, a slow target, or a dead worker is contained to its own stage. Dead-lettering and leases keep a single bad event from stalling the pipeline."],
        ]}
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

      <H3>Walking the pipeline, stage by stage</H3>
      <P>
        Each arrow above is a deliberate boundary. Following one conversation from wire to finding shows why
        each hop exists and what guarantee it adds:
      </P>
      <UL>
        <LI>
          <Strong>Capture → Ingestion.</Strong> The agent reconstructs a full request/response conversation
          in userspace and POSTs it over authenticated HTTPS. This is the only hop that crosses a trust
          boundary from the customer host into the platform, so it is where authentication and payload-size
          limits are enforced. The agent buffers locally and retries, so a brief backend outage costs latency,
          not data.
        </LI>
        <LI>
          <Strong>Ingestion → queue.</Strong> Ingestion does almost no work on purpose: it authenticates the
          agent, validates the envelope, stamps the tenant, and appends to the log. Keeping it thin means it
          can absorb a traffic spike at wire speed and never becomes the bottleneck that pushes back on
          capture. Durability is handed to the log, not held in memory.
        </LI>
        <LI>
          <Strong>Queue → analyzer.</Strong> The runtime analyzer consumes at its own pace. Because the log
          retains messages, the analyzer can be restarted, scaled out, or fall briefly behind without losing
          events — it simply resumes from its committed offset. This is what turns a traffic burst into
          harmless queue depth.
        </LI>
        <LI>
          <Strong>Analyzer → MongoDB.</Strong> The analyzer performs the expensive work — URL normalization,
          schema learning, sensitive-data classification — and writes the distilled result. Raw payloads are
          redacted here so secrets never reach durable storage; only the shape and classification survive.
        </LI>
        <LI>
          <Strong>API server ↔ scanner.</Strong> Scans are not run inline. The API server enqueues scan jobs
          under admission control, and the isolated worker pool claims them. The dashboard reads aggregate
          progress back from the same records, so a long scan never blocks an HTTP request.
        </LI>
      </UL>

      <Callout type="info" title="Why a log and not direct calls">
        Ingestion could call the analyzer directly, but then a slow analyzer would push back on capture and a
        crash would drop in-flight traffic. A durable, replayable log converts a synchronous dependency into
        an asynchronous one: the two stages fail, deploy, and scale on their own schedules.
      </Callout>

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

      <H2>Delivery guarantees</H2>
      <P>
        The pipeline is built for <Strong>at-least-once</Strong> delivery: it would rather process a
        conversation twice than lose it. That choice pushes the burden of correctness onto idempotency
        downstream, which is a deliberate trade — losing captured traffic is invisible and unrecoverable,
        whereas a duplicate is cheap to collapse.
      </P>
      <DocTable
        head={["Stage", "Guarantee & how duplicates are absorbed"]}
        rows={[
          [<Strong key="1">Agent delivery</Strong>, "Retries with backoff until the backend acknowledges. A retry after a lost ack can resend a conversation; analysis is idempotent, so the endpoint it maps to is unchanged."],
          [<Strong key="2">Queue consumption</Strong>, "Offsets are committed only after a message is durably processed. A crash between processing and commit replays the last message rather than skipping it."],
          [<Strong key="3">Inventory writes</Strong>, "Endpoints are keyed by a stable fingerprint (method + normalized path + tenant), so reprocessing the same conversation updates one endpoint instead of creating a second."],
          [<Strong key="4">Finding writes</Strong>, "Findings deduplicate into issues on a stable fingerprint, so a re-run — or a replayed scan job — folds into the existing issue rather than duplicating it."],
        ]}
      />

      <H2>Failure modes and recovery</H2>
      <P>
        Distributed systems are defined by how they behave when a part breaks. Each failure below is contained
        to its own stage by design:
      </P>
      <DocTable
        head={["If this fails…", "What happens"]}
        rows={[
          [<Strong key="1">Backend briefly unreachable</Strong>, "The agent buffers and retries. Capture continues; conversations drain once connectivity returns. Sustained outage is bounded by the agent's local buffer."],
          [<Strong key="2">Analyzer falls behind or restarts</Strong>, "Messages accumulate as queue depth and are processed from the last committed offset on resume. Ingestion is unaffected because it only writes to the log."],
          [<Strong key="3">A message cannot be processed</Strong>, "After bounded retries it is routed to the dead-letter consumer, which quarantines it for inspection so one poison event never blocks the partition behind it."],
          [<Strong key="4">A scanner worker dies mid-scan</Strong>, "Its admission lease expires and the capacity it held is released automatically; the job's lock frees so another worker can reclaim it."],
          [<Strong key="5">A single scan target misbehaves</Strong>, "Per-target rate limiting and per-job isolation keep the blast radius to that one job — other scans and the rest of the pipeline are untouched."],
        ]}
      />

      <H2>Scaling characteristics</H2>
      <P>
        Because the stages are decoupled, each scales along a different axis and against a different signal:
      </P>
      <UL>
        <LI><Strong>Ingestion</Strong> scales with <Code>traffic volume</Code> — add replicas behind the ingest endpoint; they are stateless and share nothing.</LI>
        <LI><Strong>Analysis</Strong> scales with <Code>queue depth</Code> — add analyzer consumers to drain a growing backlog; the log&apos;s partitioning spreads work across them.</LI>
        <LI><Strong>Scanning</Strong> scales with <Code>pending scan jobs</Code> — add workers to raise throughput, bounded by the global concurrency cap so more workers never mean more load on any single target.</LI>
        <LI><Strong>Datastore</Strong> is the one shared axis — inventory, findings, and audit logs all land in MongoDB, which is scaled independently of the compute tiers.</LI>
      </UL>

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
