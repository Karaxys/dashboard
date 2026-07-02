import type { Metadata } from "next"
import { BlogArticle } from "@/components/blog/blog-article"
import { blogPostsBySlug } from "@/components/blog/posts"
import { H2, P, Strong, Callout } from "@/components/docs/doc-ui"

const meta = blogPostsBySlug["redaction-by-default"]

export const metadata: Metadata = {
  title: `${meta.title} — Karaxys Blog`,
  description: meta.excerpt,
}

export default function Post() {
  return (
    <BlogArticle meta={meta}>
      <P>
        A tool that watches all of your API traffic to find security problems has an uncomfortable property: it
        watches all of your API traffic. Do it carelessly and you have built a single place where every token,
        password, and personal record your systems handle is conveniently collected for an attacker. The whole
        value of the tool depends on not becoming that.
      </P>

      <H2>The tension</H2>
      <P>
        Security evidence needs to be specific. To tell you an endpoint leaks credentials, a tool has to have
        seen the credentials. To reproduce a finding, it needs the request that triggered it. That specificity
        is in direct tension with the goal of not hoarding secrets — and the resolution is to separate the two
        things you actually need from the one thing you do not.
      </P>

      <H2>What&apos;s worth keeping</H2>
      <P>
        For nearly every security purpose, you need to know <Strong>that</Strong> a field is sensitive and{" "}
        <Strong>where</Strong> it occurs — not the secret value itself. &ldquo;This endpoint returns a field
        classified as a credential&rdquo; is the actionable fact. The literal credential adds risk without
        adding insight.
      </P>
      <P>
        So the design principle is redaction by default: classify the value, record its type and location, and
        redact it before anything is persisted. The durable record — your inventory and your findings — carries
        the classification, not the secret.
      </P>
      <Callout type="security" title="Evidence without exposure">
        Findings stay reproducible and inventory stays useful, but the raw sensitive values behind them are not
        kept in the clear. The result is a security dataset that is safe to share with your own team.
      </Callout>

      <H2>Treat raw traffic as radioactive</H2>
      <P>
        Some raw payload is unavoidable in the moment of capture and analysis. The right posture is to treat it
        as the most sensitive and least durable data in the system: keep it only as long as processing needs
        it, and expire it automatically. Value flows into the distilled, redacted result; the raw capture does
        not linger.
      </P>

      <H2>Least privilege everywhere else</H2>
      <P>
        Redaction is the core idea, but it works alongside the ordinary disciplines: strict tenant isolation so
        one account never sees another&apos;s data, role-based access so people see only what their job needs,
        and audit logging so access is accountable. Together they make the honest claim a security tool should
        be able to make — that using it reduces your risk rather than quietly concentrating it.
      </P>
    </BlogArticle>
  )
}
