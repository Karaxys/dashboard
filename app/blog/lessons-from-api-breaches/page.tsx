import type { Metadata } from "next"
import { BlogArticle } from "@/components/blog/blog-article"
import { blogPostsBySlug } from "@/components/blog/posts"
import { H2, P, Strong, UL, LI, Callout } from "@/components/docs/doc-ui"

const meta = blogPostsBySlug["lessons-from-api-breaches"]

export const metadata: Metadata = {
  title: `${meta.title} — Karaxys Blog`,
  description: meta.excerpt,
}

export default function Post() {
  return (
    <BlogArticle meta={meta}>
      <P>
        If you read enough API breach write-ups, a strange thing happens: they start to sound the same. The
        companies differ, the data differs, but the mechanism rarely does. There is almost never a Hollywood
        zero-day. There is an endpoint that returned data it should not have, to a caller it should have
        turned away. The lessons are not new — which is exactly why they are worth repeating.
      </P>

      <H2>Pattern 1: the object that wasn&apos;t yours</H2>
      <P>
        The single most common story is broken object-level authorization. An endpoint takes an identifier —
        a user ID, an order number, an account reference — and returns the record without checking that it
        belongs to the caller. Enumerate the identifier and you enumerate the database. It requires no tooling
        beyond a script, which is precisely what makes it so damaging: the barrier to exploitation is
        essentially zero.
      </P>
      <Callout type="warn" title="Why it recurs">
        This check is missing in <em>one</em> handler, not the whole codebase. Authentication is present and
        working, which lulls reviewers. The flaw is a single absent ownership comparison hidden among
        hundreds of endpoints — invisible unless you test for it directly.
      </Callout>

      <H2>Pattern 2: the API said too much</H2>
      <P>
        Again and again, an endpoint returns a complete object when the client only needed part of it. The UI
        shows a name and avatar; the JSON also contains the email, phone, password reset token, and internal
        flags. The client never displays them, so nobody noticed — until someone read the raw response.
        Filtering data at the client is not filtering data.
      </P>

      <H2>Pattern 3: the endpoint nobody remembered</H2>
      <P>
        A striking share of incidents trace back to APIs the owning team had forgotten: a deprecated version
        still serving traffic, a debug route left enabled, a host from a migration that was never
        decommissioned. These endpoints miss out on every later security improvement because no one knows to
        apply it to them. Shadow and zombie APIs are not an edge case; they are a leading root cause.
      </P>

      <H2>Pattern 4: automation of a &ldquo;valid&rdquo; flow</H2>
      <P>
        Sometimes nothing is technically broken. Each request is well-formed and authorized. The damage comes
        from doing a legitimate thing at illegitimate scale — mass account creation, credential stuffing,
        inventory scraping, coupon abuse. Defenses tuned to reject malformed input wave these through, because
        the requests are not malformed. They are just automated.
      </P>

      <H2>What the pattern list tells us to do</H2>
      <P>
        The uniformity of these stories is good news: a small number of disciplines addresses most of them.
      </P>
      <UL>
        <LI>
          <Strong>Test authorization, don&apos;t assume it.</Strong> Object- and function-level checks are
          where APIs fail; verify them continuously with real requests, not by reading code once.
        </LI>
        <LI>
          <Strong>Know your full surface.</Strong> Continuous discovery of every endpoint and host is the only
          antidote to the forgotten-endpoint breach.
        </LI>
        <LI>
          <Strong>Mind the response, not just the request.</Strong> Watch what your APIs return, and classify
          the sensitive data flowing out of them.
        </LI>
        <LI>
          <Strong>Rate-limit the flows that matter.</Strong> Protect sensitive business flows against
          automation, not only against bad syntax.
        </LI>
      </UL>

      <P>
        None of this is exotic. The reason breaches keep happening is not that the defenses are unknown — it is
        that they have to be applied to <em>every</em> endpoint, including the ones nobody remembers. Complete
        visibility and continuous testing are what make &ldquo;every endpoint&rdquo; achievable.
      </P>
    </BlogArticle>
  )
}
