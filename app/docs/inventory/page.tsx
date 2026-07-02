import type { Metadata } from "next"
import { DocPage, DocLede, H2, H3, P, Strong, Code, CodeBlock, UL, LI, DocTable, Callout, NextSteps } from "@/components/docs/doc-ui"

export const metadata: Metadata = {
  title: "API inventory — Karaxys Docs",
  description: "How Karaxys turns captured traffic into a normalized, classified, continuously updated API inventory.",
}

export default function InventoryPage() {
  return (
    <DocPage>
      <DocLede
        eyebrow="Traffic capture"
        title="API inventory"
        description="The inventory is the heart of the platform — a living catalog of every API endpoint discovered from real traffic, complete with learned schemas, sample requests, and sensitive-data classification."
      />

      <H2>From conversation to endpoint</H2>
      <P>
        Each captured conversation is a single request/response pair. On its own that is just an event; the
        value comes from aggregation. The runtime analyzer collapses many conversations into a small number
        of <Strong>endpoints</Strong> by recognizing when different requests are really the same operation.
      </P>

      <H3>Path normalization</H3>
      <P>
        Requests to <Code>/users/1042</Code>, <Code>/users/1043</Code>, and <Code>/users/1044</Code> are the
        same endpoint with a different identifier. Karaxys deterministically templates the variable segments
        into a pattern like <Code>{`/users/{id}`}</Code>, so your inventory shows one endpoint instead of
        thousands — and new IDs never inflate it.
      </P>
      <P>
        The hard part is deciding <em>which</em> segments are variable. A segment is treated as a parameter
        when the traffic shows it behaving like one — many distinct high-cardinality values in the same
        position, matching the shape of an identifier (numeric IDs, UUIDs, hashes, slugs) — while stable
        segments that name a resource stay literal. The result is a template that matches how the route is
        actually defined on the server:
      </P>
      <CodeBlock title="normalization">
{`observed traffic                          normalized endpoint
────────────────────────────────────────  ──────────────────────────
GET /users/1042/orders/8891               GET /users/{id}/orders/{id}
GET /users/1043/orders/8892
GET /users/9007/orders/1188

GET /v2/reports/2026-06/export            GET /v2/reports/{param}/export
GET /v2/reports/2026-07/export

POST /auth/login                          POST /auth/login   (no params)`}
      </CodeBlock>
      <Callout type="info" title="Why deterministic matters">
        Normalization is deterministic: the same conversation always maps to the same endpoint fingerprint.
        That stability is what lets the inventory dedupe correctly, the scanner target a consistent endpoint,
        and findings deduplicate into issues — the fingerprint is the join key across the whole platform.
      </Callout>

      <H3>Schema learning</H3>
      <P>
        As more traffic arrives for an endpoint, Karaxys builds up a picture of its request and response
        shape — which fields appear, their types, and which headers it uses. Rather than trusting any single
        request, it <Strong>merges observations across many samples</Strong>: a field seen in every response
        is marked required, one seen occasionally is marked optional, and fields that carry different types
        across requests are recorded as a union. The result is a schema learned from reality rather than from
        documentation that may be out of date.
      </P>
      <CodeBlock title="learned schema (illustrative)">
{`GET /users/{id}  →  200
{
  "id":       integer        // present in 100% of samples → required
  "email":    string · PII   // classified sensitive
  "phone":    string · PII   // present in 82% of samples → optional
  "role":     "admin"|"user" // enum inferred from observed values
  "verified": boolean
}`}
      </CodeBlock>
      <P>
        This learned schema is more than documentation. It is what lets the scanner build{" "}
        <Strong>realistic</Strong> test requests — it knows the fields an endpoint expects, their types, and
        which are required — so a mass-assignment or injection probe targets real parameters instead of
        guessing blindly.
      </P>

      <H2>Sensitive-data classification</H2>
      <P>
        Every field flowing through an endpoint is inspected for sensitive data and tagged accordingly.
        Classification runs on both sides of the conversation — request and response — because sensitive data
        leaks in both directions: a token submitted in a header and a card number returned in a body are both
        worth knowing about.
      </P>
      <H3>How a field is classified</H3>
      <P>
        Detection combines two signals so it is neither too eager nor too blind:
      </P>
      <UL>
        <LI><Strong>Value shape</Strong> — the content itself is matched against patterns for known sensitive formats (email addresses, JWTs, card numbers with checksum validation, national IDs, API keys).</LI>
        <LI><Strong>Field name</Strong> — the key provides context, so a field named <Code>password</Code>, <Code>ssn</Code>, or <Code>authorization</Code> is treated with suspicion even when a single sample looks innocuous.</LI>
      </UL>
      <DocTable
        head={["Category", "Examples of what is detected"]}
        rows={[
          [<Strong key="1">Personal information</Strong>, "Names, email addresses, phone numbers, postal addresses, dates of birth."],
          [<Strong key="2">Government & financial IDs</Strong>, "National identifiers, passport numbers, and payment-card numbers validated by checksum."],
          [<Strong key="3">Credentials & tokens</Strong>, "Passwords, API keys, bearer and JWT tokens, session identifiers."],
          [<Strong key="4">Health & other regulated</Strong>, "Fields whose name or shape indicates regulated categories worth flagging for compliance."],
        ]}
      />
      <P>
        An endpoint that carries any sensitive category is flagged so it rises to the top of your attention —
        and the classification feeds directly into scan severity, so a vulnerability on an endpoint that
        returns payment data ranks above the identical flaw on one that does not.
      </P>
      <Callout type="security" title="Classified without being stored in the clear">
        Detection records that a field is sensitive and where it occurs, but values are redacted before
        persistence. Karaxys keeps the evidence useful without turning your inventory into a copy of your
        secrets. See Security &amp; privacy for details.
      </Callout>

      <H2>Risk signals</H2>
      <P>
        Endpoints are enriched with signals that help you prioritize:
      </P>
      <UL>
        <LI><Strong>Sensitive data</Strong> — the categories of sensitive fields observed on the endpoint.</LI>
        <LI><Strong>Authentication</Strong> — whether the endpoint is exercised with credentials or reachable anonymously.</LI>
        <LI><Strong>Traffic shape</Strong> — method, observed status codes, and representative sample requests and responses.</LI>
        <LI><Strong>Workload identity</Strong> — the container or service the traffic was captured from, when available.</LI>
      </UL>

      <H2>Always current</H2>
      <P>
        The inventory is continuous, not a point-in-time snapshot. New endpoints appear as soon as traffic
        reaches them, schemas sharpen as more requests arrive, and shadow or forgotten APIs surface simply by
        being used. There is no crawl to schedule and no catalog to maintain by hand.
      </P>
      <P>
        Because every endpoint records when it was first and last seen, the inventory doubles as a map of
        <Strong> API drift</Strong> — the gap between what you think you run and what is actually serving
        traffic:
      </P>
      <DocTable
        head={["Signal", "What it tells you"]}
        rows={[
          [<Strong key="1">Newly discovered</Strong>, "An endpoint seen for the first time — a fresh deploy, or a shadow API nobody documented."],
          [<Strong key="2">Actively served</Strong>, "Seen recently and regularly; part of the live surface that most needs testing."],
          [<Strong key="3">Gone quiet</Strong>, "Previously active but no longer seen — a candidate for deprecation, or a zombie endpoint still exposed but forgotten."],
        ]}
      />
      <Callout type="tip" title="Shadow APIs surface for free">
        The endpoints most likely to be vulnerable are the ones no one remembers — undocumented, unmonitored,
        and untested. Passive capture finds them the moment they serve a single request, which is exactly the
        surface a scheduled crawler or a hand-kept spreadsheet misses.
      </Callout>

      <H2>The basis for testing</H2>
      <P>
        Inventory is also the security boundary for active testing. The scanner draws its targets exclusively
        from inventory, and it uses each endpoint&apos;s captured shape — method, sample body, headers — to
        build realistic test requests. Better capture yields better tests.
      </P>

      <NextSteps
        links={[
          { label: "Scanner engine", href: "/docs/scanner", desc: "Test the endpoints in your inventory." },
          { label: "eBPF capture agent", href: "/docs/ebpf-agent", desc: "Where inventory data comes from." },
          { label: "Security & privacy", href: "/docs/security", desc: "How sensitive data is redacted and retained." },
        ]}
      />
    </DocPage>
  )
}
