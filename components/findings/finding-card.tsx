"use client"

/**
 * The one card that renders a vulnerability finding — used by the scanner
 * output, the Results page and the Findings page so the same finding looks the
 * same everywhere and nobody has to read raw JSON.
 *
 * Top to bottom: severity + test type (+ page actions), the endpoint it affects,
 * then the shared FindingGuidance block (OWASP mapping, impact, proof,
 * remediation), and finally the raw response behind a technical-details toggle.
 */

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, ExternalLink } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { FindingGuidance } from "@/components/findings/finding-guidance"
import { testTypeLabel } from "@/lib/vuln-guidance"
import { cn } from "@/lib/utils"

export interface FindingCardProps {
  testType: string
  severity: string
  title?: string
  /** The scanner's own observation, e.g. the differential confirmation text. */
  description?: string
  /** Reproducible proof: the cURL the scanner used, or a stored evidence summary. */
  evidence?: string
  responseStatus?: number
  responseBody?: string
  outOfBand?: boolean
  method?: string
  path?: string
  baseUrl?: string
  endpointHref?: string
  timestamp?: string
  /** Right-aligned controls (e.g. the Findings page status dropdown). */
  actions?: React.ReactNode
  /** Below-the-fold metadata (first/last seen, links). */
  footer?: React.ReactNode
  className?: string
}

const SEVERITY_META: Record<string, { cls: string; border: string; label: string }> = {
  critical: { cls: "bg-rose-500/15 text-rose-300 border-rose-500/30", border: "border-l-rose-500", label: "Critical" },
  high: { cls: "bg-orange-500/15 text-orange-300 border-orange-500/30", border: "border-l-orange-500", label: "High" },
  medium: { cls: "bg-amber-500/15 text-amber-300 border-amber-500/30", border: "border-l-amber-500", label: "Medium" },
  low: { cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", border: "border-l-emerald-500", label: "Low" },
}

const METHOD_META: Record<string, string> = {
  GET: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  POST: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  PUT: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  PATCH: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  DELETE: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  HEAD: "text-slate-400 bg-slate-500/10 border-slate-500/20",
}

function severityMeta(severity: string) {
  return SEVERITY_META[severity?.toLowerCase()] ?? SEVERITY_META.medium
}

export function FindingCard({
  testType, severity, title, description, evidence, responseStatus, responseBody,
  outOfBand, method, path, baseUrl, endpointHref, timestamp, actions, footer, className,
}: FindingCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  const sev = severityMeta(severity)
  const label = testTypeLabel(testType)

  return (
    <Card className={cn("border-l-4 border-white/5 bg-black/20 transition-colors", sev.border, className)}>
      <CardContent className="space-y-4 p-5">
        {/* ── Identity row ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn("text-xs font-semibold", sev.cls)}>
              {sev.label}
            </Badge>
            <Badge variant="outline" className="border-purple-500/20 bg-purple-500/10 text-xs text-purple-300">
              {label}
            </Badge>
            {outOfBand && (
              <Badge variant="outline" className="border-fuchsia-500/20 bg-fuchsia-500/10 text-[11px] text-fuchsia-300">
                Out-of-band
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {timestamp && <span className="text-xs text-muted-foreground">{timestamp}</span>}
            {actions}
          </div>
        </div>

        {/* ── Title + endpoint ─────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold leading-snug text-slate-100">
            {title || `${label} on ${method ? `${method} ` : ""}${path || "the endpoint"}`}
          </h3>
          {(method || path || responseStatus) && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {method && (
                <span className={cn("rounded border px-1.5 py-0.5 font-mono font-bold", METHOD_META[method.toUpperCase()] ?? METHOD_META.HEAD)}>
                  {method}
                </span>
              )}
              {path && <span className="break-all font-mono text-slate-300">{path}</span>}
              {baseUrl && <span className="break-all text-muted-foreground">· {baseUrl}</span>}
              {responseStatus ? <span className="text-muted-foreground">· HTTP {responseStatus}</span> : null}
              {endpointHref && (
                <Link href={endpointHref} className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300">
                  View endpoint <ExternalLink className="size-3" />
                </Link>
              )}
            </div>
          )}
        </div>

        {/* ── Impact, proof, remediation, mapping ─────────────────────── */}
        <FindingGuidance testType={testType} description={description} evidence={evidence} />

        {/* ── Technical details ────────────────────────────────────────── */}
        {responseBody && (
          <Collapsible open={showDetails} onOpenChange={setShowDetails}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-slate-300"
              >
                <ChevronDown className={cn("size-3 transition-transform", showDetails && "rotate-180")} />
                Technical details {responseStatus ? `· HTTP ${responseStatus}` : ""}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="max-h-56 overflow-auto rounded-lg border border-white/5 bg-black/40 p-3">
                <pre className="whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-emerald-300/90">{responseBody}</pre>
              </div>
              <p className="pt-1.5 text-[11px] text-muted-foreground">
                Raw response captured by the scanner — may contain data belonging to the affected account.
              </p>
            </CollapsibleContent>
          </Collapsible>
        )}

        {footer}
      </CardContent>
    </Card>
  )
}
