import type { Metadata } from "next"
import { BlogArticle } from "@/components/blog/blog-article"
import { blogPostsBySlug } from "@/components/blog/posts"
import { H2, P, Strong, UL, LI, Callout } from "@/components/docs/doc-ui"

const meta = blogPostsBySlug["capturing-api-traffic-with-ebpf"]

export const metadata: Metadata = {
  title: `${meta.title} — Karaxys Blog`,
  description: meta.excerpt,
}

export default function Post() {
  return (
    <BlogArticle meta={meta}>
      <P>
        You cannot secure what you cannot see. The hardest part of API security is not writing tests — it is
        knowing which APIs exist in the first place. Every team we talk to has more endpoints than their
        catalog admits: old versions still in production, internal services quietly exposed, routes a
        contractor added two years ago. The question is how to discover them without a heroic manual effort.
      </P>

      <H2>Three ways to see API traffic</H2>
      <P>
        There are broadly three approaches, and the first two have the same fatal flaw — they only see what
        you remember to point them at.
      </P>
      <UL>
        <LI>
          <Strong>Language SDKs.</Strong> Instrument every service to report its own traffic. Accurate where
          installed, but it requires code changes in every codebase and only covers the languages and teams
          that adopt it. The shadow endpoints you most want to find are exactly the ones nobody instrumented.
        </LI>
        <LI>
          <Strong>Sidecar proxies.</Strong> Route traffic through a proxy that records it. Comprehensive for
          traffic that flows through the proxy — and blind to everything that does not.
        </LI>
        <LI>
          <Strong>Kernel capture with eBPF.</Strong> Observe traffic at the operating-system layer, below the
          application, where every process&apos;s socket I/O is visible. Nothing to install per service,
          nothing to route, nothing to bypass.
        </LI>
      </UL>

      <H2>Why the kernel is the right layer</H2>
      <P>
        eBPF lets you run small, verified programs inside the Linux kernel, attached to the exact functions
        that carry socket reads and writes. Because that is where <em>all</em> network I/O funnels, a single
        agent on a host sees traffic from every process on it — regardless of language, framework, or whether
        anyone remembered it existed. The kernel verifier proves the program is safe before it ever runs, which
        is what makes this viable on production systems rather than just a lab trick.
      </P>

      <H2>The TLS problem — and a clean answer</H2>
      <P>
        Most API traffic is encrypted, so capturing at the socket alone would hand you ciphertext. The naive
        fixes are all bad: terminating TLS makes you a man in the middle, and exporting private keys is a
        non-starter for any security-conscious team.
      </P>
      <P>
        The clean answer is to read the plaintext at the moment the application itself works with it — by
        attaching to the entry points of common TLS libraries, just before data is encrypted and just after it
        is decrypted. The data is read from the same process that already legitimately holds it.
      </P>
      <Callout type="security" title="No keys, no interception">
        This gives complete visibility into encrypted API traffic without terminating TLS, holding private
        keys, or sitting in the network path. Capture stays passive and read-only.
      </Callout>

      <H2>Making it keep up</H2>
      <P>
        A busy host generates socket events faster than any single consumer can drain them, so the engineering
        challenge shifts from &ldquo;can we see it&rdquo; to &ldquo;can we keep up.&rdquo; The techniques that
        matter are spreading events across multiple per-CPU buffers so many cores publish in parallel, copying
        only a bounded slice of each payload to keep per-event work small, and pre-filtering to API traffic
        before the expensive reassembly step. Done well, capture keeps pace under real load rather than
        silently dropping the traffic you most needed to see.
      </P>

      <H2>The payoff</H2>
      <P>
        The result is an inventory that builds itself. Exercise your application and endpoints appear —
        normalized, schema-learned, and flagged for sensitive data — with no SDK to install and no proxy to
        route through. That complete, always-current picture is the foundation everything else in a security
        program is built on.
      </P>
    </BlogArticle>
  )
}
