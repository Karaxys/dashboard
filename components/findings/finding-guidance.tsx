"use client"

/**
 * The human-readable half of a finding: what it means, how it was proved,
 * how to fix it and the OWASP/CWE mapping. Shared by the scanner output card
 * (FindingCard) and by the Results and Findings pages so the same finding reads
 * the same everywhere — nobody should have to interpret raw JSON to triage.
 */

import { useState } from "react"
import { BookOpen, Check, Copy, ShieldAlert, Terminal, Wrench } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { guidanceFor } from "@/lib/vuln-guidance"
import { cn } from "@/lib/utils"

export interface FindingGuidanceProps {
  testType: string
  /** The scanner's observation (e.g. the differential confirmation text). */
  description?: string
  /** Reproducible proof: the cURL the scanner used, or a stored evidence summary. */
  evidence?: string
  className?: string
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => {
        navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-slate-200"
    >
      {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  )
}

export function FindingGuidance({ testType, description, evidence, className }: FindingGuidanceProps) {
  const guidance = guidanceFor(testType)

  return (
    <div className={cn("space-y-4", className)}>
      {/* Mapping */}
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={guidance.owasp.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-xs text-sky-300 transition-colors hover:bg-sky-500/20"
        >
          {guidance.owasp.id} · {guidance.owasp.name}
        </a>
        {guidance.cwe && <span className="text-[11px] text-muted-foreground">{guidance.cwe}</span>}
      </div>

      {/* Impact */}
      <section className="space-y-1.5 rounded-lg border border-white/5 bg-black/25 p-3.5">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <ShieldAlert className="size-3.5 text-rose-400" /> What this means
        </p>
        <p className="text-sm leading-relaxed text-slate-300">{guidance.summary}</p>
        {description && (
          <p className="border-t border-white/5 pt-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Proof */}
        <section className="space-y-2 rounded-lg border border-white/5 bg-black/25 p-3.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Terminal className="size-3.5 text-blue-400" /> How we proved it
          </p>
          <p className="text-xs leading-relaxed text-slate-300">{guidance.howProved}</p>
          {evidence && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Reproduce the request</span>
                <CopyButton value={evidence} />
              </div>
              <div className="max-h-40 overflow-auto rounded-md border border-white/5 bg-black/40 p-3">
                <pre className="whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-blue-300">{evidence}</pre>
              </div>
            </div>
          )}
          {guidance.references && guidance.references.length > 0 && (
            <div className="flex flex-wrap gap-3 pt-1 text-[11px]">
              {guidance.references.map((ref) => (
                <a key={ref.url} href={ref.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sky-300/80 hover:text-sky-200">
                  <BookOpen className="size-3" /> {ref.label}
                </a>
              ))}
            </div>
          )}
        </section>

        {/* Remediation */}
        <section className="space-y-2 rounded-lg border border-emerald-500/10 bg-emerald-500/[0.04] p-3.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400/80">
            <Wrench className="size-3.5" /> How to fix it
          </p>
          <ol className="space-y-1.5">
            {guidance.fix.map((step, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed text-slate-300">
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-[10px] font-semibold text-emerald-300">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  )
}

/** Just the OWASP/CWE chip row, for cards that render their own layout. */
export function FindingMappingBadges({ testType }: { testType: string }) {
  const guidance = guidanceFor(testType)
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={guidance.owasp.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 rounded-md border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[11px] text-sky-300 transition-colors hover:bg-sky-500/20"
      >
        {guidance.owasp.id}
      </a>
      {guidance.cwe && (
        <Badge variant="outline" className="border-white/10 bg-black/20 text-[11px] text-muted-foreground">
          {guidance.cwe}
        </Badge>
      )}
    </div>
  )
}
