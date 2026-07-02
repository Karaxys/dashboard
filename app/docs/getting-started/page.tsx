import type { Metadata } from "next"
import { DocPage, DocLede, H2, H3, P, Strong, Code, CodeBlock, Step, UL, LI, DocTable, Callout, NextSteps } from "@/components/docs/doc-ui"

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

      <H3>What you need before you start</H3>
      <DocTable
        head={["Requirement", "Why"]}
        rows={[
          [<Strong key="1">A recent Linux kernel</Strong>, "The capture agent loads eBPF programs, which need a modern kernel with BPF and BTF support. This is the one hard platform requirement."],
          [<Strong key="2">A container runtime</Strong>, "The whole stack — backend, dashboard, dependencies, and the agent — ships as container images."],
          [<Strong key="3">Elevated privileges for the agent</Strong>, "Loading eBPF and attaching to kernel probes requires the capabilities eBPF depends on. Only the agent needs them; the backend does not."],
          [<Strong key="4">A workload that serves API traffic</Strong>, "There is nothing to see until something makes API calls on the monitored host — your app, its test suite, or replayed requests."],
        ]}
      />

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

      <H2>Verify each stage</H2>
      <P>
        If something looks wrong, check the pipeline one hop at a time — the same order data flows. Each stage
        has a clear success signal:
      </P>
      <DocTable
        head={["Stage", "How to confirm it is working"]}
        rows={[
          [<Strong key="1">Platform up</Strong>, "Every service in the Compose project reports healthy and the dashboard loads."],
          [<Strong key="2">Agent connected</Strong>, "The Agents page shows your host as active, having authenticated with its ingest token."],
          [<Strong key="3">Capture flowing</Strong>, "After you exercise the app, endpoints appear under Inventory within seconds."],
          [<Strong key="4">Analysis working</Strong>, "New endpoints gain learned schemas and sensitive-data flags as more traffic arrives."],
          [<Strong key="5">Scanning working</Strong>, "A launched scan streams live job progress and writes findings to Results."],
        ]}
      />

      <H2>Troubleshooting</H2>
      <H3>The inventory stays empty</H3>
      <P>
        Traffic is being captured but nothing appears. Work down this list:
      </P>
      <UL>
        <LI><Strong>Is the runtime analyzer running?</Strong> Traffic can be accepted and acknowledged, but without the analyzer the inventory never populates — this is the single most common cause of an empty inventory.</LI>
        <LI><Strong>Is traffic actually being generated on the monitored host?</Strong> The agent only sees what the host serves or calls. Idle apps produce nothing.</LI>
        <LI><Strong>Is the port excluded?</Strong> Check that the traffic you expect is not on a port you configured the agent to ignore.</LI>
        <LI><Strong>Did the agent authenticate?</Strong> A rotated or mistyped ingest token means conversations are rejected at ingestion. The Agents page shows connection state.</LI>
      </UL>
      <H3>A scan reports everything as skipped</H3>
      <P>
        Skips are informative, not errors — each comes with a reason. The usual cause is missing prerequisites:
        an authorization test with no attacker/victim tokens supplied, or a body-injection test against an
        endpoint that takes no request body. Provide the missing auth context, or pick an endpoint whose shape
        matches the test, and the checks run.
      </P>
      <Callout type="warn" title="Scans only target your own inventory">
        There is no way to point a scan at an arbitrary URL. If an endpoint you want to test is not in the
        inventory, the fix is to capture its traffic first — not to enter a URL by hand.
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
