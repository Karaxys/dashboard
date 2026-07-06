"use client"
import React, { useCallback, useEffect, useState } from "react"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Crosshair, RefreshCcw, XCircle, Play, ChevronRight, ChevronDown, Radar, ShieldCheck } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface Job {
  id: string
  status: string
  posture_score: number
  probe_count: number
  success_count: number
  finding_count: number
  target?: { kind?: string; url?: string; name?: string }
  created_at: string
}
interface Probe {
  id: string
  pack_name: string
  turn_index: number
  payload: string
  target_response: string
  verdict: string
  deterministic_verdict: string
  judge_verdict?: string
  judge_reasoning?: string
  kernel_corroborated?: boolean
  severity: string
  owasp_asi_tags?: string[]
  atlas_tags?: string[]
  remediation?: string
}

const TARGET_KINDS = [
  { value: "mcp", label: "MCP server (JSON-RPC)" },
  { value: "agent_http", label: "Agent HTTP endpoint" },
  { value: "llm_app", label: "LLM application" },
]

const sevColor = (s: string) => ({
  critical: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
}[s?.toLowerCase()] ?? "bg-slate-500/10 text-slate-400 border-slate-500/20")

// verdictMeta distinguishes a genuine defense (blocked: the target responded
// and the attack's assertions didn't match) from an inconclusive probe (the
// target was never actually reached — DNS/connection/timeout failure — which
// says nothing about security posture and must not read as "defended".
function verdictMeta(v: string) {
  switch (v) {
    case "success": return { label: "VULNERABLE", card: "border-rose-500/20 bg-rose-500/[0.03]", badge: "bg-rose-500/10 text-rose-400 border-rose-500/20" }
    case "blocked": return { label: "DEFENDED", card: "border-white/5 bg-black/20", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" }
    default: return { label: "INCONCLUSIVE", card: "border-amber-500/10 bg-amber-500/[0.02]", badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" }
  }
}

const statusColor = (s: string) => ({
  queued: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  running: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  done: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  failed: "bg-rose-500/10 text-rose-400 border-rose-500/20",
}[s?.toLowerCase()] ?? "bg-slate-500/10 text-slate-400 border-slate-500/20")

function postureLabel(score: number) {
  if (score >= 0.8) return { text: "Critical exposure", cls: "text-rose-400" }
  if (score >= 0.5) return { text: "Elevated", cls: "text-amber-400" }
  if (score > 0) return { text: "Low", cls: "text-yellow-400" }
  return { text: "No confirmed exposure", cls: "text-emerald-400" }
}

function formatDate(s: string) {
  if (!s) return "—"
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(s))
}

export default function ReconPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [kind, setKind] = useState("mcp")
  const [url, setUrl] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [probes, setProbes] = useState<Record<string, Probe[]>>({})

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await apiFetch<{ data: Job[] }>("/v1/agentic/redteam/jobs?limit=50")
      setJobs(res.data || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load scans")
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const runScan = async () => {
    if (!url.trim()) return
    setSubmitting(true); setError(null)
    try {
      await apiFetch("/v1/agentic/redteam/scan", {
        method: "POST",
        body: JSON.stringify({ target: { kind, url: url.trim() } }),
      })
      setUrl("")
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to queue scan")
    } finally { setSubmitting(false) }
  }

  const toggle = async (jobId: string) => {
    if (expanded === jobId) { setExpanded(null); return }
    setExpanded(jobId)
    if (!probes[jobId]) {
      try {
        const res = await apiFetch<{ data: Probe[] }>(`/v1/agentic/redteam/jobs/${jobId}/probes?limit=200`)
        setProbes(prev => ({ ...prev, [jobId]: res.data || [] }))
      } catch { /* surfaced inline as empty */ }
    }
  }

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
              <BreadcrumbItem><BreadcrumbPage>Recon</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 p-5 pt-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Crosshair className="size-6 text-rose-400" /> Recon &amp; Red Team
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Probe an MCP server, agent, or LLM app with adaptive attack packs. Confirmed hits are corroborated against kernel-observed egress.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="glass-chip border-white/10">
            <RefreshCcw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {/* Launch form */}
        <Card className="bg-black/20 border-white/10">
          <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Target type</label>
              <div className="flex gap-2 flex-wrap">
                {TARGET_KINDS.map(k => (
                  <button key={k.value} onClick={() => setKind(k.value)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${kind === k.value ? "bg-rose-500/15 text-rose-300 border-rose-500/30" : "glass-chip border-white/10 text-muted-foreground hover:text-slate-200"}`}>
                    {k.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-2">
              <label className="text-xs text-muted-foreground mb-1 block">Target URL</label>
              <Input placeholder="https://target.example/endpoint" value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") runScan() }}
                className="bg-black/30 border-white/10" />
            </div>
            <Button onClick={runScan} disabled={submitting || !url.trim()} className="bg-rose-600 hover:bg-rose-500 text-white shrink-0">
              <Play className={`mr-2 size-4 ${submitting ? "animate-pulse" : ""}`} /> Run scan
            </Button>
          </CardContent>
        </Card>

        {error && (
          <div className="glass-chip rounded-xl flex items-center gap-3 py-3 px-4 text-sm">
            <XCircle className="size-5 text-rose-400 shrink-0" /><span className="text-rose-400">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl bg-white/5" />)}</div>
        ) : jobs.length === 0 ? (
          <div className="glass-chip rounded-xl flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Radar className="size-12 text-slate-500/30" />
            <p className="text-lg font-semibold">No scans yet</p>
            <p className="text-sm text-muted-foreground max-w-sm">Launch a scan above to probe a target for prompt injection, tool abuse, data exfiltration, and more.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => {
              const posture = postureLabel(job.posture_score)
              const open = expanded === job.id
              return (
                <Card key={job.id} className="bg-black/20 border-white/10">
                  <CardContent className="p-0">
                    <button onClick={() => toggle(job.id)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/2">
                      {open ? <ChevronDown className="size-4 text-muted-foreground shrink-0" /> : <ChevronRight className="size-4 text-muted-foreground shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`text-xs ${statusColor(job.status)}`}>{job.status?.toUpperCase()}</Badge>
                          <span className="font-mono text-sm text-slate-200 truncate">{job.target?.url ?? job.id}</span>
                          <Badge variant="outline" className="text-xs glass-chip border-white/10">{job.target?.kind ?? "—"}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {job.probe_count} probes · <span className="text-rose-400">{job.success_count} confirmed</span> · {job.finding_count} findings · {formatDate(job.created_at)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-sm font-semibold ${posture.cls}`}>{posture.text}</div>
                        <div className="text-xs text-muted-foreground">posture {job.posture_score?.toFixed(2)}</div>
                      </div>
                    </button>

                    {open && (
                      <div className="border-t border-white/5 p-4 space-y-2">
                        {!probes[job.id] ? (
                          <Skeleton className="h-16 rounded-lg bg-white/5" />
                        ) : probes[job.id].length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No probe records.</p>
                        ) : (
                          probes[job.id].map(p => {
                            const meta = verdictMeta(p.verdict)
                            return (
                            <div key={p.id} className={`rounded-lg border p-3 ${meta.card}`}>
                              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                <Badge variant="outline" className={`text-xs ${meta.badge}`}>{meta.label}</Badge>
                                <span className="text-xs font-medium text-slate-300">{p.pack_name}</span>
                                {p.turn_index > 0 && <span className="text-xs text-muted-foreground">turn {p.turn_index + 1}</span>}
                                <Badge variant="outline" className={`text-xs ${sevColor(p.severity)}`}>{p.severity}</Badge>
                                {p.kernel_corroborated === true && (
                                  <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-300 border-purple-500/20">✓ kernel-corroborated</Badge>
                                )}
                                {(p.owasp_asi_tags || []).map(t => (
                                  <Badge key={t} variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/20">{t}</Badge>
                                ))}
                              </div>
                              <p className="text-xs text-muted-foreground font-mono truncate">{p.payload}</p>
                              {p.verdict === "inconclusive" && p.judge_reasoning && (
                                <p className="text-xs text-amber-400/80 mt-1.5 font-mono truncate">⚠ {p.judge_reasoning}</p>
                              )}
                              {p.verdict === "success" && p.remediation && (
                                <p className="text-xs text-slate-400 mt-1.5 flex items-start gap-1.5">
                                  <ShieldCheck className="size-3.5 text-emerald-400 mt-0.5 shrink-0" /> {p.remediation}
                                </p>
                              )}
                            </div>
                          )})
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
