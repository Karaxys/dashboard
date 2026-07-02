import type { Metadata } from "next"
import { DocPage, DocLede, H2, P, Strong, DocTable, NextSteps, Callout } from "@/components/docs/doc-ui"

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
