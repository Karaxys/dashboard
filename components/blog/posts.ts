import type { BlogMeta } from "./blog-article"

// Blog post metadata, shared by the resources grid and the article pages.
// Ordered newest first.
export const blogPosts: BlogMeta[] = [
  {
    slug: "owasp-api-top-10-explained",
    category: "Guide",
    date: "Jul 1, 2026",
    readTime: "9 min read",
    title: "The OWASP API Security Top 10, explained",
    excerpt: "A plain-language tour of the ten risks that define modern API security — what each one is, why it happens, and how to defend against it.",
  },
  {
    slug: "lessons-from-api-breaches",
    category: "Research",
    date: "Jun 27, 2026",
    readTime: "7 min read",
    title: "What API breaches keep teaching us",
    excerpt: "The headline API breaches of the last few years rhyme. A look at the recurring patterns — and why authorization, not exotic exploits, is almost always the story.",
  },
  {
    slug: "api-vs-web-app-security",
    category: "Guide",
    date: "Jun 20, 2026",
    readTime: "6 min read",
    title: "Why API security is not just web app security",
    excerpt: "Firewalls and scanners tuned for web apps miss the risks that matter most for APIs. Here is what changes when the client is code, not a browser.",
  },
  {
    slug: "capturing-api-traffic-with-ebpf",
    category: "Product",
    date: "Jun 30, 2026",
    readTime: "6 min read",
    title: "Capturing API traffic at the kernel with eBPF",
    excerpt: "Why zero-instrumentation capture beats SDKs and proxies for complete API visibility — and how we see inside TLS without holding a single key.",
  },
  {
    slug: "owasp-api-top-10-suites",
    category: "Engineering",
    date: "Jun 24, 2026",
    readTime: "7 min read",
    title: "Running the OWASP API Top 10 as parallel scan suites",
    excerpt: "How we fan a suite out into independent, applicability-filtered scan jobs so testing scales horizontally without hammering a target.",
  },
  {
    slug: "anatomy-of-a-bola",
    category: "Research",
    date: "Jun 18, 2026",
    readTime: "5 min read",
    title: "Anatomy of a BOLA: how one ID became a full data breach",
    excerpt: "A walk-through of broken object-level authorization — the #1 API risk — and how passive discovery plus a two-request test catches it early.",
  },
  {
    slug: "redaction-by-default",
    category: "Research",
    date: "Jun 9, 2026",
    readTime: "5 min read",
    title: "Detecting sensitive data without storing secrets",
    excerpt: "Redaction-by-default and how a security tool can keep its evidence useful without becoming a copy of everything it was meant to protect.",
  },
]

export const blogPostsBySlug: Record<string, BlogMeta> = Object.fromEntries(
  blogPosts.map((p) => [p.slug, p]),
)
