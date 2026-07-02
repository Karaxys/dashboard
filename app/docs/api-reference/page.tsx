import type { Metadata } from "next"
import { DocPage, DocLede, H2, H3, P, Strong, Code, CodeBlock, DocTable, Callout, NextSteps } from "@/components/docs/doc-ui"

export const metadata: Metadata = {
  title: "API reference — Karaxys Docs",
  description: "Authenticate and call the Karaxys REST API for inventory, scans, suites, findings, and issues.",
}

export default function ApiReferencePage() {
  return (
    <DocPage>
      <DocLede
        eyebrow="Platform"
        title="API reference"
        description="Everything you can do in the dashboard, you can do over the REST API. This reference covers authentication and the core resources; every endpoint is scoped to your account and enforces role-based access control."
      />

      <H2>Authentication</H2>
      <P>
        Obtain a session token by signing in, then pass it as a bearer token on every request. Tokens are
        short-lived; refresh them as needed.
      </P>
      <CodeBlock title="POST /auth/login">
{`curl -X POST https://your-host/auth/login \\
  -H 'Content-Type: application/json' \\
  -d '{"email":"you@example.com","password":"••••••••"}'

# → { "access_token": "…", "account": { "id": "…" } }`}
      </CodeBlock>
      <CodeBlock title="authenticated request">
{`curl https://your-host/inventory \\
  -H 'Authorization: Bearer <access_token>'`}
      </CodeBlock>
      <Callout type="info" title="Two kinds of credential">
        Dashboard and API calls use a <Strong>session token</Strong>. Capture agents use a separate,
        account-scoped <Strong>ingest token</Strong> to submit traffic. They are not interchangeable.
      </Callout>

      <H2>Inventory</H2>
      <DocTable
        head={["Method & path", "Description"]}
        rows={[
          [<Code key="1">GET /inventory</Code>, "List discovered endpoints for your account, with pagination and sorting."],
          [<Code key="2">{`GET /inventory/{id}`}</Code>, "Fetch a single endpoint with its learned schema and sample traffic."],
        ]}
      />

      <H2>Scans</H2>
      <H3>Single test</H3>
      <DocTable
        head={["Method & path", "Description"]}
        rows={[
          [<Code key="1">POST /scan</Code>, "Trigger one test type against one inventory endpoint. Returns a scan job."],
          [<Code key="2">{`GET /scan-jobs/{id}`}</Code>, "Poll the status of a scan job."],
          [<Code key="3">GET /scan-results</Code>, "List findings, filterable by endpoint, job, or suite."],
        ]}
      />
      <CodeBlock title="POST /scan">
{`curl -X POST https://your-host/scan \\
  -H 'Authorization: Bearer <access_token>' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "inventory_id": "<endpoint id>",
    "test_type": "BOLA",
    "attacker_token": "Bearer <token of another user>"
  }'`}
      </CodeBlock>

      <H3>Suites</H3>
      <DocTable
        head={["Method & path", "Description"]}
        rows={[
          [<Code key="1">GET /scan/test-types</Code>, "List all available test types with their categories and metadata."],
          [<Code key="2">GET /scan/suite-presets</Code>, "List the OWASP-mapped suite presets."],
          [<Code key="3">POST /scan/suite</Code>, "Launch a suite against an endpoint; fans out into one job per applicable test type."],
          [<Code key="4">{`GET /scan/suites/{id}`}</Code>, "Aggregate status and findings count for a suite run."],
        ]}
      />
      <CodeBlock title="POST /scan/suite">
{`curl -X POST https://your-host/scan/suite \\
  -H 'Authorization: Bearer <access_token>' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "inventory_id": "<endpoint id>",
    "suite": "OWASP_API_TOP_10",
    "auth_contexts": { "attacker": "Bearer …", "victim": "Bearer …" }
  }'

# → { "suite_id": "…", "job_count": 17, "test_types": [ … ], "skipped": [ … ] }`}
      </CodeBlock>
      <P>
        Poll the suite for aggregate progress, then read its findings by suite id:
      </P>
      <CodeBlock title="suite status & findings">
{`curl https://your-host/scan/suites/<suite_id> \\
  -H 'Authorization: Bearer <access_token>'
# → { "job_count": 17, "status_counts": { "completed": 17 },
#     "total_findings": 6, "completed": true }

curl 'https://your-host/scan-results?suite_id=<suite_id>&limit=200' \\
  -H 'Authorization: Bearer <access_token>'`}
      </CodeBlock>

      <H2>Conventions</H2>
      <P>
        Every resource follows the same rules, so once you have called one endpoint you know how the rest
        behave.
      </P>
      <H3>Pagination</H3>
      <P>
        List endpoints are paginated with <Code>limit</Code> and <Code>offset</Code> query parameters and
        return the total alongside the page, so you can page through large inventories deterministically:
      </P>
      <CodeBlock title="GET /inventory?limit=50&offset=100">
{`{
  "items": [ … 50 endpoints … ],
  "total": 3187,
  "limit": 50,
  "offset": 100
}`}
      </CodeBlock>
      <H3>Errors</H3>
      <P>
        Errors use standard HTTP status codes with a JSON body carrying a stable machine-readable{" "}
        <Code>error</Code> code and a human-readable <Code>message</Code>. Handle the status class, and branch
        on the code when you need specifics:
      </P>
      <DocTable
        head={["Status", "When you'll see it"]}
        rows={[
          [<Code key="1">400</Code>, "The request body failed validation — a missing field or an unknown test type."],
          [<Code key="2">401</Code>, "Missing, expired, or invalid session token. Refresh and retry."],
          [<Code key="3">403</Code>, "Authenticated, but your role lacks permission for this action (see RBAC)."],
          [<Code key="4">404</Code>, "The resource does not exist, or belongs to another tenant and is therefore invisible to you."],
          [<Code key="5">409</Code>, "The request conflicts with current state — for example, a target that failed admission policy."],
          [<Code key="6">429</Code>, "You are being rate limited. Back off using the Retry-After header."],
        ]}
      />
      <CodeBlock title="error body">
{`HTTP/1.1 403 Forbidden
{
  "error": "insufficient_role",
  "message": "Role 'read-only' cannot trigger scans."
}`}
      </CodeBlock>
      <Callout type="warn" title="Tenant isolation shows up as 404, not 403">
        A resource in another account is not merely forbidden — it is invisible. Requests for it return{" "}
        <Code>404</Code> rather than <Code>403</Code>, so the API never even confirms that an object belonging
        to another tenant exists.
      </Callout>

      <H2>Findings & issues</H2>
      <DocTable
        head={["Method & path", "Description"]}
        rows={[
          [<Code key="1">GET /issues</Code>, "List deduplicated issues for your account."],
          [<Code key="2">{`PATCH /v1/issues/{id}`}</Code>, "Update an issue's status as you triage it."],
        ]}
      />

      <H2>Ingestion</H2>
      <P>
        Capture agents submit reconstructed conversations to a dedicated ingest endpoint using an ingest
        token. This is normally handled entirely by the agent — the Quick Start panel generates the correct
        command — but the endpoint is documented for custom integrations.
      </P>

      <Callout type="warn" title="Versioning">
        Stable resources are also available under a <Code>/v1</Code> prefix. Prefer the versioned paths for
        long-lived integrations.
      </Callout>

      <NextSteps
        links={[
          { label: "Scanner engine", href: "/docs/scanner", desc: "What each test type and suite does." },
          { label: "Security & privacy", href: "/docs/security", desc: "How access control is enforced." },
          { label: "Quick start", href: "/docs/getting-started", desc: "Get a token and make your first call." },
        ]}
      />
    </DocPage>
  )
}
