import type { Metadata } from "next"
import { DocPage, DocLede, H2, P, Strong, UL, LI, DocTable, Callout, NextSteps } from "@/components/docs/doc-ui"

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
