import type { Metadata } from "next"
import { DocPage, DocLede, H2, H3, P, Strong, CodeBlock, UL, LI, DocTable, Callout, NextSteps } from "@/components/docs/doc-ui"

export const metadata: Metadata = {
  title: "Security & privacy — Karaxys Docs",
  description: "How Karaxys protects your data and your targets: RBAC, redaction, retention, audit logging, and scan-time SSRF protections.",
}

export default function SecurityPage() {
  return (
    <DocPage>
      <DocLede
        eyebrow="Platform"
        title="Security & privacy"
        description="Karaxys is a security tool, so it holds itself to a high bar. This page covers how access is controlled, how sensitive data is handled, and how the scanner is prevented from ever being turned against systems you do not own."
      />

      <H2>What the platform is trusted with</H2>
      <P>
        Karaxys is unusual among security tools in how much sensitive material passes through it: it observes
        real production traffic, including credentials in flight and personal data in payloads, and it holds an
        active scanner capable of making requests against real systems. The design starts from that reality and
        works backward — every control below exists to reduce what an attacker, a bug, or a careless operator
        could do with that access.
      </P>
      <DocTable
        head={["Asset at risk", "Primary protection"]}
        rows={[
          [<Strong key="1">Sensitive values in captured traffic</Strong>, "Redacted before persistence, so the durable store never holds secrets in the clear."],
          [<Strong key="2">Your API estate as a scan target</Strong>, "Inventory-only targeting plus SSRF-style address filtering, so the scanner cannot be steered at internal services."],
          [<Strong key="3">One tenant&apos;s data vs. another&apos;s</Strong>, "Every query is scoped to the caller's account; there is no cross-tenant read path."],
          [<Strong key="4">Account access</Strong>, "Short-lived session tokens, server-enforced RBAC, and an append-only audit trail."],
        ]}
      />

      <H2>Authentication & accounts</H2>
      <P>
        Access to the dashboard and API is authenticated with short-lived session tokens issued on sign-in,
        with support for social sign-on. Capture agents authenticate separately, using scoped ingest tokens
        that can be rotated at any time and are never reused across accounts.
      </P>

      <H2>Role-based access control</H2>
      <P>
        Every account supports multiple users with distinct roles. Permissions are enforced on the server for
        every request — the dashboard never grants access the API would deny.
      </P>
      <DocTable
        head={["Role", "Can do"]}
        rows={[
          [<Strong key="1">Administrator</Strong>, "Full control: settings, users, data sources, scans, and findings."],
          [<Strong key="2">Analyst</Strong>, "Run scans and triage findings across the account's inventory."],
          [<Strong key="3">Scanner</Strong>, "Trigger and monitor scans."],
          [<Strong key="4">Read-only</Strong>, "View inventory, findings, and reports without making changes."],
        ]}
      />

      <H2>Redaction by default</H2>
      <P>
        Capturing real traffic means sensitive values pass through the platform. Karaxys is built so those
        values are <Strong>redacted before they are stored</Strong>. The system retains what it needs to be
        useful — that a field exists, its type, and that it was classified as sensitive — without persisting
        the secret itself.
      </P>
      <P>
        Concretely, when a field is classified as sensitive, its value is replaced with a placeholder that
        preserves the <em>shape</em> of the data without the data itself. Analysts still see the structure of a
        request or response; they do not see the secret:
      </P>
      <CodeBlock title="before redaction → after redaction">
{`{                               {
  "id": 1042,                     "id": 1042,
  "email": "alice@corp.com",  →   "email": "«redacted:email»",
  "card": "4111 1111 1111 1111",  "card":  "«redacted:pan»",
  "role": "admin"                 "role":  "admin"
}                               }`}
      </CodeBlock>
      <P>
        Redaction happens in the analyzer, <Strong>before the durable write</Strong> — not as a display-time
        filter over stored secrets. The distinction matters: a display filter still leaves plaintext in the
        database. Redacting on the way in means the secret was never persisted at all.
      </P>
      <Callout type="security" title="Evidence without exposure">
        Findings and inventory are designed to be safe to share with your team. Reproduction details are
        preserved, but the raw sensitive values behind them are not kept in the clear.
      </Callout>

      <H2>Data retention</H2>
      <P>
        Raw traffic logs are the most sensitive data the platform touches and the least valuable to keep
        long-term, so they are retained only briefly and expire automatically. The durable record — your
        inventory, findings, and issues — is the distilled, redacted result, not the raw capture.
      </P>

      <H2>Audit logging</H2>
      <P>
        Security-relevant actions — creating scans, changing settings, rotating tokens — are recorded to an
        audit log with the actor, action, and outcome, so account activity is accountable and reviewable.
      </P>

      <H2>Scan-time target protections</H2>
      <P>
        An active scanner is a powerful tool, and a careless one could be abused to probe internal
        infrastructure. Karaxys prevents that with defense in depth:
      </P>
      <UL>
        <LI>
          <Strong>Inventory-only targets.</Strong> There is no way to ask the scanner to hit an arbitrary
          URL. Targets come exclusively from your inventory, which is built only from your own captured
          traffic.
        </LI>
        <LI>
          <Strong>Target validation.</Strong> Before a scan runs, its target is resolved and checked against
          policy. Requests to private, reserved, or cloud-metadata address ranges are blocked by default, so
          the scanner cannot be steered at internal services or credential endpoints.
        </LI>
        <LI>
          <Strong>Allow and deny lists.</Strong> Operators can further constrain, or explicitly permit,
          which hosts are in scope for their deployment.
        </LI>
        <LI>
          <Strong>Rate and concurrency limits.</Strong> Even in-scope targets are protected from load by
          per-target rate limiting and a global concurrency cap.
        </LI>
      </UL>
      <H3>How a target is admitted</H3>
      <P>
        Before any request is sent, a scan target passes through a resolution and policy check. The address it
        resolves to — not just the hostname you were shown — is evaluated, which closes the DNS-rebinding gap
        where a public name points at a private address:
      </P>
      <CodeBlock title="target admission">
{`inventory endpoint  ──►  resolve host to address
                             │
                             ├─ private / loopback   (10/8, 127/8, 192.168/16)   ──►  BLOCK
                             ├─ link-local / metadata (169.254.169.254)          ──►  BLOCK
                             ├─ reserved / multicast                             ──►  BLOCK
                             ├─ on operator deny list                            ──►  BLOCK
                             └─ otherwise / on allow list                        ──►  ADMIT`}
      </CodeBlock>
      <P>
        The cloud metadata endpoint is called out deliberately: it is the classic SSRF prize, because reaching
        it can hand an attacker short-lived cloud credentials. Blocking that range by default means even a
        genuine SSRF-style flaw in a target cannot be turned into credential theft <em>through</em> the scanner.
      </P>

      <Callout type="security" title="Out-of-band detection is opt-in">
        The scanner&apos;s out-of-band vulnerability detection is off unless you enable it, and can be pointed
        at your own self-hosted interaction server — so callback URLs are never sent to a third-party service
        against your infrastructure without your explicit choice.
      </Callout>

      <H2>Tenant isolation</H2>
      <P>
        Every record in the platform is scoped to an account. Queries are constrained to the caller&apos;s
        tenant, so one account&apos;s traffic, inventory, and findings are never visible to another.
      </P>

      <NextSteps
        links={[
          { label: "Scanner engine", href: "/docs/scanner", desc: "How safe execution is enforced end to end." },
          { label: "Architecture", href: "/docs/architecture", desc: "Where these controls live in the system." },
          { label: "API reference", href: "/docs/api-reference", desc: "Authenticate and call the API." },
        ]}
      />
    </DocPage>
  )
}
