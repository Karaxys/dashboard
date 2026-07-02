import type { Metadata } from "next"
import { DocPage, DocLede, H2, H3, P, Strong, Code, CodeBlock, DocTable, NextSteps, Callout } from "@/components/docs/doc-ui"

export const metadata: Metadata = {
  title: "Core concepts — Karaxys Docs",
  description: "The vocabulary behind Karaxys: conversations, endpoints, inventory, findings, issues, and suites.",
}

export default function ConceptsPage() {
  return (
    <DocPage>
      <DocLede
        eyebrow="Introduction"
        title="Core concepts"
        description="A short glossary of the objects Karaxys works with. Understanding these makes the rest of the documentation — and the dashboard — much easier to follow."
      />

      <H2>The data model</H2>
      <DocTable
        head={["Term", "Meaning"]}
        rows={[
          [<Strong key="1">Conversation</Strong>, "A single reconstructed request/response pair captured from traffic — method, path, headers, bodies, and status."],
          [<Strong key="2">Endpoint</Strong>, "A normalized API operation, e.g. GET /users/{id}. Many conversations collapse into one endpoint after path parameters are templated."],
          [<Strong key="3">Inventory</Strong>, "The living catalog of all discovered endpoints for an account, with their schemas, sample traffic, and risk classification."],
          [<Strong key="4">Sensitive data</Strong>, "Field-level classifications (emails, tokens, card numbers, and more) detected in traffic and attached to endpoints."],
          [<Strong key="5">Test type</Strong>, "A single security check, such as BOLA or SQL_INJECTION, backed by a scanner template."],
          [<Strong key="6">Suite</Strong>, "A named group of test types run together — for example, the OWASP API Top 10 suite."],
          [<Strong key="7">Scan job</Strong>, "One execution of one test type against one endpoint. Suites fan out into many scan jobs."],
          [<Strong key="8">Finding</Strong>, "A vulnerability a scan job produced, with severity, description, and reproduction proof."],
          [<Strong key="9">Issue</Strong>, "A deduplicated finding tracked over time, so the same vulnerability is not reported twice."],
        ]}
      />

      <H2>From traffic to a finding</H2>
      <P>
        These objects form a pipeline. Captured <Strong>conversations</Strong> are normalized into{" "}
        <Strong>endpoints</Strong> that populate the <Strong>inventory</Strong>. When you launch a{" "}
        <Strong>suite</Strong>, Karaxys fans it out into <Strong>scan jobs</Strong> — one per applicable{" "}
        test type per endpoint — and each job that detects a vulnerability produces a{" "}
        <Strong>finding</Strong>. Findings are then folded into durable <Strong>issues</Strong>.
      </P>
      <CodeBlock title="object lifecycle">
{`conversation   GET /users/1042  ┐
conversation   GET /users/1043  ├─ normalize ─►  endpoint   GET /users/{id}
conversation   GET /users/1044  ┘                   │
                                                     │  classify fields
                                                     ▼
                                          sensitive data: email, phone
                                                     │
                                launch suite ◄───────┘
                                     │  fan out (one job per applicable test type)
                     ┌───────────────┼───────────────┐
                     ▼               ▼               ▼
              scan job BOLA   scan job BFLA   scan job SQLI
                     │               │               │
                     ▼  (vuln found) │  (clean)      │  (clean)
                  finding            ─               ─
                     │  deduplicate on stable fingerprint
                     ▼
                   issue   (tracked over time, status: open)`}
      </CodeBlock>

      <H3>A worked example</H3>
      <P>
        Suppose an application serves three requests: <Code>GET /users/1042</Code>,{" "}
        <Code>GET /users/1043</Code>, and <Code>GET /users/1044</Code>. Each is captured as its own{" "}
        <Strong>conversation</Strong>. Because the trailing segment varies while everything else is constant,
        normalization collapses all three into a single <Strong>endpoint</Strong>,{" "}
        <Code>{`GET /users/{id}`}</Code>. As the response bodies flow through, an <Code>email</Code> and a{" "}
        <Code>phone</Code> field are recognized and attached as <Strong>sensitive-data</Strong> classifications.
        Launching the OWASP API Top 10 <Strong>suite</Strong> against that endpoint fans out into one{" "}
        <Strong>scan job</Strong> per applicable <Strong>test type</Strong>. The BOLA job proves that one user
        can read another&apos;s record and emits a <Strong>finding</Strong>; that finding deduplicates into an{" "}
        <Strong>issue</Strong> you can triage. Re-running the suite next week updates the same issue instead of
        creating a second.
      </P>

      <H2>Object states</H2>
      <P>
        Several objects move through a lifecycle. Knowing the states makes the dashboard and API responses
        legible:
      </P>
      <H3>Scan job status</H3>
      <DocTable
        head={["Status", "Meaning"]}
        rows={[
          [<Code key="1">queued</Code>, "The job has been created and is waiting for a worker to claim it under admission control."],
          [<Code key="2">running</Code>, "A worker holds the job's lease and is executing its template against the target."],
          [<Code key="3">completed</Code>, "Execution finished. The job either produced a finding or confirmed the endpoint was clean for that test."],
          [<Code key="4">skipped</Code>, "Applicability filtering determined the test was not meaningful for the endpoint — reported with a reason."],
          [<Code key="5">failed</Code>, "Execution errored (for example, the target was unreachable). Isolated to this job; the rest of the suite continues."],
        ]}
      />
      <H3>Issue status</H3>
      <DocTable
        head={["Status", "Meaning"]}
        rows={[
          [<Code key="1">open</Code>, "A live issue awaiting triage or remediation."],
          [<Code key="2">acknowledged</Code>, "A human has seen the issue and accepted it as real work to be done."],
          [<Code key="3">resolved</Code>, "The underlying vulnerability is believed fixed; a subsequent scan that no longer reproduces it confirms this."],
          [<Code key="4">false positive</Code>, "Triaged as not a real vulnerability; suppressed from the active list but retained for audit."],
        ]}
      />

      <Callout type="tip" title="Findings vs. issues — why both exist">
        A <Strong>finding</Strong> is a single observation from a single scan job at a point in time — it is
        immutable evidence. An <Strong>issue</Strong> is the durable, deduplicated thing you actually manage:
        many findings across many scans collapse into one issue so your queue reflects distinct problems, not
        scan history.
      </Callout>

      <Callout type="info" title="Deduplication key">
        Karaxys deduplicates findings into issues using a stable fingerprint of the tenant, project,
        endpoint, and test type. Re-running a suite updates the existing issue instead of creating
        noise, so your findings list reflects reality rather than scan history.
      </Callout>

      <H2>Multi-tenancy</H2>
      <P>
        Every object above is scoped to an <Strong>account</Strong> (tenant). Traffic you ingest, the
        inventory it builds, and the findings it produces are visible only within your account. Scan
        targets are always drawn from your own inventory — there is no way to point the scanner at an
        arbitrary URL you have not captured — which keeps testing confined to systems you operate.
      </P>

      <NextSteps
        links={[
          { label: "Architecture", href: "/docs/architecture", desc: "How the services behind these objects fit together." },
          { label: "API inventory", href: "/docs/inventory", desc: "How endpoints and sensitive data are discovered." },
        ]}
      />
    </DocPage>
  )
}
