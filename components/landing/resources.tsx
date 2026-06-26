import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { Section } from "./section"
import { Reveal } from "./reveal"

const categoryStyle: Record<string, string> = {
  Research: "bg-amber-950 text-amber-400",
  Product:  "bg-sky-950 text-sky-400",
  Guide:    "bg-teal-950 text-teal-400",
}

const posts = [
  {
    category: "Research",
    date: "Jun 18, 2026",
    title: "Anatomy of a BOLA: how one ID became a full data breach",
    excerpt: "A walk-through of broken object-level authorization and how passive discovery catches it early.",
  },
  {
    category: "Product",
    date: "Jun 9, 2026",
    title: "Capturing API traffic at the kernel with eBPF",
    excerpt: "Why zero-instrumentation capture beats SDKs and proxies for complete API visibility.",
  },
  {
    category: "Guide",
    date: "May 30, 2026",
    title: "A practical playbook for shadow API discovery",
    excerpt: "Find, classify, and govern the APIs your inventory never knew existed.",
  },
]

export function Resources() {
  return (
    <Section id="resources">
      <Reveal className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">Resources</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Research &amp; insights from the Karaxys team
          </h2>
        </div>
        <Link
          href="/resources"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View all resources <ArrowUpRight className="size-4" />
        </Link>
      </Reveal>

      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        {posts.map((post, i) => (
          <Reveal key={post.title} delay={i * 80}>
            <Link href="/resources#blog" className="group block h-full">
              <div className="flex h-full flex-col rounded-xl border border-white/8 bg-white/3 p-6 transition-colors hover:bg-white/5">
                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${categoryStyle[post.category] ?? "bg-white/10 text-white/60"}`}>
                    {post.category}
                  </span>
                  <span className="text-xs text-muted-foreground">{post.date}</span>
                </div>
                <h3 className="mt-4 text-base font-semibold leading-snug">{post.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
                <span className="mt-auto pt-5 inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:underline">
                  Read more <ArrowUpRight className="size-4" />
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
