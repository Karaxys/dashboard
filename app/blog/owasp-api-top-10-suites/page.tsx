import type { Metadata } from "next"
import { BlogArticle } from "@/components/blog/blog-article"
import { blogPostsBySlug } from "@/components/blog/posts"
import { H2, P, Strong, CodeBlock, UL, LI, Callout } from "@/components/docs/doc-ui"

const meta = blogPostsBySlug["owasp-api-top-10-suites"]

export const metadata: Metadata = {
  title: `${meta.title} — Karaxys Blog`,
  description: meta.excerpt,
}

export default function Post() {
  return (
    <BlogArticle meta={meta}>
      <P>
        Running one security check at a time does not scale to a real API surface. But the obvious
        alternative — a single monolithic scan that runs everything — creates its own problems: it is slow, a
        failure anywhere fails the whole run, and it is easy to accidentally hammer a target. We took a
        different path: fan a suite out into many small, independent jobs.
      </P>

      <H2>A suite is a plan, not a process</H2>
      <P>
        When you launch the OWASP API Top 10 suite against an endpoint, Karaxys does not start one big job. It
        expands the suite into one <Strong>scan job per test type</Strong>, all sharing a suite identifier:
      </P>
      <CodeBlock title="fan-out">
{`Suite: OWASP API Top 10  ──►  POST /orders
        ├─ job  BOLA
        ├─ job  BFLA
        ├─ job  MASS_ASSIGNMENT
        ├─ job  SQL_INJECTION
        ├─ job  SSRF
        └─ …                    one job per applicable test type`}
      </CodeBlock>
      <P>
        Each job is scheduled and executed on its own. That single decision buys a lot: work spreads across
        every scanner worker automatically, a slow check never blocks a fast one, and one failed job is
        isolated instead of sinking the run. Add more workers and throughput goes up — no worker needs to know
        another exists, because they coordinate through a shared queue and a set of cluster-wide limits.
      </P>

      <H2>Don&apos;t run tests that can&apos;t apply</H2>
      <P>
        Fan-out only helps if the jobs are worth running. A body-injection test against an endpoint with no
        body, or an authorization test with no credentials to compare, produces nothing but noise. So before
        expanding a suite, we filter it to the tests that are actually meaningful for the target, based on:
      </P>
      <UL>
        <LI>the endpoint&apos;s shape — method, path, and whether it carries a request body;</LI>
        <LI>the credentials available — some tests need an attacker and a victim identity to compare;</LI>
        <LI>each test&apos;s declared prerequisites — anything whose inputs are missing is skipped.</LI>
      </UL>
      <P>
        Skipped tests are reported back, so a suite run is transparent: you see exactly what ran and what was
        left out, and why.
      </P>

      <H2>Safe by construction</H2>
      <P>
        Because every job flows through the same scheduler, the safety controls apply uniformly no matter how
        many jobs a suite produces: a global concurrency cap, per-target rate limiting so no single service is
        overwhelmed, and a distributed lock so each job runs exactly once. A suite of forty jobs is as gentle
        on the target as running them by hand — just far faster and fully tracked.
      </P>
      <Callout type="security" title="Only your own inventory">
        Every job&apos;s target is an endpoint from your inventory, which is built only from your own captured
        traffic. There is no way to aim a suite at a URL you have not already observed.
      </Callout>

      <H2>Watching it happen</H2>
      <P>
        Because jobs share a suite identifier, the dashboard can aggregate them live — a progress bar of
        completed versus running jobs, per-status counts, and a running tally of findings by severity. When the
        last job finishes, the suite is done, and its findings are already deduplicated into tracked issues.
      </P>
    </BlogArticle>
  )
}
