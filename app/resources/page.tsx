import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MarketingShell, PageHeader } from "@/components/landing/marketing-shell"
import { Reveal } from "@/components/landing/reveal"
import { blogPosts } from "@/components/blog/posts"
import { categoryColor } from "@/components/blog/blog-article"

export const metadata: Metadata = {
  title: "Resources — Karaxys",
  description: "Research, guides, and product updates from the Karaxys team.",
}

const posts = blogPosts

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
              <Reveal key={post.slug} delay={(i % 3) * 80}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group flex h-full flex-col rounded-xl border border-slate-800 bg-slate-950/60 p-6 transition-colors hover:border-slate-700 hover:bg-slate-950"
                >
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
                </Link>
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
              <div id="careers" className="rounded-xl border border-slate-800 bg-slate-950/60 p-6">
                <h3 className="font-semibold text-slate-100">Careers</h3>
                <p className="mt-2 text-sm text-slate-400">
                  We&apos;re a small team solving hard problems in kernel observability and API
                  security. If that excites you, we&apos;d love to talk.
                </p>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <div id="contact" className="rounded-xl border border-slate-800 bg-slate-950/60 p-6">
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
