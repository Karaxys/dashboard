import type { Metadata } from "next"
import { BlogArticle } from "@/components/blog/blog-article"
import { blogPostsBySlug } from "@/components/blog/posts"
import { H2, P, Strong, Callout } from "@/components/docs/doc-ui"

const meta = blogPostsBySlug["owasp-api-top-10-explained"]

export const metadata: Metadata = {
  title: `${meta.title} — Karaxys Blog`,
  description: meta.excerpt,
}

export default function Post() {
  return (
    <BlogArticle meta={meta}>
      <P>
        The OWASP API Security Top 10 is the industry&apos;s shared map of where APIs go wrong. It is worth
        knowing not because lists are magic, but because the same handful of mistakes account for the large
        majority of real incidents. Here is each risk in plain language — what it is, why it happens, and the
        shape of the defense. (This follows the 2023 edition.)
      </P>

      <Callout type="info" title="A theme before the list">
        Notice how many of these are about <Strong>authorization</Strong> — who is allowed to do what — rather
        than exotic memory corruption or clever payloads. APIs fail at &ldquo;should this caller be allowed to
        do this&rdquo; far more often than at anything else.
      </Callout>

      <H2>API1 — Broken Object Level Authorization (BOLA)</H2>
      <P>
        The server checks that you are authenticated but not that the specific object you asked for is yours.
        Change an ID in the URL and you see someone else&apos;s record. It is the most common and most damaging
        API flaw. Defense: enforce an ownership check on every object access, derived from the session, not
        from a value the client can change.
      </P>

      <H2>API2 — Broken Authentication</H2>
      <P>
        Weaknesses in how identity is established: accepting unsigned or tampered tokens, weak or default
        credentials, missing rate limits on login. Defense: validate tokens rigorously (signature and
        algorithm), reject defaults, and protect authentication endpoints from brute force.
      </P>

      <H2>API3 — Broken Object Property Level Authorization</H2>
      <P>
        Even when access to an object is correct, individual <em>fields</em> may not be. Two failure modes: the
        API returns properties the caller should not see (excessive data exposure), or accepts properties the
        caller should not be able to set (mass assignment — sending <Strong>{`"role": "admin"`}</Strong> and
        having it stick). Defense: explicitly control which fields can be read and written, per role.
      </P>

      <H2>API4 — Unrestricted Resource Consumption</H2>
      <P>
        Every request costs CPU, memory, bandwidth, or money (think third-party API calls and SMS). Without
        limits, an attacker can drive cost or cause denial of service. Defense: rate limiting, pagination
        caps, payload size limits, and timeouts.
      </P>

      <H2>API5 — Broken Function Level Authorization (BFLA)</H2>
      <P>
        Like BOLA, but for <em>actions</em> instead of objects: a regular user reaches an administrative
        function simply by calling it — often just by changing the HTTP method or hitting an admin route.
        Defense: deny by default and check role on every function, especially state-changing ones.
      </P>

      <H2>API6 — Unrestricted Access to Sensitive Business Flows</H2>
      <P>
        Some flows are fine for a human but harmful when automated at scale — buying all the concert tickets,
        creating accounts in bulk, scraping a catalog. The individual requests are &ldquo;valid.&rdquo;
        Defense: identify sensitive flows and add friction against automation, not just against malformed
        requests.
      </P>

      <H2>API7 — Server-Side Request Forgery (SSRF)</H2>
      <P>
        The API fetches a URL the client supplies, and an attacker points it at internal systems or
        cloud-metadata endpoints to reach things they should not. Blind variants leak nothing in the response,
        which makes them easy to miss. Defense: validate and constrain outbound URLs, block internal and
        metadata ranges, and test with out-of-band detection.
      </P>

      <H2>API8 — Security Misconfiguration</H2>
      <P>
        The broad bucket: permissive CORS, verbose error messages, missing security headers, exposed debug or
        metrics endpoints, unpatched defaults. Individually small, collectively serious. Defense: hardened,
        reviewed, and repeatable configuration — and scanning for the exposures that slip through.
      </P>

      <H2>API9 — Improper Inventory Management</H2>
      <P>
        You cannot protect what you do not know you run. Old API versions left online, undocumented hosts,
        forgotten staging endpoints — shadow and zombie APIs are a leading root cause of breaches. Defense:
        continuous, automatic discovery of every endpoint and host, not a spreadsheet updated quarterly.
      </P>

      <H2>API10 — Unsafe Consumption of APIs</H2>
      <P>
        Teams validate user input but implicitly trust the third-party APIs they call. A compromised or
        malicious upstream can then feed you bad data. Defense: treat data from other APIs with the same
        suspicion as data from users — validate it, and constrain what an integration can do.
      </P>

      <H2>The through-line</H2>
      <P>
        Two lessons run through the whole list. First, <Strong>authorization is the hard part</Strong> —
        object-level, function-level, and property-level checks are where APIs most often fail. Second,{" "}
        <Strong>you cannot secure what you cannot see</Strong> — inventory and continuous testing turn this
        list from an abstract checklist into something you can actually measure against your own systems.
      </P>
    </BlogArticle>
  )
}
