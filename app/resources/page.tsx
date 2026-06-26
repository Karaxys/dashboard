import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MarketingShell, PageHeader } from "@/components/landing/marketing-shell"
import { Reveal } from "@/components/landing/reveal"

export const metadata: Metadata = {
  title: "Resources — Karaxys",
  description: "Research, guides, and product updates from the Karaxys team.",
}

const posts = [
  { category: "Research",    date: "Jun 18, 2026", title: "Anatomy of a BOLA: how one ID became a full data breach",          excerpt: "A walk-through of broken object-level authorization and how passive discovery catches it early." },
  { category: "Product",     date: "Jun 9, 2026",  title: "Capturing API traffic at the kernel with eBPF",                   excerpt: "Why zero-instrumentation capture beats SDKs and proxies for complete API visibility." },
  { category: "Guide",       date: "May 30, 2026", title: "A practical playbook for shadow API discovery",                   excerpt: "Find, classify, and govern the APIs your inventory never knew existed." },
  { category: "Research",    date: "May 21, 2026", title: "Detecting sensitive data exposure without storing secrets",        excerpt: "Redaction-by-default and how Karaxys keeps evidence useful but safe." },
  { category: "Engineering", date: "May 12, 2026", title: "Scaling an ingestion pipeline with a queue-backed analyzer",      excerpt: "Decoupling capture from analysis to keep ingestion fast under load." },
  { category: "Guide",       date: "Apr 28, 2026", title: "BFLA and broken function-level authorization in practice",        excerpt: "How role-based test contexts surface privilege escalation paths." },
]

const categoryColor: Record<string, string> = {
  Research:    "border-amber-500/30 text-amber-400",
  Product:     "border-sky-500/30 text-sky-400",
  Guide:       "border-emerald-500/30 text-emerald-400",
  Engineering: "border-violet-500/30 text-violet-400",
}

export default function ResourcesPage() {
  return (
    <MarketingShell>
      <PageHeader
        eyebrow="Resources"
        title="Insights for API security teams"
        description="Research, guides, and product updates to help you discover, classify, and defend every API."
      />

      {/* Blog */}
      <section id="blog" className="pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold tracking-tight text-white">From the blog</h2>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {posts.map((post, i) => (
              <Reveal key={post.title} delay={(i % 3) * 80}>
                <div className="group flex h-full flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-6 transition-colors hover:border-slate-700 hover:bg-slate-900">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={`text-xs ${categoryColor[post.category] ?? "border-slate-700 text-slate-400"}`}
                    >
                      {post.category}
                    </Badge>
                    <span className="text-xs text-slate-500">{post.date}</span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold leading-snug text-slate-100">
                    {post.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{post.excerpt}</p>
                  <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-medium text-amber-400 group-hover:underline">
                    Read more <ArrowRight className="size-3.5" />
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* About + Careers + Contact */}
      <section className="border-t border-slate-800/60 py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <Reveal>
            <h2 id="about" className="text-xl font-bold tracking-tight text-white">
              About Karaxys
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Karaxys is built by engineers who believe API security should start with complete
              visibility. By capturing traffic at the kernel with eBPF, we give security and platform
              teams a continuously updated inventory, sensitive-data classification, and safe active
              testing — without changing a line of application code.
            </p>
          </Reveal>

          <div className="space-y-4">
            <Reveal>
              <div id="careers" className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
                <h3 className="font-semibold text-slate-100">Careers</h3>
                <p className="mt-2 text-sm text-slate-400">
                  We&apos;re a small team solving hard problems in kernel observability and API
                  security. If that excites you, we&apos;d love to talk.
                </p>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <div id="contact" className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
                <h3 className="font-semibold text-slate-100">Contact</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Questions about the platform or a deployment? Get in touch and the team will get
                  back to you.
                </p>
                <Button
                  asChild
                  size="sm"
                  className="mt-4 bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400"
                >
                  <Link href="/signup">Get started</Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
