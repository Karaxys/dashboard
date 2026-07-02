import type { Metadata } from "next"
import { DocPage, DocLede, H2, H3, P, Strong, Code, UL, LI, DocTable, Callout, NextSteps } from "@/components/docs/doc-ui"

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

      <H3>Schema learning</H3>
      <P>
        As more traffic arrives for an endpoint, Karaxys builds up a picture of its request and response
        shape — which fields appear, their types, and which headers it uses. The result is a schema learned
        from reality rather than from documentation that may be out of date.
      </P>

      <H2>Sensitive-data classification</H2>
      <P>
        Every field flowing through an endpoint is inspected for sensitive data and tagged accordingly.
        Classifications include personal information, credentials and tokens, and financial identifiers. An
        endpoint that carries sensitive data is flagged so it rises to the top of your attention — and so
        the scanner can weigh severity accordingly.
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
