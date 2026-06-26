import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Section } from "./section"
import { Reveal } from "./reveal"

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
    <Section id="resources" lines>
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
              <Link href="/resources#blog">
                <Card className="lift-card glass-panel h-full">
                  <CardContent className="flex h-full flex-col p-6">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="border-primary/20 text-primary">
                        {post.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{post.date}</span>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold leading-snug">{post.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
                    <span className="mt-auto pt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                      Read more <ArrowUpRight className="size-4" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </Reveal>
          ))}
        </div>
    </Section>
  )
}
