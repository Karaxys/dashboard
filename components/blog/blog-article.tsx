import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { MarketingShell } from "@/components/landing/marketing-shell"

export const categoryColor: Record<string, string> = {
  Research: "border-amber-500/30 text-amber-400",
  Product: "border-sky-500/30 text-sky-400",
  Guide: "border-emerald-500/30 text-emerald-400",
  Engineering: "border-violet-500/30 text-violet-400",
}

export interface BlogMeta {
  slug: string
  category: string
  date: string
  readTime: string
  title: string
  excerpt: string
}

export function BlogArticle({ meta, children }: { meta: BlogMeta; children: ReactNode }) {
  return (
    <MarketingShell>
      <article className="mx-auto max-w-3xl px-4 pb-24 pt-12 sm:px-6 lg:px-8">
        <Link
          href="/resources#blog"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-200"
        >
          <ArrowLeft className="size-4" /> All posts
        </Link>

        <header className="mt-8 border-b border-slate-800/60 pb-8">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={`text-xs ${categoryColor[meta.category] ?? "border-slate-700 text-slate-400"}`}>
              {meta.category}
            </Badge>
            <span className="text-xs text-slate-500">{meta.date}</span>
            <span className="text-xs text-slate-600">·</span>
            <span className="text-xs text-slate-500">{meta.readTime}</span>
          </div>
          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
            {meta.title}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-400">{meta.excerpt}</p>
        </header>

        <div className="mt-2">{children}</div>
      </article>
    </MarketingShell>
  )
}
