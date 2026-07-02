import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MarketingShell, PageHeader } from "@/components/landing/marketing-shell"
import { Reveal } from "@/components/landing/reveal"

export const metadata: Metadata = {
  title: "About — Karaxys",
  description: "What Karaxys is built for, and how to get in touch.",
}

export default function AboutPage() {
  return (
    <MarketingShell>
      <PageHeader
        eyebrow="About"
        title="About Karaxys"
        description="API security should start with complete visibility — captured from real traffic, without changing a line of application code."
      />

      <section id="about" className="pb-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <p className="text-base leading-relaxed text-slate-400">
            Karaxys is built for security and platform teams who need to know exactly what they run, what data
            flows through it, and whether it is safe. It is built for engineers who would rather find a broken
            authorization check before an attacker does — and for teams whose API surface has grown faster than
            any hand-maintained catalog can track. By capturing traffic at the kernel with eBPF, Karaxys turns
            real production traffic into a continuously updated API inventory, sensitive-data classification, and
            safe active testing — with no SDKs to install and no proxies to route through.
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
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div id="contact" className="h-full rounded-xl border border-slate-800 bg-slate-950/60 p-6">
              <h2 className="font-semibold text-slate-100">Contact</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Questions about the platform or a deployment? Get in touch and you&apos;ll get a response.
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
