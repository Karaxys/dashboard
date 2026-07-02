import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MarketingShell, PageHeader } from "@/components/landing/marketing-shell"
import { Reveal } from "@/components/landing/reveal"

export const metadata: Metadata = {
  title: "Company — Karaxys",
  description: "About Karaxys, careers, and how to get in touch.",
}

export default function CompanyPage() {
  return (
    <MarketingShell>
      <PageHeader
        eyebrow="Company"
        title="About Karaxys"
        description="We believe API security should start with complete visibility — captured from real traffic, without changing a line of application code."
      />

      <section id="about" className="pb-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <p className="text-base leading-relaxed text-slate-400">
            Karaxys is built by engineers who care about the boring, decisive parts of security: knowing
            exactly what you run, what data flows through it, and whether it is safe. By capturing traffic at
            the kernel with eBPF, we give security and platform teams a continuously updated API inventory,
            sensitive-data classification, and safe active testing — with no SDKs to install and no proxies to
            route through.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="sm" className="bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400">
              <Link href="/signup">Get started</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="border-slate-700 text-slate-200">
              <Link href="/docs">Read the docs</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="border-slate-700 text-slate-200">
              <Link href="/blog">Visit the blog</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-800/60 py-16">
        <div className="mx-auto grid max-w-5xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:px-8">
          <Reveal>
            <div id="careers" className="h-full rounded-xl border border-slate-800 bg-slate-950/60 p-6">
              <h2 className="font-semibold text-slate-100">Careers</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                We&apos;re a small team solving hard problems in kernel observability and API security. If
                that excites you, we&apos;d love to talk.
              </p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div id="contact" className="h-full rounded-xl border border-slate-800 bg-slate-950/60 p-6">
              <h2 className="font-semibold text-slate-100">Contact</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Questions about the platform or a deployment? Get in touch and the team will get back to you.
              </p>
              <Link
                href="/signup"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-amber-400 hover:underline"
              >
                Get in touch <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </MarketingShell>
  )
}
