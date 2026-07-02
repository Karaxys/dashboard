import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowRight, Info, AlertTriangle, Lightbulb, ShieldCheck } from "lucide-react"

// Reusable documentation prose primitives. Server-safe (no client state) so
// docs pages stay static and fast.

export function DocPage({ children }: { children: ReactNode }) {
  return <article className="min-w-0 flex-1 pb-24">{children}</article>
}

export function DocLede({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <header className="border-b border-slate-800/60 pb-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-400">{description}</p>
    </header>
  )
}

export function H2({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="mt-12 scroll-mt-24 text-xl font-semibold tracking-tight text-white">
      {children}
    </h2>
  )
}

export function H3({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h3 id={id} className="mt-8 scroll-mt-24 text-base font-semibold text-slate-100">
      {children}
    </h3>
  )
}

export function P({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-sm leading-relaxed text-slate-400">{children}</p>
}

export function UL({ children }: { children: ReactNode }) {
  return <ul className="mt-4 space-y-2 text-sm leading-relaxed text-slate-400">{children}</ul>
}

export function OL({ children }: { children: ReactNode }) {
  return <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-400 marker:text-slate-600">{children}</ol>
}

export function LI({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber-500/60" />
      <span className="min-w-0">{children}</span>
    </li>
  )
}

// Plain list item for ordered lists (no bullet marker).
export function OLI({ children }: { children: ReactNode }) {
  return <li className="pl-1">{children}</li>
}

export function Strong({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-slate-200">{children}</strong>
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded border border-slate-800 bg-slate-900/80 px-1.5 py-0.5 font-mono text-[0.8em] text-amber-300">
      {children}
    </code>
  )
}

export function CodeBlock({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80">
      {title && (
        <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-2 font-mono text-xs text-slate-500">
          {title}
        </div>
      )}
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-slate-300">
        {children}
      </pre>
    </div>
  )
}

const CALLOUT = {
  info: { icon: Info, ring: "border-sky-500/25 bg-sky-500/5", tint: "text-sky-400" },
  warn: { icon: AlertTriangle, ring: "border-amber-500/25 bg-amber-500/5", tint: "text-amber-400" },
  tip: { icon: Lightbulb, ring: "border-emerald-500/25 bg-emerald-500/5", tint: "text-emerald-400" },
  security: { icon: ShieldCheck, ring: "border-violet-500/25 bg-violet-500/5", tint: "text-violet-400" },
} as const

export function Callout({ type = "info", title, children }: { type?: keyof typeof CALLOUT; title?: string; children: ReactNode }) {
  const c = CALLOUT[type]
  const Icon = c.icon
  return (
    <div className={`mt-6 flex gap-3 rounded-xl border p-4 ${c.ring}`}>
      <Icon className={`mt-0.5 size-4 shrink-0 ${c.tint}`} />
      <div className="min-w-0 text-sm leading-relaxed text-slate-300">
        {title && <p className={`mb-1 font-semibold ${c.tint}`}>{title}</p>}
        {children}
      </div>
    </div>
  )
}

export function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="mt-6 flex gap-4">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-xs font-semibold text-amber-400">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-100">{title}</p>
        <div className="mt-1 text-sm leading-relaxed text-slate-400">{children}</div>
      </div>
    </div>
  )
}

export function DocTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-900/60 text-xs uppercase tracking-wider text-slate-500">
          <tr>
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap px-4 py-3 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70">
          {rows.map((row, i) => (
            <tr key={i} className="align-top">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-slate-400">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function NextSteps({ links }: { links: { label: string; href: string; desc: string }[] }) {
  return (
    <div className="mt-14 grid gap-3 border-t border-slate-800/60 pt-8 sm:grid-cols-2">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="group rounded-xl border border-slate-800 bg-slate-950/60 p-5 transition-colors hover:border-slate-700 hover:bg-slate-950"
        >
          <p className="flex items-center justify-between text-sm font-semibold text-slate-100">
            {l.label}
            <ArrowRight className="size-4 text-amber-400 transition-transform group-hover:translate-x-0.5" />
          </p>
          <p className="mt-1 text-xs text-slate-500">{l.desc}</p>
        </Link>
      ))}
    </div>
  )
}
