import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { MarketingShell, PageHeader } from "@/components/landing/marketing-shell"
import { Reveal } from "@/components/landing/reveal"
import { blogPosts } from "@/components/blog/posts"
import { categoryColor } from "@/components/blog/blog-article"

export const metadata: Metadata = {
  title: "Blog — Karaxys",
  description: "Research, guides, and engineering deep-dives on API security, eBPF traffic capture, and active testing.",
}

export default function BlogIndexPage() {
  return (
    <MarketingShell>
      <PageHeader
        eyebrow="Blog"
        title="Insights for API security teams"
        description="Research, guides, and engineering deep-dives to help you discover, classify, and defend every API."
      />

      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-3">
            {blogPosts.map((post, i) => (
              <Reveal key={post.slug} delay={(i % 3) * 80}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group flex h-full flex-col rounded-xl border border-slate-800 bg-slate-950/60 p-6 transition-colors hover:border-slate-700 hover:bg-slate-950"
                >
                  <div className="flex items-center gap-3 font-mono">
                    <Badge
                      variant="outline"
                      className={`text-xs ${categoryColor[post.category] ?? "border-slate-700 text-slate-400"}`}
                    >
                      {post.category}
                    </Badge>
                    <span className="text-xs text-slate-500">{post.date}</span>
                    <span className="text-xs text-slate-600">·</span>
                    <span className="text-xs text-slate-500">{post.readTime}</span>
                  </div>
                  <h2 className="mt-4 font-mono text-base font-semibold leading-snug text-slate-100">{post.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{post.excerpt}</p>
                  <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-medium text-amber-400 group-hover:underline">
                    Read more <ArrowRight className="size-3.5" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
