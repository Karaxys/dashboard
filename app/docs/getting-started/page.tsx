import type { Metadata } from "next"
import { DocPage, DocLede, H2, P, Strong, Code, CodeBlock, Step, Callout, NextSteps } from "@/components/docs/doc-ui"

export const metadata: Metadata = {
  title: "Quick start — Karaxys Docs",
  description: "Stand up Karaxys, connect a capture agent, and see your first API inventory and scan.",
}

export default function GettingStartedPage() {
  return (
    <DocPage>
      <DocLede
        eyebrow="Get started"
        title="Quick start"
        description="Bring up the platform, deploy a capture agent, and go from real traffic to a security finding in a few minutes. This guide targets a self-hosted deployment; the exact commands are generated for you in the dashboard's Quick Start panel."
      />

      <Callout type="info" title="Prerequisites">
        A Linux host with a container runtime for the capture agent (eBPF requires a Linux kernel), and a
        machine to run the backend and dashboard. The capture agent runs on Linux only; the rest of the
        platform is portable.
      </Callout>

      <H2>1. Launch the platform</H2>
      <P>
        The backend, dashboard, and their infrastructure dependencies ship as a single Compose project.
        Bring the full stack up with one command:
      </P>
      <CodeBlock title="terminal">
{`docker compose up -d`}
      </CodeBlock>
      <P>
        When every service reports healthy, open the dashboard and create your account. The first account
        becomes the administrator for its tenant.
      </P>

      <H2>2. Connect a capture agent</H2>
      <P>
        Open <Strong>Quick Start</Strong> in the dashboard. It generates a ready-to-run command for the
        eBPF capture agent, pre-filled with your account&apos;s ingest endpoint and token — so you never
        assemble credentials by hand. Run that command on any Linux host whose API traffic you want to see.
      </P>
      <Callout type="security" title="Ingest tokens">
        The agent authenticates with a scoped ingest token tied to your account. You can rotate it at any
        time from the Agents page; rotating immediately invalidates the previous token.
      </Callout>

      <H2>3. Generate traffic</H2>
      <P>
        Exercise the target application as you normally would — click through it, run its test suite, or
        replay recorded requests. The agent observes the traffic at the kernel, reconstructs each API
        conversation (including over TLS), and ships it to the backend.
      </P>

      <H2>4. Watch the inventory build</H2>
      <P>
        Within seconds, endpoints begin appearing under <Strong>Inventory</Strong>. Each is normalized
        (path parameters templated into <Code>{`{id}`}</Code> form), enriched with a learned schema, and
        flagged if it carries sensitive data such as tokens or personal information.
      </P>

      <H2>5. Run your first scan</H2>
      <P>
        Open <Strong>Active Scanner</Strong>, pick an endpoint, and choose a mode:
      </P>
      <Step n={1} title="Suite scan">
        Select an OWASP-mapped suite (for example, the OWASP API Top 10). Karaxys fans it out into one
        scan job per applicable test type, streams live progress, and aggregates the findings.
      </Step>
      <Step n={2} title="Single test">
        Run one specific test type — useful when you want to reproduce or drill into a single check.
      </Step>
      <P>
        Findings appear in real time and are also persisted to <Strong>Results</Strong>, where they are
        deduplicated into tracked issues.
      </P>

      <Callout type="tip" title="Provide auth context for deeper coverage">
        Authorization tests such as BOLA need credentials to compare what one user can reach versus
        another. Supply attacker and victim tokens in the scan form to unlock these checks; without them,
        those tests are skipped automatically.
      </Callout>

      <NextSteps
        links={[
          { label: "eBPF capture agent", href: "/docs/ebpf-agent", desc: "Understand what the agent captures and how." },
          { label: "Scanner engine", href: "/docs/scanner", desc: "Every test type and how suites work." },
          { label: "API inventory", href: "/docs/inventory", desc: "How discovery and classification work." },
          { label: "Security & privacy", href: "/docs/security", desc: "How your data and targets are protected." },
        ]}
      />
    </DocPage>
  )
}
