import type { Metadata } from "next"
import { BlogArticle } from "@/components/blog/blog-article"
import { blogPostsBySlug } from "@/components/blog/posts"
import { H2, P, Strong, Code, CodeBlock, Callout } from "@/components/docs/doc-ui"

const meta = blogPostsBySlug["anatomy-of-a-bola"]

export const metadata: Metadata = {
  title: `${meta.title} — Karaxys Blog`,
  description: meta.excerpt,
}

export default function Post() {
  return (
    <BlogArticle meta={meta}>
      <P>
        Broken Object Level Authorization — BOLA — is the number one risk on the OWASP API Security Top 10, and
        it is number one for a reason: it is easy to introduce, hard to spot in review, and devastating when
        exploited. The whole vulnerability fits in a single sentence: the server checks that you are logged in,
        but not that the object you asked for is yours.
      </P>

      <H2>The one-line bug</H2>
      <P>
        Consider an endpoint that returns an order:
      </P>
      <CodeBlock title="request">
{`GET /api/orders/1042
Authorization: Bearer <alice's token>

200 OK
{ "id": 1042, "customer": "Alice", "total": 84.20, "address": "…" }`}
      </CodeBlock>
      <P>
        Alice owns order 1042, so this is correct. The bug appears when Alice changes one number:
      </P>
      <CodeBlock title="the attack">
{`GET /api/orders/1043
Authorization: Bearer <alice's token>

200 OK
{ "id": 1043, "customer": "Bob", "total": 512.00, "address": "…" }`}
      </CodeBlock>
      <P>
        The server authenticated Alice&apos;s token and stopped there. It never asked whether order 1043
        belongs to her. With a short script iterating IDs, one valid session becomes a full export of every
        customer&apos;s data. No exploit chain, no special tools — just a <Code>for</Code> loop.
      </P>

      <H2>Why it survives code review</H2>
      <P>
        BOLA hides because each endpoint looks fine on its own. The authentication middleware is present and
        working; the missing check is a single ownership comparison buried in one handler among hundreds.
        Multiply that across a large team and a fast-moving codebase, and the odds that <em>every</em> handler
        gets it right approach zero. This is exactly why it needs to be tested for, continuously, rather than
        reasoned about once.
      </P>

      <H2>Catching it with two requests</H2>
      <P>
        Detecting BOLA reliably takes more than a single request — you have to demonstrate that one identity
        can reach another&apos;s object. Karaxys does this with a two-step, chained test:
      </P>
      <P>
        First it reads an object identifier from a listing response. Then it requests that same object directly
        using a <Strong>different user&apos;s</Strong> credentials. If the second request succeeds and returns
        the object, the ownership check is missing — and the finding comes with the exact requests to reproduce
        it.
      </P>
      <Callout type="tip" title="Why auth context matters">
        BOLA can only be proven if the scanner has two identities to compare. Supplying an attacker and a
        victim token in the scan form is what unlocks these tests — without them, the check is skipped rather
        than guessed at.
      </Callout>

      <H2>Discovery makes it tractable</H2>
      <P>
        You cannot test an endpoint you do not know exists, and BOLA loves forgotten endpoints. Because
        Karaxys builds its inventory passively from real traffic, the object-bearing endpoints most prone to
        BOLA — the ones that take an ID and return a record — are discovered automatically, then tested with
        real request shapes captured from live use. Complete discovery and a two-request test turn the
        industry&apos;s most common API flaw into something you find before an attacker does.
      </P>
    </BlogArticle>
  )
}
