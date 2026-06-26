import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight, FileText, BookOpen, Newspaper, GraduationCap } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MarketingShell, PageHeader } from "@/components/landing/marketing-shell"
import { Reveal } from "@/components/landing/reveal"

export const metadata: Metadata = {
  title: "Resources — Karaxys",
  description: "Research, guides, and product updates from the Karaxys team.",
}

const posts = [
  { category: "Research", date: "Jun 18, 2026", title: "Anatomy of a BOLA: how one ID became a full data breach", excerpt: "A walk-through of broken object-level authorization and how passive discovery catches it early." },
  { category: "Product", date: "Jun 9, 2026", title: "Capturing API traffic at the kernel with eBPF", excerpt: "Why zero-instrumentation capture beats SDKs and proxies for complete API visibility." },
  { category: "Guide", date: "May 30, 2026", title: "A practical playbook for shadow API discovery", excerpt: "Find, classify, and govern the APIs your inventory never knew existed." },
  { category: "Research", date: "May 21, 2026", title: "Detecting sensitive data exposure without storing secrets", excerpt: "Redaction-by-default and how Karaxys keeps evidence useful but safe." },
  { category: "Engineering", date: "May 12, 2026", title: "Scaling an ingestion pipeline with a queue-backed analyzer", excerpt: "Decoupling capture from analysis to keep ingestion fast under load." },
  { category: "Guide", date: "Apr 28, 2026", title: "BFLA and broken function-level authorization in practice", excerpt: "How role-based test contexts surface privilege escalation paths." },
]

const library = [
  { icon: BookOpen, title: "API Security Buyer's Guide", type: "Guide" },
  { icon: FileText, title: "OWASP API Top 10 Coverage Brief", type: "Datasheet" },
  { icon: GraduationCap, title: "eBPF for Security Teams 101", type: "Course" },
  { icon: Newspaper, title: "State of Shadow APIs 2026", type: "Report" },
]

export default function ResourcesPage() {
  return (
    <MarketingShell>
      <PageHeader
        eyebrow="Resources"
        title="Insights for API security teams"
        description="Research, guides, and product updates to help you discover, classify, and defend every API."
      />

      <section id="blog" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight">From the blog</h2>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {posts.map((post, i) => (
              <Reveal key={post.title} delay={(i % 3) * 80}>
                <Card className="lift-card glass-panel h-full">
                  <CardContent className="flex h-full flex-col p-6">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="border-primary/20 text-primary">{post.category}</Badge>
                      <span className="text-xs text-muted-foreground">{post.date}</span>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold leading-snug">{post.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
                    <span className="mt-auto pt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                      Read more <ArrowUpRight className="size-4" />
                    </span>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="library" className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight">Resource library</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {library.map((item, i) => (
              <Reveal key={item.title} delay={(i % 4) * 70}>
                <div className="lift-card glass-panel h-full rounded-2xl border p-5">
                  <span className="glass-chip flex size-10 items-center justify-center rounded-xl">
                    <item.icon className="size-5 text-primary" />
                  </span>
                  <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">{item.type}</p>
                  <p className="mt-1 font-semibold">{item.title}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="border-t border-white/5 py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight">About Karaxys</h2>
            <p className="mt-4 text-muted-foreground">
              Karaxys is built by engineers who believe API security should start with complete
              visibility. By capturing traffic at the kernel with eBPF, we give security and platform
              teams a continuously updated inventory, sensitive-data classification, and safe active
              testing — without changing a line of application code.
            </p>
          </Reveal>
          <div id="careers" className="grid gap-4">
            <Reveal>
              <div className="glass-panel rounded-2xl border p-6">
                <h3 className="font-semibold">Careers</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  We&apos;re a small team solving hard problems in kernel observability and API
                  security. If that excites you, we&apos;d love to talk.
                </p>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <div id="contact" className="glass-panel rounded-2xl border p-6">
                <h3 className="font-semibold">Contact</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Questions about the platform or a deployment? Get in touch and the team will get
                  back to you.
                </p>
                <Button asChild className="mt-4" size="sm">
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
