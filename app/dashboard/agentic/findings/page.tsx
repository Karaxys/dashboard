"use client"
import React, { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ShieldAlert, RefreshCcw, XCircle, ShieldCheck, ExternalLink } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface Finding {
  id: string
  session_id?: string
  event_id?: string
  type: string
  severity: string
  reason?: string
  evidence?: string
  owasp_asi_tags?: string[]
  status: string
  created_at: string
}

const SEVERITY_META: Record<string, string> = {
  critical: "bg-rose-500/10 text-rose-400 border-rose-500/20 border-l-rose-500",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20 border-l-orange-500",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20 border-l-amber-500",
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 border-l-emerald-500",
}
const sev = (s: string) => SEVERITY_META[s?.toLowerCase()] ?? "bg-slate-500/10 text-slate-400 border-slate-500/20 border-l-slate-500"

const TYPE_LABEL: Record<string, string> = {
  BLOCKED_TOOL: "Blocked tool call",
  PROMPT_INJECTION: "Prompt injection",
  SENSITIVE_EXFIL: "Sensitive data exfiltration",
  INTENT_VIOLATION: "Intent violation",
  UNREPORTED_EGRESS: "Unreported egress",
  POLICY_VIOLATION: "Policy violation",
}

function formatDate(s: string) {
  if (!s) return "—"
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(s))
}

export default function AgenticFindingsPage() {
  const [findings, setFindings] = useState<Finding[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await apiFetch<{ data: Finding[] }>("/v1/agentic/findings?limit=100")
      setFindings(res.data || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load findings")
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="glass-page min-h-full">
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex w-full items-center gap-3 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block"><BreadcrumbLink href="/dashboard/agentic">Vanguard</BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem><BreadcrumbPage>Findings</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 p-5 pt-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldAlert className="size-6 text-rose-400" /> Vanguard Findings
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Blocked tool calls, policy violations, and guardrail alerts from your agents.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="glass-chip border-white/10">
            <RefreshCcw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {error ? (
          <div className="glass-chip rounded-xl flex flex-col items-center justify-center gap-3 py-16 text-center">
            <XCircle className="size-10 text-rose-400/40" />
            <p className="text-rose-400 font-medium">{error}</p>
            <Button variant="outline" size="sm" onClick={load} className="glass-chip border-white/10 mt-1">Retry</Button>
          </div>
        ) : loading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl bg-white/5" />)}</div>
        ) : findings.length === 0 ? (
          <div className="glass-chip rounded-xl flex flex-col items-center justify-center gap-3 py-20 text-center">
            <ShieldCheck className="size-14 text-emerald-500/20" />
            <p className="text-lg font-semibold text-emerald-400">No findings</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Nothing has been blocked or flagged. Findings appear here when the guardrail acts on a prompt or tool call.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {findings.map(f => (
              <Card key={f.id} className={`border-l-4 bg-black/20 ${sev(f.severity)}`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start gap-3 justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={`text-xs ${sev(f.severity)}`}>{f.severity?.toUpperCase()}</Badge>
                      <span className="font-semibold text-sm text-slate-100">{TYPE_LABEL[f.type] ?? f.type}</span>
                      {(f.owasp_asi_tags || []).map(t => (
                        <Badge key={t} variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/20">{t}</Badge>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{formatDate(f.created_at)}</span>
                  </div>
                  {f.reason && <p className="text-sm text-slate-300">{f.reason}</p>}
                  {f.evidence && (
                    <pre className="p-2 rounded-lg bg-black/40 border border-white/5 font-mono text-xs text-blue-300 whitespace-pre-wrap break-all max-h-28 overflow-auto">{f.evidence}</pre>
                  )}
                  {f.session_id && (
                    <Link href={`/dashboard/agentic/${encodeURIComponent(f.session_id)}`} className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
                      View session <ExternalLink className="size-3" />
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
