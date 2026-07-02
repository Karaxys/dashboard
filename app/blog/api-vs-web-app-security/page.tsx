import type { Metadata } from "next"
import { BlogArticle } from "@/components/blog/blog-article"
import { blogPostsBySlug } from "@/components/blog/posts"
import { H2, P, Strong, DocTable, Callout } from "@/components/docs/doc-ui"

const meta = blogPostsBySlug["api-vs-web-app-security"]

export const metadata: Metadata = {
  title: `${meta.title} — Karaxys Blog`,
  description: meta.excerpt,
}

export default function Post() {
  return (
    <BlogArticle meta={meta}>
      <P>
        A lot of API security programs are really web application security programs pointed at APIs. That
        seems reasonable — an API is served over HTTP, after all — but the assumptions baked into web app
        tooling quietly break when the client stops being a browser and starts being code. The result is a
        program that catches the wrong things and misses the ones that matter.
      </P>

      <H2>The client is an adversary&apos;s tool, not a browser</H2>
      <P>
        Classic web security leans on the browser: same-origin policy, cookies, CSRF tokens, content security
        policy. An API client honors none of that by default. It is a script. It will happily change an ID,
        swap a method, replay a request a million times, or read every field of a response the UI never shows.
        Defenses that assume a cooperative browser have little to say about a hostile client.
      </P>

      <H2>The vulnerabilities rank differently</H2>
      <P>
        Web app tooling is tuned for injection and cross-site issues. Those still exist in APIs, but they are
        not where APIs actually get breached. The dominant API risks are about <Strong>authorization</Strong>:
        can this caller reach that object, invoke that function, set that field? A scanner that spends its
        effort probing for reflected XSS and ignores object-level authorization is optimizing for the wrong
        century of the threat.
      </P>
      <DocTable
        head={["Web app instinct", "What matters more for APIs"]}
        rows={[
          [<Strong key="1">Injection & XSS first</Strong>, "Broken object- and function-level authorization first."],
          [<Strong key="2">Browser-based defenses</Strong>, "Server-side checks that assume a scripted, hostile client."],
          [<Strong key="3">Crawl the site&apos;s links</Strong>, "Discover endpoints from real traffic — there are no links to crawl."],
          [<Strong key="4">One app, one origin</Strong>, "Many services, versions, and hosts, changing continuously."],
        ]}
      />

      <H2>Discovery works differently</H2>
      <P>
        A web scanner discovers pages by following links. An API has no links to follow — endpoints are called
        by code, documented inconsistently if at all, and spread across versions and services. Point a
        link-crawler at an API and it finds almost nothing. API discovery has to come from somewhere else
        entirely: the traffic that already flows to those endpoints in real use.
      </P>
      <Callout type="info" title="Why traffic-based discovery wins">
        The endpoints most likely to be vulnerable are the ones nobody documented. They do not appear in a
        crawl or an OpenAPI file — but they do appear in traffic. Watching real requests surfaces the shadow
        surface that matters.
      </Callout>

      <H2>Testing needs identity and context</H2>
      <P>
        You cannot meaningfully test authorization with an anonymous scanner. Proving that user A can reach
        user B&apos;s data requires <em>two</em> identities and a comparison between them. Web app scanners
        rarely model this; API testing has to, because the whole risk class lives in the gap between
        &ldquo;authenticated&rdquo; and &ldquo;authorized.&rdquo;
      </P>

      <H2>What an API-first program looks like</H2>
      <P>
        Reorient around what actually breaks APIs: discover the full endpoint surface from real traffic rather
        than crawling; classify the sensitive data flowing through each endpoint; and test authorization first
        — object, function, and property level — with real identities and real request shapes. Web app
        hygiene still matters, but it is the supporting act, not the headline.
      </P>
    </BlogArticle>
  )
}
