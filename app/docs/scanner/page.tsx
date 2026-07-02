import type { Metadata } from "next"
import { DocPage, DocLede, H2, P, Strong, CodeBlock, UL, LI, DocTable, Callout, NextSteps } from "@/components/docs/doc-ui"

export const metadata: Metadata = {
  title: "Scanner engine — Karaxys Docs",
  description: "How the Karaxys scanner runs OWASP-mapped test suites against your API inventory — safely, in parallel, and with deduplicated findings.",
}

export default function ScannerPage() {
  return (
    <DocPage>
      <DocLede
        eyebrow="Active testing"
        title="Scanner engine"
        description="The scanner turns your inventory into tested inventory. It runs security checks against discovered endpoints using the Nuclei engine, organizes them into OWASP-mapped suites, and controls execution so testing is thorough without ever overwhelming a target."
      />

      <H2>Built on Nuclei</H2>
      <P>
        Karaxys embeds the <Strong>Nuclei</Strong> engine directly inside its scanner workers through its
        official SDK. Each security check is a declarative template describing the request to send and the
        conditions that indicate a vulnerability. Building on a mature, widely-audited engine means the
        scanner benefits from a battle-tested request pipeline, matcher language, and out-of-band detection
        rather than a bespoke one.
      </P>

      <H2>Anatomy of a test type</H2>
      <P>
        A <Strong>test type</Strong> is a single security check backed by a declarative template. Understanding
        the template&apos;s four parts explains how detection stays precise. A template describes the request
        to send, the <Strong>matchers</Strong> that decide whether the response indicates a vulnerability, any
        values to <Strong>extract</Strong> for a follow-up request, and the metadata that sets severity:
      </P>
      <CodeBlock title="test type, conceptually">
{`test:      SQL_INJECTION (error-based)
requires:  an injectable parameter (query or body)
send:      inject payload into each candidate parameter
match:     response contains a genuine SQL error signature
           AND response differs meaningfully from the baseline
severity:  raised if the endpoint carries sensitive data
proof:     the exact request + the matched response fragment`}
      </CodeBlock>
      <P>
        Because the check is declarative, the same engine runs every test type uniformly — which is what makes
        the library easy to extend and the results consistent across checks.
      </P>

      <H2>Test types</H2>
      <P>
        Karaxys ships a curated library focused on the vulnerability classes that matter most for APIs:
      </P>
      <DocTable
        head={["Category", "Test types"]}
        rows={[
          [<Strong key="1">Broken access control</Strong>, "BOLA (object-level authorization), BFLA (function-level authorization), BOLA via parameter pollution, chained object-ID enumeration, and mass assignment."],
          [<Strong key="2">Authentication</Strong>, "Broken authentication, JWT none-algorithm acceptance, JWT signature tampering, and default / weak credentials."],
          [<Strong key="3">Injection</Strong>, "Reflected XSS, error-based SQL injection, OS command injection, and open redirect."],
          [<Strong key="4">Server-side request forgery</Strong>, "Direct in-band SSRF and blind out-of-band SSRF."],
          [<Strong key="5">Misconfiguration & exposure</Strong>, "CORS misconfiguration, exposed metrics and debug endpoints, and exposed API documentation."],
        ]}
      />

      <H2>Suites and the OWASP API Top 10</H2>
      <P>
        Running one check at a time is tedious, so test types are grouped into <Strong>suites</Strong> — named
        collections you launch with a single action. Suites map to the OWASP API Security Top 10 risk
        categories, so you can run well-understood, standards-aligned coverage without hand-picking checks.
      </P>
      <DocTable
        head={["Suite", "Focus"]}
        rows={[
          [<Strong key="1">OWASP API Top 10</Strong>, "Broad coverage spanning the OWASP API Security Top 10 risk categories."],
          [<Strong key="2">Broken Access Control</Strong>, "Object- and function-level authorization and mass assignment."],
          [<Strong key="3">Broken Authentication</Strong>, "Anonymous access, JWT flaws, and default credentials."],
          [<Strong key="4">Injection</Strong>, "XSS, SQL, command injection, and open redirect."],
          [<Strong key="5">Server-Side Request Forgery</Strong>, "In-band and blind out-of-band SSRF."],
          [<Strong key="6">Security Misconfiguration</Strong>, "CORS, exposed metrics, and inventory exposure."],
          [<Strong key="7">Full Scan</Strong>, "Every test type applicable to the selected endpoint."],
        ]}
      />

      <H2>How a suite runs</H2>
      <P>
        When you launch a suite, Karaxys does not run a single monolithic job. It <Strong>fans out</Strong> the
        suite into many independent scan jobs — one per applicable test type — that share a common suite
        identifier. Each job is scheduled, executed, and tracked on its own.
      </P>
      <CodeBlock title="fan-out">
{`Suite: OWASP API Top 10  ──►  target endpoint: POST /orders
        │
        ├─ scan job  BOLA
        ├─ scan job  BFLA
        ├─ scan job  MASS_ASSIGNMENT
        ├─ scan job  SQL_INJECTION
        ├─ scan job  SSRF
        └─ …                       (one job per applicable test type)`}
      </CodeBlock>
      <P>
        This design is what makes scanning scale. Because each job is independent, work spreads naturally
        across all available scanner workers, a slow check never blocks a fast one, and a single failure is
        isolated to its own job. Suite progress in the dashboard aggregates the live status of every job
        under the shared suite identifier.
      </P>

      <H2>Applicability filtering</H2>
      <P>
        Not every test makes sense for every endpoint. Running a body-injection check against an endpoint
        with no request body, or an authorization check with no credentials available, only produces noise.
        Before fanning out, Karaxys filters the suite down to the tests that are actually meaningful for the
        chosen endpoint, based on:
      </P>
      <UL>
        <LI><Strong>Shape of the endpoint</Strong> — method, path, and whether it carries a request body.</LI>
        <LI><Strong>Available authentication</Strong> — whether the credentials a test needs have been supplied.</LI>
        <LI><Strong>Required inputs</Strong> — each test declares what it needs; tests whose prerequisites are missing are skipped.</LI>
      </UL>
      <P>
        Skipped tests are reported back so you can see exactly what ran and what did not, and why.
      </P>

      <H2>Injection coverage</H2>
      <P>
        Injection tests reach vulnerable inputs wherever they live. Karaxys weaves the attack payload into
        both the request body and the query string, so an endpoint is exercised whether it takes input as
        JSON or as URL parameters. Detection is designed to keep false positives low — for example,
        error-based SQL injection looks for genuine database error signatures rather than guessing.
      </P>

      <H2>Out-of-band detection</H2>
      <P>
        Some of the most serious vulnerabilities are <Strong>blind</Strong>: the server makes an attacker-controlled
        request but reveals nothing in its response. The classic case is blind SSRF. To catch these, the
        scanner can use out-of-band (OOB) interaction detection — it plants a unique callback URL and watches
        for the target to reach out to it, which proves the vulnerability even when the response looks normal.
      </P>
      <Callout type="security" title="Opt-in by design">
        Out-of-band detection is disabled by default. Because it involves an external interaction service,
        Karaxys never enables it silently against your infrastructure — you turn it on explicitly, and can
        point it at your own self-hosted interaction server.
      </Callout>

      <H2>Multi-step (chained) tests</H2>
      <P>
        Real exploits are often multi-step. Karaxys supports chained templates that carry a value extracted
        from one response into a later request within the same test. The built-in chained object-ID
        enumeration check demonstrates this: it reads an identifier from a listing response, then attempts to
        access that object directly with a different user&apos;s credentials — surfacing authorization flaws
        that only appear across two requests.
      </P>

      <H2>Signal quality</H2>
      <P>
        Findings are only useful if you can trust them. Several mechanisms keep the signal high:
      </P>
      <DocTable
        head={["Mechanism", "Effect"]}
        rows={[
          [<Strong key="1">Response-similarity scoring</Strong>, "A finding whose response barely differs from the endpoint's normal output is flagged as a likely false positive."],
          [<Strong key="2">Dynamic severity</Strong>, "Severity adapts to what was actually exposed — a check that leaks sensitive data ranks higher than one that does not. Out-of-band-confirmed findings are never downgraded."],
          [<Strong key="3">Reproduction proof</Strong>, "Every finding includes a concrete reproduction so a human can verify it independently."],
          [<Strong key="4">Deduplication into issues</Strong>, "Repeated findings for the same endpoint and test collapse into a single tracked issue."],
        ]}
      />

      <H2>Safe execution</H2>
      <P>
        Scanning makes real requests against real systems, so it runs under strict controls (detailed in{" "}
        <Strong>Architecture</Strong>): a cluster-wide concurrency cap, per-target rate limiting, per-job
        distributed locking, and automatic capacity release if a worker dies. Targets can only ever be
        endpoints from your own inventory.
      </P>
      <Callout type="security" title="You can only scan what you captured">
        There is no endpoint anywhere in the platform to scan an arbitrary URL. Scan targets are drawn
        exclusively from inventory, which is populated only by traffic from your own capture agent under your
        own token — so testing is confined to systems you operate.
      </Callout>

      <H2>Extending the library</H2>
      <P>
        The template library is designed to grow. Community-style templates can be added as self-contained
        files that register themselves automatically, and the suite presets pick them up without code
        changes — so coverage deepens over time.
      </P>

      <NextSteps
        links={[
          { label: "Security & privacy", href: "/docs/security", desc: "SSRF protections, RBAC, and redaction." },
          { label: "API inventory", href: "/docs/inventory", desc: "Where scan targets come from." },
          { label: "Architecture", href: "/docs/architecture", desc: "Scan admission control and coordination." },
          { label: "API reference", href: "/docs/api-reference", desc: "Trigger scans and read findings via the API." },
        ]}
      />
    </DocPage>
  )
}
