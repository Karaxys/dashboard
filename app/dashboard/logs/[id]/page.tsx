"use client"

/**
 * Inventory endpoint detail.
 *
 * Five tabs over one captured endpoint: Overview, Schema, Samples, Findings and
 * Scans. The design deliberately avoids raw JSON: every value is rendered as a
 * labelled field, a typed schema row or a redacted table cell, so an operator can
 * read the endpoint without parsing payloads.
 */

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { RadialBar, RadialBarChart, PolarAngleAxis } from "recharts"
import {
  Activity, AlertTriangle, ArrowLeft, BookOpen, Calendar, Check,
  Copy, Database, ExternalLink, FileJson, Fingerprint, Gauge, Globe, Hash,
  Info, KeyRound, Layers, Lock, Play, Plus, RefreshCcw, Repeat,
  Send, ShieldCheck, Sparkles, Tag, Terminal, Type, Wifi,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

// ─── Types ──────────────────────────────────────────────────────────────────
interface ApiInventoryDetail {
  ID: string
  Method: string
  BaseURL: string
  PathPattern: string
  OriginalPath: string
  RiskLevel: string
  CaptureSource?: string
  CaptureMode?: string
  Host?: string
  AuthObserved?: boolean
  RequestCount?: number
  Tags?: string[]
  RiskReasons?: string[]
  SensitiveData?: string[] | null
  SampleHeaders?: Record<string, string[]> | null
  SampleReqBody?: string
  SampleRespBody?: string
  SchemaReq?: Record<string, string> | null
  SchemaResp?: Record<string, string> | null
  HeaderSchema?: Record<string, string> | null
  ParamValues?: Record<string, string[]> | null
  StatusCodes?: number[]
  ContentTypes?: string[]
  PathExamples?: string[]
  FirstSeenAt?: string
  LastSeenAt?: string
}

interface Issue {
  id: string
  test_type: string
  severity: string
  status: string
  title: string
  description?: string
  last_seen_at: string
}

interface ScanJob {
  id?: string
  job_id?: string
  JobID?: string
  test_type?: string
  TestType?: string
  status?: string
  Status?: string
  results_count?: number
  created_at?: string
  CreatedAt?: string
  completed_at?: string
  attack_method?: string
}

// ─── Presentation metadata ──────────────────────────────────────────────────
const RISK_META: Record<string, { label: string; cls: string; score: number; note: string }> = {
  critical: { label: "Critical", cls: "bg-rose-500/15 text-rose-300 border-rose-500/30", score: 9.2, note: "High impact endpoint" },
  high:     { label: "High",     cls: "bg-orange-500/15 text-orange-300 border-orange-500/30", score: 7.5, note: "Elevated risk endpoint" },
  medium:   { label: "Medium",   cls: "bg-amber-500/15 text-amber-300 border-amber-500/30", score: 5, note: "Moderate risk endpoint" },
  low:      { label: "Low",      cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", score: 2.5, note: "Low risk endpoint" },
}

const SEVERITY_CLS: Record<string, string> = {
  critical: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  high: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  medium: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  low: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
}

const STATUS_CLS: Record<string, string> = {
  open: "bg-rose-500/10 text-rose-300 border-rose-500/20",
  accepted_risk: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  false_positive: "bg-slate-500/10 text-slate-300 border-slate-500/20",
  fixed: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
}

const METHOD_CLS: Record<string, string> = {
  GET: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  POST: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  PUT: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  PATCH: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  DELETE: "text-rose-400 bg-rose-500/10 border-rose-500/20",
}

/** Relative sensitivity weight per data class, used for the exposure bars. */
const SENSITIVE_CLASSES: { pattern: RegExp; weight: number; label: string }[] = [
  { pattern: /credit|card|iban|payment/, weight: 95, label: "Payment data" },
  { pattern: /ssn|national|passport/, weight: 90, label: "Government ids" },
  { pattern: /password|passwd/, weight: 100, label: "Passwords" },
  { pattern: /secret|api[_-]?key|token|bearer/, weight: 85, label: "Secrets & tokens" },
  { pattern: /phone|mobile/, weight: 45, label: "Phone numbers" },
  { pattern: /email/, weight: 35, label: "Emails" },
  { pattern: /address|location/, weight: 30, label: "Addresses" },
  { pattern: /name/, weight: 20, label: "Names" },
  { pattern: /user|account|customer/, weight: 25, label: "Account identifiers" },
]

const isSensitiveField = (name: string) =>
  /password|passwd|secret|token|api[_-]?key|ssn|card|iban|credential/i.test(name)

const formatDate = (value?: string) => {
  if (!value) return "—"
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
}

const riskReason = (code: string): { title: string; body: string } => {
  const known: Record<string, { title: string; body: string }> = {
    sensitive_data_detected: { title: "sensitive_data_detected", body: "Response contains sensitive data (e.g. password, email)." },
    sensitive_data_in_response: { title: "sensitive_data_in_response", body: "PII detected in the response body." },
    sensitive_data_in_request: { title: "sensitive_data_in_request", body: "PII detected in the request body." },
    auth_observed: { title: "auth_observed", body: "Authorization header observed on captured requests." },
    unauthenticated: { title: "unauthenticated", body: "Endpoint answered without credentials." },
    high_request_volume: { title: "high_request_volume", body: "Frequently observed in captured traffic." },
  }
  if (known[code]) return known[code]
  if (code.startsWith("keyword:")) {
    return { title: code, body: `Path or parameters contain the sensitive keyword “${code.slice("keyword:".length)}”.` }
  }
  return { title: code, body: code.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase()) + "." }
}

/** Field values are shown as text; secrets are masked instead of dumped. */
const displayValue = (key: string, value: unknown): { text: string; masked: boolean } => {
  if (isSensitiveField(key) && value !== null && value !== undefined && String(value) !== "") {
    return { text: "[REDACTED]", masked: true }
  }
  if (value === null) return { text: "null", masked: false }
  if (typeof value === "object") {
    const compact = JSON.stringify(value)
    return { text: compact.length > 120 ? compact.slice(0, 117) + "…" : compact, masked: false }
  }
  return { text: String(value), masked: false }
}

const parseObject = (body?: string): Record<string, unknown> | null => {
  if (!body) return null
  try {
    const parsed = JSON.parse(body)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null
  } catch { return null }
}

/**
 * Rows for the sample/schema tables. A typical response is an envelope like
 * `{"status":"success","data":[{...}]}`; showing "status/data" would hide the
 * actual record, so the first element of a nested array is expanded and its
 * fields are shown directly (that is the object the endpoint returns).
 */
const sampleRows = (obj: Record<string, unknown>): { label: string; value: unknown }[] => {
  const rows: { label: string; value: unknown }[] = []
  for (const [key, value] of Object.entries(obj)) {
    const first = Array.isArray(value) ? value[0] : undefined
    if (first && typeof first === "object" && !Array.isArray(first)) {
      for (const [nestedKey, nestedValue] of Object.entries(first as Record<string, unknown>)) {
        rows.push({ label: nestedKey, value: nestedValue })
      }
      continue
    }
    rows.push({ label: key, value })
  }
  return rows
}

const inferType = (value: unknown): string => {
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number"
  if (typeof value === "boolean") return "boolean"
  if (Array.isArray(value)) return "array"
  if (value === null) return "unknown"
  if (typeof value === "object") return "object"
  return "string"
}

const pathParams = (pattern: string) => Array.from(pattern.matchAll(/\{([^}]+)\}/g)).map(m => m[1])

export default function InventoryDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [inv, setInv] = useState<ApiInventoryDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [issues, setIssues] = useState<Issue[]>([])
  const [issueTotal, setIssueTotal] = useState(0)
  const [scans, setScans] = useState<ScanJob[]>([])
  const [scanTotal, setScanTotal] = useState(0)
  const [activeTab, setActiveTab] = useState("overview")
  const [copied, setCopied] = useState<string | null>(null)
  const [requestView, setRequestView] = useState("headers")
  const [responseView, setResponseView] = useState("body")

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const load = async () => {
      setLoading(true); setError(null)
      try {
        const data = await apiFetch<ApiInventoryDetail>(`/inventory/${id}`)
        if (!cancelled) setInv(data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load this endpoint")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    if (!id) return
    apiFetch<{ data: Issue[]; total: number }>(`/v1/issues?inventory_id=${id}&limit=50&sort_by=severity&sort_order=asc`)
      .then(d => { setIssues(d.data || []); setIssueTotal(d.total || 0) })
      .catch(() => { /* the tab shows an empty state */ })
  }, [id])

  useEffect(() => {
    if (!id) return
    apiFetch<{ data: ScanJob[]; total: number }>(`/v1/scans?inventory_id=${id}&limit=20`)
      .then(d => { setScans(d.data || []); setScanTotal(d.total || 0) })
      .catch(() => { /* the tab shows an empty state */ })
  }, [id])

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const risk = RISK_META[(inv?.RiskLevel || "").toLowerCase()] ?? { label: "Unknown", cls: "bg-slate-500/15 text-slate-300 border-slate-500/30", score: 0, note: "Not assessed" }
  const exposure = useMemo(() => {
    const classes = SENSITIVE_CLASSES.map(c => {
      const hit = (inv?.SensitiveData || []).find(tag => c.pattern.test(tag.toLowerCase()))
      return hit ? { label: c.label, weight: c.weight, tag: hit } : null
    }).filter(Boolean) as { label: string; weight: number; tag: string }[]
    // If the taxonomy did not match, surface the raw tags so nothing is hidden.
    if (classes.length === 0 && (inv?.SensitiveData || []).length > 0) {
      return (inv?.SensitiveData || []).map(tag => ({ label: tag, weight: 60, tag }))
    }
    return classes
  }, [inv])

  const responseFields = useMemo(() => parseObject(inv?.SampleRespBody), [inv])
  const responseRows = useMemo(() => (responseFields ? sampleRows(responseFields) : []), [responseFields])
  const requestFields = useMemo(() => parseObject(inv?.SampleReqBody), [inv])
  const requestHeaders = useMemo(() => Object.entries(inv?.SampleHeaders || {}), [inv])
  const parameters = useMemo(() => pathParams(inv?.PathPattern || ""), [inv])
  const responseSchema = useMemo(() => Object.entries(inv?.SchemaResp || {}), [inv])
  const headerSchema = useMemo(() => Object.entries(inv?.HeaderSchema || {}), [inv])
  const effectivePath = inv?.OriginalPath || inv?.PathPattern || ""

  // The response schema sold by the analyzer is the envelope (status/data). Add
  // the fields of the returned record from the captured sample so the schema tab
  // describes the payload an operator actually reads.
  const responseSchemaRows = useMemo(() => {
    const seen = new Set(responseSchema.map(([name]) => name.toLowerCase()))
    const extra = responseRows
      .filter(row => !seen.has(row.label.toLowerCase()))
      .map(row => [row.label, inferType(row.value)] as [string, string])
    return [...responseSchema, ...extra]
  }, [responseSchema, responseRows])

  const bearerAuth = useMemo(() => {
    const auth = (inv?.SampleHeaders?.Authorization || []).join(" ")
    return /^bearer\s/i.test(auth) || /jwt/i.test(auth)
  }, [inv])

  const gaugeConfig = useMemo(() => ({ score: { label: "Risk score", color: "#f43f5e" } } satisfies ChartConfig), [])

  if (loading) {
    return (
      <div className="glass-page min-h-full p-5">
        <div className="mx-auto w-full max-w-[1500px] space-y-4">
          <Skeleton className="h-16 w-full rounded-xl bg-white/5" />
          <div className="grid gap-4 xl:grid-cols-5">
            {[0, 1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl bg-white/5" />)}
          </div>
          <Skeleton className="h-72 w-full rounded-xl bg-white/5" />
        </div>
      </div>
    )
  }

  if (error || !inv) {
    return (
      <div className="glass-page min-h-full p-5">
        <div className="mx-auto w-full max-w-[900px]">
          <Card className="border-rose-500/20 bg-rose-500/10">
            <CardContent className="flex items-center gap-3 p-5">
              <AlertTriangle className="size-5 text-rose-400" />
              <div>
                <p className="text-sm font-medium text-rose-300">Could not load this endpoint</p>
                <p className="text-xs text-rose-200/80">{error || "The endpoint was not found."}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-page min-h-full">
      <div className="mx-auto w-full max-w-[1500px] space-y-5 p-5">
        {/* ── Breadcrumb + risk badge ── */}
        <div className="flex items-center justify-between gap-4 text-sm">
          <nav className="flex items-center gap-2 text-muted-foreground">
            <Link href="/dashboard" className="hover:text-slate-200">Dashboard</Link>
            <span>/</span>
            <Link href="/dashboard/logs" className="hover:text-slate-200">Inventory</Link>
            <span>/</span>
            <span className="break-all font-mono text-slate-300">{inv.PathPattern}</span>
          </nav>
          <Badge variant="outline" className={cn("text-xs font-semibold", risk.cls)}>{risk.label.toUpperCase()}</Badge>
        </div>

        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <Button variant="outline" size="icon" onClick={() => router.back()} className="border-white/10 text-slate-300 hover:text-white" aria-label="Back">
              <ArrowLeft className="size-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className={cn("rounded-md border px-2 py-1 font-mono text-sm font-bold", METHOD_CLS[inv.Method] ?? METHOD_CLS.GET)}>{inv.Method}</span>
                <h1 className="break-all font-mono text-2xl font-semibold text-slate-100">{inv.PathPattern}</h1>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="break-all font-mono">{inv.BaseURL}{effectivePath}</span>
                <button type="button" onClick={() => copyText(`${inv.BaseURL}${effectivePath}`, "url")} className="text-muted-foreground transition-colors hover:text-slate-200" aria-label="Copy URL">
                  {copied === "url" ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" asChild className="border-white/10 text-slate-200">
              <a href={`${inv.BaseURL}${effectivePath}`} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 size-4" /> Open in browser
              </a>
            </Button>
            <Button variant="outline" asChild className="border-white/10 text-slate-200">
              <Link href={`/dashboard/scan?id=${inv.ID}`}><RefreshCcw className="mr-2 size-4" /> Rescan endpoint</Link>
            </Button>
            <Button asChild className="border-0 bg-rose-500 font-semibold text-white hover:bg-rose-400">
              <Link href={`/dashboard/scan?id=${inv.ID}`}><Play className="mr-2 size-4" /> Create test</Link>
            </Button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start gap-1 border-b border-white/5 bg-transparent p-0">
            {[
              { id: "overview", label: "Overview" },
              { id: "schema", label: "Schema" },
              { id: "samples", label: "Samples" },
              { id: "findings", label: "Findings", count: issueTotal },
              { id: "scans", label: "Scans", count: scanTotal },
            ].map(tab => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="gap-2 rounded-none border-b-2 border-transparent px-4 py-2 text-sm text-muted-foreground data-[state=active]:border-rose-500 data-[state=active]:bg-transparent data-[state=active]:text-slate-100"
              >
                {tab.label}
                {typeof tab.count === "number" && tab.count > 0 && (
                  <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[11px] text-rose-200">{tab.count}</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ══ Overview ══ */}
          <TabsContent value="overview" className="space-y-5 pt-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard
                icon={ShieldCheck}
                tone={inv.AuthObserved ? "emerald" : "amber"}
                label="Authentication"
                value={inv.AuthObserved ? "Authenticated" : "Not observed"}
                note={inv.AuthObserved ? (bearerAuth ? "Requires a valid JWT / bearer token" : "Requires valid credentials") : "No credential seen in traffic"}
              />
              <StatCard
                icon={Wifi}
                tone="purple"
                label="Capture source"
                value={inv.CaptureSource ? inv.CaptureSource.toUpperCase() : "—"}
                note={inv.CaptureMode ? `${inv.CaptureMode} traffic capture` : "Runtime traffic capture"}
              />
              <StatCard
                icon={Activity}
                tone="amber"
                label="Total requests"
                value={String(inv.RequestCount ?? 0)}
                note="Observed in captured traffic"
              />
              <StatCard
                icon={Database}
                tone="rose"
                label="Sensitive data"
                value={`${exposure.length} type${exposure.length === 1 ? "" : "s"}`}
                note={exposure.map(e => e.label).join(", ") || "None detected"}
              />
              {/* Risk score gauge */}
              <Card className="border-white/10 bg-black/20">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="relative size-14 shrink-0">
                    <ChartContainer config={gaugeConfig} className="size-14">
                      <RadialBarChart data={[{ name: "risk", score: risk.score }]} innerRadius="68%" outerRadius="100%" startAngle={90} endAngle={-270}>
                        <PolarAngleAxis type="number" domain={[0, 10]} tick={false} axisLine={false} />
                        <RadialBar dataKey="score" cornerRadius={8} fill="#f43f5e" background={{ fill: "rgba(255,255,255,0.06)" }} />
                      </RadialBarChart>
                    </ChartContainer>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">Risk score</p>
                    <p className="text-xl font-semibold text-slate-100">{risk.score.toFixed(1)} <span className="text-sm text-muted-foreground">/ 10</span></p>
                    <p className="truncate text-[11px] text-muted-foreground">{risk.note}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
              {/* Endpoint information */}
              <Card className="border-white/10 bg-black/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-200">
                    <Lock className="size-4 text-purple-400" /> Endpoint information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <InfoRow label="Method" value={<span className={cn("rounded border px-1.5 py-0.5 font-mono text-xs", METHOD_CLS[inv.Method] ?? METHOD_CLS.GET)}>{inv.Method}</span>} icon={Fingerprint} />
                  <InfoRow label="Path" value={<span className="break-all font-mono text-xs text-slate-200">{inv.PathPattern}</span>} icon={Globe} />
                  <InfoRow label="Base URL" value={<span className="break-all font-mono text-xs text-slate-200">{inv.BaseURL}</span>} icon={Globe} />
                  <InfoRow
                    label="Status code"
                    value={
                      <span className="flex items-center gap-2">
                        <span className={cn("rounded border px-1.5 py-0.5 font-mono text-xs",
                          (inv.StatusCodes?.[0] ?? 0) < 300 ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-amber-500/20 bg-amber-500/10 text-amber-300")}>
                          {inv.StatusCodes?.[0] ?? "—"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">(observed)</span>
                      </span>
                    }
                    icon={Activity}
                  />
                  <InfoRow label="Content type" value={<span className="font-mono text-xs text-slate-200">{inv.ContentTypes?.[0] || "—"}</span>} icon={FileJson} />
                  <InfoRow label="First seen" value={<span className="text-xs text-slate-200">{formatDate(inv.FirstSeenAt)}</span>} icon={Calendar} />
                  <InfoRow label="Last seen" value={<span className="text-xs text-slate-200">{formatDate(inv.LastSeenAt)}</span>} icon={Calendar} />
                </CardContent>
              </Card>

              {/* What this endpoint does */}
              <Card className="border-white/10 bg-black/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-200">
                    <BookOpen className="size-4 text-sky-400" /> What this endpoint does
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-relaxed text-slate-300">
                    {describeEndpoint(inv, responseSchemaRows.length, requestFields)}
                  </p>
                  <div className="space-y-1.5 rounded-lg border border-sky-500/15 bg-sky-500/[0.06] p-3.5">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sky-300">
                      <Info className="size-3.5" /> Why it&apos;s important
                    </p>
                    <p className="text-xs leading-relaxed text-slate-300">
                      {whyImportant(inv, exposure)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <Tag className="size-3.5 text-purple-400" /> Tags
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[...new Set([
                        ...(inv.Tags || []),
                        ...(inv.AuthObserved ? ["auth:observed"] : []),
                        ...(inv.CaptureSource ? [`capture-source:${inv.CaptureSource}`] : []),
                        ...(exposure.length > 0 ? ["sensitive-data"] : []),
                      ])].map(tag => (
                        <span key={tag} className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-0.5 text-[11px] text-sky-200">{tag}</span>
                      ))}
                      <span title="Tag editing is not available yet" className="inline-flex cursor-not-allowed items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2.5 py-0.5 text-[11px] text-slate-500">
                        <Plus className="size-3" /> Add tag
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Exposure + risk reasons */}
              <div className="space-y-5">
                <Card className="border-white/10 bg-black/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-200">
                      <Database className="size-4 text-rose-400" /> Data exposure profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {exposure.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No sensitive data classes detected in captured traffic.</p>
                    ) : exposure.map(item => (
                      <div key={item.tag} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-slate-300"><KeyRound className="size-3.5 text-muted-foreground" /> {item.label}</span>
                          <span className="font-medium text-slate-200">{item.weight}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/5">
                          <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400" style={{ width: `${item.weight}%` }} />
                        </div>
                      </div>
                    ))}
                    <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
                      Relative sensitivity per data class detected in this endpoint&apos;s traffic.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-white/10 bg-black/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-200">
                      <AlertTriangle className="size-4 text-amber-400" /> Risk reasons
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(inv.RiskReasons || []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">No risk signals recorded for this endpoint.</p>
                    ) : (inv.RiskReasons || []).map(code => {
                      const reason = riskReason(code)
                      return (
                        <div key={code} className="flex gap-3">
                          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10">
                            <AlertTriangle className="size-3.5 text-amber-400" />
                          </span>
                          <div className="min-w-0">
                            <p className="break-all font-mono text-xs text-slate-200">{reason.title}</p>
                            <p className="text-[11px] leading-relaxed text-muted-foreground">{reason.body}</p>
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ══ Schema ══ */}
          <TabsContent value="schema" className="grid gap-5 pt-5 xl:grid-cols-2">
            <Card className="border-white/10 bg-black/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <ArrowLeft className="size-4 rotate-180 text-purple-400" /> Request schema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Path parameters</p>
                  {parameters.length === 0 ? (
                    <p className="text-xs text-muted-foreground">None — the path has no dynamic segments.</p>
                  ) : parameters.map(name => (
                    <SchemaRow
                      key={name}
                      name={name}
                      type={inferParamType(name, inv.ParamValues)}
                      badge="required"
                      description={`The unique identifier of the ${name.replace(/_/g, " ")}.`}
                    />
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Headers</p>
                  {headerSchema.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No request headers captured for this endpoint.</p>
                  ) : headerSchema.map(([name, type]) => (
                    <SchemaRow
                      key={name}
                      name={name}
                      type={type || "string"}
                      badge={/authorization|cookie|api[-_]?key/i.test(name) ? "required" : "optional"}
                      description={headerDescription(name)}
                    />
                  ))}
                </div>
                {requestFields && Object.keys(requestFields).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Body fields</p>
                    {Object.entries(requestFields).map(([name, value]) => (
                      <SchemaRow
                        key={name}
                        name={name}
                        type={typeof value === "number" ? "number" : typeof value === "boolean" ? "boolean" : "string"}
                        badge={isSensitiveField(name) ? "sensitive" : "optional"}
                        description={isSensitiveField(name) ? "Credential value — redacted in samples." : "Observed in the captured request body."}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-black/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <ArrowLeft className="size-4 text-purple-400" /> Response schema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {responseSchema.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No response fields were captured for this endpoint.</p>
                ) : responseSchemaRows.map(([name, type]) => (
                  <SchemaRow
                    key={name}
                    name={name}
                    type={type || "string"}
                    badge={isSensitiveField(name) ? "sensitive" : (name.toLowerCase() === "id" || name.toLowerCase().endsWith("_id") ? "required" : "optional")}
                    description={responseFieldDescription(name)}
                  />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══ Samples ══ */}
          <TabsContent value="samples" className="space-y-4 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-200">Example request and response</p>
                <p className="text-xs text-muted-foreground">Captured from real traffic. Sensitive values are redacted for privacy.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-slate-300">Sample 1 (latest captured)</span>
                <Button variant="outline" size="icon" disabled className="size-8 border-white/10 text-slate-500" aria-label="Previous sample"><ArrowLeft className="size-4" /></Button>
                <Button variant="outline" size="icon" disabled className="size-8 border-white/10 text-slate-500" aria-label="Next sample"><ArrowLeft className="size-4 rotate-180" /></Button>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              {/* Request */}
              <Card className="border-white/10 bg-black/20">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-200">
                      <Terminal className="size-4 text-sky-400" /> Request
                    </CardTitle>
                    <Button asChild size="sm" className="border-0 bg-rose-500 font-semibold text-white hover:bg-rose-400">
                      <Link href={`/dashboard/scan?id=${inv.ID}`} title="Opens the scanner with this endpoint selected — requests are sent by the scanner, not the browser">
                        <Send className="mr-2 size-4" /> Send request
                      </Link>
                    </Button>
                  </div>
                  <p className="pt-1 font-mono text-xs text-muted-foreground">{inv.Method} {effectivePath}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <SubTabs
                    tabs={[{ id: "headers", label: "Headers" }, ...(parameters.length > 0 ? [{ id: "params", label: "Path parameters" }] : [])]}
                    value={requestView}
                    onChange={setRequestView}
                  />
                  {requestView === "headers" ? (
                    <FieldTable
                      rows={requestHeaders.map(([name, values]) => {
                        const raw = values.join(", ")
                        const masked = /authorization|cookie|api[-_]?key/i.test(name) || raw.includes("[REDACTED]")
                        return { label: name, value: masked ? "[REDACTED]" : raw, sensitive: masked }
                      })}
                      empty="No request headers were captured."
                      onCopy={(v) => copyText(v, `req-${v}`)}
                      copiedValue={copied}
                    />
                  ) : (
                    <FieldTable
                      rows={parameters.map(name => ({
                        label: name,
                        value: (inv.ParamValues?.[name] || []).slice(0, 3).join(", ") || "(no example captured)",
                        sensitive: false,
                      }))}
                      empty="No path parameters."
                      onCopy={(v) => copyText(v, `param-${v}`)}
                      copiedValue={copied}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Response */}
              <Card className="border-white/10 bg-black/20">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-200">
                      <Layers className="size-4 text-emerald-400" /> Response
                    </CardTitle>
                    {inv.StatusCodes?.[0] ? (
                      <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-xs text-emerald-300">{inv.StatusCodes[0]} OK</Badge>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <SubTabs
                    tabs={[{ id: "body", label: "Body" }, { id: "headers", label: "Headers" }, { id: "metadata", label: "Metadata" }]}
                    value={responseView}
                    onChange={setResponseView}
                  />
                  {responseView === "body" && (
                    responseRows.length > 0 ? (
                      <FieldTable
                        rows={responseRows.map(({ label: name, value }) => {
                          const shown = displayValue(name, value)
                          return { label: name, value: shown.text, sensitive: shown.masked }
                        })}
                        empty="No response body captured."
                        onCopy={(v) => copyText(v, `res-${v}`)}
                        copiedValue={copied}
                      />
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {inv.SampleRespBody ? "The captured response body is not a JSON object." : "No response body was captured for this endpoint."}
                      </p>
                    )
                  )}
                  {responseView === "headers" && (
                    <FieldTable
                      rows={[
                        { label: "Content-Type", value: inv.ContentTypes?.[0] || "—", sensitive: false },
                        { label: "Status", value: String(inv.StatusCodes?.[0] ?? "—"), sensitive: false },
                      ]}
                      empty="No response headers captured."
                      onCopy={(v) => copyText(v, `hdr-${v}`)}
                      copiedValue={copied}
                      note="Response headers are not stored with the sample for this deployment."
                    />
                  )}
                  {responseView === "metadata" && (
                    <FieldTable
                      rows={[
                        { label: "capture_source", value: inv.CaptureSource || "—", sensitive: false },
                        { label: "capture_mode", value: inv.CaptureMode || "—", sensitive: false },
                        { label: "host", value: inv.Host || "—", sensitive: false },
                        { label: "request_count", value: String(inv.RequestCount ?? 0), sensitive: false },
                        { label: "first_seen_at", value: formatDate(inv.FirstSeenAt), sensitive: false },
                        { label: "last_seen_at", value: formatDate(inv.LastSeenAt), sensitive: false },
                      ]}
                      empty="No metadata."
                      onCopy={(v) => copyText(v, `meta-${v}`)}
                      copiedValue={copied}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ══ Findings ══ */}
          <TabsContent value="findings" className="space-y-3 pt-5">
            {issues.length === 0 ? (
              <EmptyTab
                icon={ShieldCheck}
                title="No findings on this endpoint"
                body="Run a scan from the Active Scanner; results will appear here with severity and remediation."
                action={{ href: `/dashboard/scan?id=${inv.ID}`, label: "Scan this endpoint" }}
              />
            ) : issues.map(issue => (
              <div key={issue.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex min-w-0 items-start gap-3">
                  <Badge variant="outline" className={cn("shrink-0 text-xs", SEVERITY_CLS[issue.severity] ?? SEVERITY_CLS.medium)}>
                    {(issue.severity || "medium").toUpperCase()}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-100">{issue.title || issue.test_type.replace(/_/g, " ")}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{issue.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{formatDate(issue.last_seen_at)}</span>
                  <Badge variant="outline" className={cn("text-xs", STATUS_CLS[issue.status] ?? STATUS_CLS.open)}>
                    {(issue.status || "open").replace(/_/g, " ")}
                  </Badge>
                  <Button variant="ghost" size="sm" asChild className="text-blue-400 hover:text-blue-300">
                    <Link href={`/dashboard/findings?inventory_id=${inv.ID}`}>Open <ChevronArrow /></Link>
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* ══ Scans ══ */}
          <TabsContent value="scans" className="space-y-3 pt-5">
            {scans.length === 0 ? (
              <EmptyTab
                icon={Gauge}
                title="No scans yet"
                body="Every scan you launch against this endpoint is listed here with its status and result count."
                action={{ href: `/dashboard/scan?id=${inv.ID}`, label: "Create a test" }}
              />
            ) : scans.map((job, index) => {
              const jobId = job.id || job.job_id || job.JobID || ""
              const testType = String(job.test_type || job.TestType || "scan")
              const status = String(job.status || job.Status || "unknown")
              const createdAt = job.created_at || job.CreatedAt || (job as { created?: string }).created
              return (
                <div key={jobId || index} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-black/30">
                      <Repeat className="size-4 text-slate-400" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-100">{testType.replace(/_/g, " ")}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{jobId.slice(-10) || "—"} · {formatDate(createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {typeof job.results_count === "number" && (
                      <span className="text-xs text-muted-foreground">{job.results_count} result{job.results_count === 1 ? "" : "s"}</span>
                    )}
                    <Badge variant="outline" className={cn("text-xs", statusClass(status))}>{status.replace(/_/g, " ")}</Badge>
                    {jobId && (
                      <Button variant="ghost" size="sm" asChild className="text-blue-400 hover:text-blue-300">
                        <Link href={`/dashboard/results?job_id=${jobId}`}>View results <ChevronArrow /></Link>
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// ─── Small presentational pieces ────────────────────────────────────────────
function ChevronArrow() {
  return <span className="ml-1 text-xs">→</span>
}

function StatCard({ icon: Icon, tone, label, value, note }: {
  icon: React.ElementType
  tone: "emerald" | "purple" | "amber" | "rose"
  label: string
  value: string
  note: string
}) {
  const tones: Record<string, string> = {
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    purple: "border-purple-500/20 bg-purple-500/10 text-purple-400",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-400",
    rose: "border-rose-500/20 bg-rose-500/10 text-rose-400",
  }
  return (
    <Card className="border-white/10 bg-black/20">
      <CardContent className="flex items-center gap-3 p-4">
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl border", tones[tone])}>
          <Icon className="size-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm text-muted-foreground">{label}</span>
          <span className="block truncate text-lg font-semibold text-slate-100">{value}</span>
          <span className="block truncate text-[11px] text-muted-foreground">{note}</span>
        </span>
      </CardContent>
    </Card>
  )
}

function InfoRow({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon: React.ElementType }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-muted-foreground"><Icon className="size-3.5" /> {label}</span>
      <span className="max-w-[60%] text-right">{value}</span>
    </div>
  )
}

function SchemaRow({ name, type, badge, description }: {
  name: string
  type: string
  badge: "required" | "optional" | "sensitive"
  description: string
}) {
  const badgeCls = badge === "required"
    ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
    : badge === "sensitive"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
      : "border-white/10 bg-black/30 text-slate-400"
  const Icon = type === "number" || type === "integer" ? Hash : type === "boolean" ? Sparkles : Type
  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/5 bg-black/25 p-3">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-black/30">
        <Icon className="size-3.5 text-purple-300" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-slate-100">{name}</span>
          <span className="text-[11px] text-muted-foreground">{type}</span>
          <Badge variant="outline" className={cn("ml-auto text-[10px] uppercase", badgeCls)}>{badge}</Badge>
        </div>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function SubTabs({ tabs, value, onChange }: { tabs: { id: string; label: string }[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="flex items-center gap-1 border-b border-white/5">
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "border-b-2 px-3 py-2 text-xs transition-colors",
            value === tab.id ? "border-rose-500 text-slate-100" : "border-transparent text-muted-foreground hover:text-slate-300",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function FieldTable({ rows, empty, onCopy, copiedValue, note }: {
  rows: { label: string; value: string; sensitive: boolean }[]
  empty: string
  onCopy: (value: string) => void
  copiedValue: string | null
  note?: string
}) {
  if (rows.length === 0) return <p className="text-xs text-muted-foreground">{empty}</p>
  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border border-white/5">
        {rows.map((row, index) => (
          <div key={`${row.label}-${index}`} className={cn("flex items-start gap-3 px-3 py-2 text-xs", index % 2 === 0 ? "bg-black/25" : "bg-black/15")}>
            <span className="w-40 shrink-0 break-all font-mono text-muted-foreground">{row.label}</span>
            <span className="min-w-0 flex-1 break-all font-mono text-slate-200">{row.value}</span>
            {row.sensitive && (
              <Badge variant="outline" className="shrink-0 border-rose-500/30 bg-rose-500/10 text-[10px] text-rose-300">Sensitive</Badge>
            )}
            <button
              type="button"
              onClick={() => onCopy(row.value)}
              className="shrink-0 text-muted-foreground transition-colors hover:text-slate-200"
              aria-label={`Copy ${row.label}`}
            >
              {copiedValue === `res-${row.value}` || copiedValue === `req-${row.value}` || copiedValue === `hdr-${row.value}` || copiedValue === `meta-${row.value}` || copiedValue === `param-${row.value}`
                ? <Check className="size-3.5 text-emerald-400" />
                : <Copy className="size-3.5" />}
            </button>
          </div>
        ))}
      </div>
      {note && <p className="text-[11px] text-muted-foreground">{note}</p>}
    </div>
  )
}

function EmptyTab({ icon: Icon, title, body, action }: {
  icon: React.ElementType
  title: string
  body: string
  action?: { href: string; label: string }
}) {
  return (
    <Card className="border-white/10 bg-black/20">
      <CardContent className="flex flex-col items-center justify-center gap-2 py-14 text-center">
        <Icon className="size-9 text-emerald-400/70" />
        <p className="text-sm font-medium text-slate-200">{title}</p>
        <p className="max-w-md text-xs text-muted-foreground">{body}</p>
        {action && (
          <Button asChild size="sm" className="mt-2 border-0 bg-rose-500 font-semibold text-white hover:bg-rose-400">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Derivations from captured data ─────────────────────────────────────────
function inferParamType(name: string, values?: Record<string, string[]> | null): string {
  const examples = values?.[name] || []
  if (examples.length > 0 && examples.every(v => /^\d+$/.test(v))) return "integer"
  return "string"
}

function headerDescription(name: string): string {
  const lower = name.toLowerCase()
  if (lower === "authorization") return "Credential for the request (JWT or bearer token)."
  if (lower === "accept") return "Response format expected by the client (default: application/json)."
  if (lower === "content-type") return "Format of the request body."
  if (lower === "user-agent") return "Client application information."
  if (lower === "cookie") return "Session cookies sent by the client."
  return `Observed on captured requests to this endpoint.`
}

function responseFieldDescription(name: string): string {
  const lower = name.toLowerCase()
  if (lower === "id" || lower.endsWith("_id")) return "Unique identifier of the object."
  if (lower === "email") return "User's email address."
  if (lower === "role") return "Role assigned to the user."
  if (lower === "password" || lower === "passwordhash") return "Hashed password of the user."
  if (lower.startsWith("created")) return "Creation timestamp."
  if (lower.startsWith("updated")) return "Last modification timestamp."
  if (lower === "status") return "Current state of the object."
  return "Returned by this endpoint in captured responses."
}

function statusClass(status: string): string {
  switch (status.toLowerCase()) {
    case "completed": return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
    case "running": return "border-amber-500/20 bg-amber-500/10 text-amber-300"
    case "queued": return "border-sky-500/20 bg-sky-500/10 text-sky-300"
    case "failed":
    case "timed_out": return "border-rose-500/20 bg-rose-500/10 text-rose-300"
    default: return "border-white/10 bg-black/30 text-slate-400"
  }
}

/** A factual one-liner about the endpoint, built only from captured data. */
function describeEndpoint(inv: ApiInventoryDetail, responseFieldCount: number, requestFields: Record<string, unknown> | null): string {
  const method = inv.Method.toUpperCase()
  const resource = inv.PathPattern.replace(/^\//, "").replace(/\{[^}]+\}/g, "").replace(/\/+/g, "/").replace(/\/$/, "") || "this resource"
  const verb = method === "GET" ? "Retrieves" : method === "POST" ? "Creates" : method === "PUT" || method === "PATCH" ? "Updates" : method === "DELETE" ? "Deletes" : "Handles"
  const parts: string[] = []
  parts.push(`${verb} ${resource.replace(/[-_]/g, " ")}.`)
  if (responseFieldCount > 0) parts.push(`Captured responses contain ${responseFieldCount} field${responseFieldCount === 1 ? "" : "s"}.`)
  if (requestFields && Object.keys(requestFields).length > 0) parts.push(`Requests carry a body with ${Object.keys(requestFields).length} field${Object.keys(requestFields).length === 1 ? "" : "s"}.`)
  parts.push(inv.AuthObserved ? "Credentials were observed on the captured traffic." : "No credentials were observed on the captured traffic.")
  return parts.join(" ")
}

/** The "why it matters" line, derived from the recorded risk signals. */
function whyImportant(inv: ApiInventoryDetail, exposure: { label: string }[]): string {
  const classes = exposure.map(e => e.label.toLowerCase())
  if (classes.length > 0) {
    return `This endpoint exposes ${classes.join(", ")} and can be abused if proper authorization or access controls are missing.`
  }
  if ((inv.RiskReasons || []).length > 0) {
    return "Risk signals were recorded for this endpoint — review the risk reasons below."
  }
  return "No sensitive data or risk signals were recorded for this endpoint. Keep monitoring it as traffic evolves."
}
