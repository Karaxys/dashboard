"use client"

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  AlertTriangle, ArrowLeft, ArrowRight, Ban, BookOpen, Check, ChevronDown,
  ChevronLeft, ChevronRight, Clock, Copy, ExternalLink, FileText, FilterX,
  Globe, ListChecks, MoreVertical, Play, RefreshCcw, Search, ShieldAlert,
  ShieldCheck, ShieldX, Swords, Terminal, Wrench,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiFetch } from "@/lib/api"
import { guidanceFor, riskContextFor, testTypeLabel } from "@/lib/vuln-guidance"
import { cn } from "@/lib/utils"

// ─── Types ──────────────────────────────────────────────────────────────────
interface RawResult {
  id?: string
  job_id?: string
  inventory_id?: string
  test_type?: string
  TestType?: string
  vulnerable?: boolean
  severity?: string
  description?: string
  proof?: string
  response_status?: number
  response_body?: string
  out_of_band?: boolean
  created_at?: string
}

interface ScanResult {
  key: string
  jobId: string
  inventoryId: string
  testType: string
  severity: string
  vulnerable: boolean
  description: string
  proof: string
  responseStatus: number
  responseBody: string
  outOfBand: boolean
  createdAt: string
}

interface InventoryOption {
  ID: string
  Method: string
  PathPattern: string
  BaseURL: string
}

interface ScanJobDetail {
  job_id?: string
  id?: string
  status?: string
  test_type?: string
  attack_method?: string
  created_at?: string
  started_at?: string
  completed_at?: string
  deadline_at?: string
  timeout_seconds?: number
  results_count?: number
  error?: string
}

const SEVERITY_META: Record<string, { label: string; cls: string; border: string; icon: React.ElementType }> = {
  critical: { label: "Critical", cls: "bg-rose-500/15 text-rose-300 border-rose-500/30", border: "border-l-rose-500", icon: ShieldAlert },
  high:     { label: "High",     cls: "bg-orange-500/15 text-orange-300 border-orange-500/30", border: "border-l-orange-500", icon: AlertTriangle },
  medium:   { label: "Medium",   cls: "bg-amber-500/15 text-amber-300 border-amber-500/30", border: "border-l-amber-500", icon: AlertTriangle },
  low:      { label: "Low",      cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", border: "border-l-emerald-500", icon: ShieldCheck },
}

const METHOD_CLS: Record<string, string> = {
  GET: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  POST: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  PUT: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  PATCH: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  DELETE: "text-rose-400 bg-rose-500/10 border-rose-500/20",
}

const severityMeta = (s: string) => SEVERITY_META[s?.toLowerCase()] ?? SEVERITY_META.medium

const formatDate = (value?: string) => {
  if (!value) return "—"
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
}

const formatDuration = (start?: string, end?: string) => {
  if (!start || !end) return "—"
  const a = new Date(start).getTime(), b = new Date(end).getTime()
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return "—"
  const seconds = Math.round((b - a) / 1000)
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

function normalize(raw: RawResult, index: number): ScanResult {
  return {
    key: raw.id || `${raw.test_type || raw.TestType}-${index}`,
    jobId: raw.job_id || "",
    inventoryId: raw.inventory_id || "",
    testType: String(raw.test_type || raw.TestType || "UNKNOWN"),
    severity: String(raw.severity || "medium"),
    vulnerable: Boolean(raw.vulnerable),
    description: String(raw.description || ""),
    proof: String(raw.proof || ""),
    responseStatus: Number(raw.response_status || 0),
    responseBody: String(raw.response_body || ""),
    outOfBand: Boolean(raw.out_of_band),
    createdAt: String(raw.created_at || ""),
  }
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="glass-page min-h-full" />}>
      <ResultsPageContent />
    </Suspense>
  )
}

function ResultsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [results, setResults] = useState<ScanResult[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(() => Number(searchParams.get("page")) || 1)
  const [limit, setLimit] = useState(() => Number(searchParams.get("limit")) || 10)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [endpoints, setEndpoints] = useState<Map<string, InventoryOption>>(new Map())
  const [inventoryFilter, setInventoryFilter] = useState(searchParams.get("inventory_id") || "all")
  const [search, setSearch] = useState(searchParams.get("q") || "")
  const [debouncedSearch, setDebouncedSearch] = useState(search)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [job, setJob] = useState<ScanJobDetail | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    apiFetch<{ data: InventoryOption[] }>("/inventory?limit=500")
      .then(d => setEndpoints(new Map((d.data || []).map(e => [e.ID, e]))))
      .catch(() => { /* rows fall back to the endpoint id */ })
  }, [])

  const loadResults = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", String(limit))
      if (searchParams.get("job_id")) params.set("job_id", searchParams.get("job_id")!)
      if (searchParams.get("suite_id")) params.set("suite_id", searchParams.get("suite_id")!)
      if (inventoryFilter !== "all") params.set("inventory_id", inventoryFilter)
      if (debouncedSearch) params.set("q", debouncedSearch)
      const data = await apiFetch<{ data: RawResult[]; total: number }>(`/scan-results?${params.toString()}`)
      setResults((data.data || []).map(normalize))
      setTotal(data.total || 0)
      setSelectedIndex(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load results")
    } finally {
      setLoading(false)
    }
  }, [page, limit, inventoryFilter, debouncedSearch, searchParams])

  useEffect(() => { loadResults() }, [loadResults])

  // Scan information for the sidebar (job metadata when a job is in scope)
  useEffect(() => {
    const jobId = searchParams.get("job_id") || results.find(r => r.jobId)?.jobId
    if (!jobId) { setJob(null); return }
    apiFetch<ScanJobDetail>(`/v1/scans/${jobId}`)
      .then(setJob)
      .catch(() => setJob(null))
  }, [searchParams, results])

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const selected = results[selectedIndex]
  const endpoint = selected ? endpoints.get(selected.inventoryId) : undefined
  const guidance = selected ? guidanceFor(selected.testType) : null
  const risk = selected ? riskContextFor(selected.testType) : null

  const severityCounts = useMemo(() => {
    const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 }
    for (const r of results) {
      const s = r.severity.toLowerCase()
      if (s in counts) counts[s]++
    }
    return counts
  }, [results])

  const globalIndex = (page - 1) * limit + selectedIndex + 1
  const moveSelection = (delta: number) => {
    const next = selectedIndex + delta
    if (next < 0) return
    if (next >= results.length) {
      if (page * limit < total) setPage(p => p + 1)
      return
    }
    setSelectedIndex(next)
  }

  const targetBase = results[0] ? endpoints.get(results[0].inventoryId)?.BaseURL : undefined
  const endpointURL = endpoint ? `${endpoint.BaseURL}${endpoint.PathPattern}` : undefined
  const port = useMemo(() => {
    if (!endpoint?.BaseURL) return undefined
    try { return new URL(endpoint.BaseURL).port || undefined } catch { return undefined }
  }, [endpoint])

  return (
    <div className="glass-page min-h-full">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 p-5">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => router.back()} className="border-white/10 text-slate-300 hover:text-white" aria-label="Back">
              <ArrowLeft className="size-4" />
            </Button>
            <div className="flex size-11 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10">
              <ShieldAlert className="size-5 text-rose-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-100">Scan Results</h1>
              <p className="text-sm text-muted-foreground">Findings from the completed scan with detailed context, evidence and fix guidance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild className="border-white/10 text-slate-200">
              <Link href="/dashboard/findings"><ListChecks className="mr-2 size-4" /> View in Findings</Link>
            </Button>
            <Button asChild className="border-0 bg-rose-500 font-semibold text-white hover:bg-rose-400">
              <Link href="/dashboard/scan"><Play className="mr-2 size-4" /> New Scan</Link>
            </Button>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Card className="border-white/10 bg-black/20">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex size-10 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10">
                <Swords className="size-5 text-sky-400" />
              </span>
              <span>
                <span className="block text-sm text-muted-foreground">Total Findings</span>
                <span className="block text-2xl font-semibold text-slate-100">{results.length}</span>
              </span>
            </CardContent>
          </Card>
          {(["critical", "high", "medium", "low"] as const).map(sev => {
            const meta = SEVERITY_META[sev]
            const Icon = meta.icon
            return (
              <Card key={sev} className="border-white/10 bg-black/20">
                <CardContent className="flex items-center gap-3 p-4">
                  <span className={cn("flex size-10 items-center justify-center rounded-lg border", meta.cls)}>
                    <Icon className="size-5" />
                  </span>
                  <span>
                    <span className="block text-sm text-muted-foreground">{meta.label}</span>
                    <span className="block text-2xl font-semibold text-slate-100">{severityCounts[sev]}</span>
                  </span>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search endpoints, findings, severity…"
              className="h-10 border-white/10 bg-black/30 pl-9 text-slate-200 placeholder:text-muted-foreground/60"
            />
          </div>
          <Select value={inventoryFilter} onValueChange={setInventoryFilter}>
            <SelectTrigger className="h-10 w-[260px] border-white/10 bg-black/30 text-slate-200">
              <Globe className="mr-2 size-4 text-muted-foreground" />
              <SelectValue placeholder="All endpoints" />
            </SelectTrigger>
            <SelectContent className="max-h-80 border-white/10 bg-slate-900 text-slate-200">
              <SelectItem value="all">All endpoints</SelectItem>
              {[...endpoints.values()].map(ep => (
                <SelectItem key={ep.ID} value={ep.ID}>
                  <span className="font-mono text-xs">{ep.Method} {ep.PathPattern}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1) }}>
            <SelectTrigger className="h-10 w-[110px] border-white/10 bg-black/30 text-slate-200"><SelectValue /></SelectTrigger>
            <SelectContent className="border-white/10 bg-slate-900 text-slate-200">
              <SelectItem value="10">10 / page</SelectItem>
              <SelectItem value="25">25 / page</SelectItem>
              <SelectItem value="50">50 / page</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setSearch(""); setInventoryFilter("all"); setPage(1) }}
            className="border-white/10 text-slate-300"
            disabled={!search && inventoryFilter === "all"}
          >
            <FilterX className="mr-2 size-4" /> Clear
          </Button>
          <Button variant="outline" size="icon" onClick={loadResults} className="border-white/10 text-slate-300" aria-label="Refresh">
            <RefreshCcw className="size-4" />
          </Button>
          <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">{total} result{total === 1 ? "" : "s"}</span>
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          {/* ── Selected finding ── */}
          <div className="space-y-4">
            {/* Finding navigation */}
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" disabled={selectedIndex === 0 && page === 1} onClick={() => (selectedIndex === 0 && page > 1 ? setPage(p => p - 1) : moveSelection(-1))} className="border-white/10">
                <ArrowLeft className="mr-2 size-4" /> Previous Finding
              </Button>
              <span className="text-sm text-muted-foreground">
                {results.length === 0 ? "No findings" : `${globalIndex} of ${total} findings`}
              </span>
              <Button variant="outline" size="sm" disabled={selectedIndex >= results.length - 1 && page * limit >= total} onClick={() => moveSelection(1)} className="border-white/10">
                Next Finding <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-400" />
                <div>
                  <p className="text-sm font-medium text-rose-300">Could not load results</p>
                  <p className="text-xs text-rose-200/80">{error}</p>
                </div>
              </div>
            )}

            {loading && <Skeleton className="h-96 w-full rounded-xl bg-white/5" />}

            {!loading && !selected && !error && (
              <Card className="border-white/10 bg-black/20">
                <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                  <ShieldCheck className="size-9 text-emerald-400/70" />
                  <p className="text-sm font-medium text-slate-200">No results for these filters</p>
                  <p className="max-w-sm text-xs text-muted-foreground">Try clearing the search, or run a new scan on a captured endpoint.</p>
                </CardContent>
              </Card>
            )}

            {!loading && selected && guidance && risk && (
              <Card className={cn("border-l-4 border-white/5 bg-black/20", severityMeta(selected.severity).border)}>
                <CardContent className="space-y-4 p-5">
                  {/* Finding header */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl border", severityMeta(selected.severity).cls)}>
                        {React.createElement(severityMeta(selected.severity).icon, { className: "size-5" })}
                      </span>
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold uppercase tracking-wide text-slate-100">{testTypeLabel(selected.testType)}</span>
                          <Badge variant="outline" className={cn("text-xs", severityMeta(selected.severity).cls)}>{severityMeta(selected.severity).label}</Badge>
                          {selected.vulnerable
                            ? <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-xs text-rose-300"><ShieldX className="mr-1 size-3" /> Vulnerable</Badge>
                            : <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300"><ShieldCheck className="mr-1 size-3" /> Secure</Badge>}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {endpoint && (
                            <span className={cn("rounded border px-1.5 py-0.5 font-mono font-bold", METHOD_CLS[endpoint.Method] ?? METHOD_CLS.GET)}>{endpoint.Method}</span>
                          )}
                          <span className="break-all font-mono text-slate-300">{endpoint?.PathPattern || selected.inventoryId}</span>
                          {endpoint?.BaseURL && <span className="break-all text-muted-foreground">· {endpoint.BaseURL}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {selected.responseStatus ? (
                        <Badge variant="outline" className={cn(
                          "border-white/10 text-xs",
                          selected.responseStatus < 300 ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300",
                        )}>{selected.responseStatus} OK</Badge>
                      ) : null}
                      <span className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
                        <Clock className="size-3" /> {formatDate(selected.createdAt)}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-slate-200" aria-label="More">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 border-white/10 bg-slate-900 text-slate-200">
                          <DropdownMenuItem className="cursor-pointer text-xs hover:bg-white/5" onClick={() => setActiveTab("request")}>
                            <FileText className="mr-2 size-3.5" /> View raw response
                          </DropdownMenuItem>
                          {endpointURL && (
                            <DropdownMenuItem asChild className="cursor-pointer text-xs hover:bg-white/5">
                              <a href={endpointURL} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 size-3.5" /> Open endpoint</a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem asChild className="cursor-pointer text-xs hover:bg-white/5">
                            <Link href={`/dashboard/findings?inventory_id=${selected.inventoryId}&test_type=${selected.testType}`}>
                              <ListChecks className="mr-2 size-3.5" /> Triage in Findings
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed text-slate-300">{guidance.summary}</p>

                  {/* Tabs */}
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="w-full justify-start border-b border-white/5 bg-transparent p-0">
                      {[
                        { id: "overview", label: "Overview" },
                        { id: "evidence", label: "Evidence" },
                        { id: "request", label: "Request & Response" },
                        { id: "remediation", label: "Remediation" },
                        { id: "references", label: "References" },
                      ].map(tab => (
                        <TabsTrigger
                          key={tab.id}
                          value={tab.id}
                          className="rounded-none border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground data-[state=active]:border-rose-500 data-[state=active]:bg-transparent data-[state=active]:text-slate-100"
                        >
                          {tab.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {/* Overview */}
                    <TabsContent value="overview" className="space-y-4 pt-4">
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="space-y-1 rounded-lg border border-white/5 bg-black/25 p-3">
                          <p className="text-xs text-muted-foreground">Severity</p>
                          <p className="text-sm font-semibold text-slate-100">{severityMeta(selected.severity).label}</p>
                        </div>
                        <div className="space-y-1 rounded-lg border border-white/5 bg-black/25 p-3">
                          <p className="text-xs text-muted-foreground">CWE</p>
                          <p className="text-sm font-semibold text-slate-100">{guidance.cwe ?? "—"}</p>
                        </div>
                        <div className="space-y-1 rounded-lg border border-white/5 bg-black/25 p-3">
                          <p className="text-xs text-muted-foreground">OWASP API</p>
                          <a href={guidance.owasp.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-sky-300 hover:text-sky-200">{guidance.owasp.id}</a>
                        </div>
                        <div className="space-y-1 rounded-lg border border-white/5 bg-black/25 p-3">
                          <p className="text-xs text-muted-foreground">Affected endpoint</p>
                          <p className="break-all font-mono text-sm text-slate-100">{endpoint?.PathPattern || "—"}</p>
                        </div>
                      </div>

                      <div className="space-y-2 rounded-lg border border-white/5 bg-black/25 p-4">
                        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                          <ShieldAlert className="size-3.5 text-rose-400" /> What this means
                        </p>
                        <p className="text-sm leading-relaxed text-slate-300">{guidance.summary}</p>
                        {selected.description && <p className="text-xs leading-relaxed text-muted-foreground">{selected.description}</p>}
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <section className="space-y-2 rounded-lg border border-white/5 bg-black/25 p-4">
                          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                            <Terminal className="size-3.5 text-blue-400" /> How we proved it
                          </p>
                          <p className="text-xs leading-relaxed text-slate-300">{guidance.howProved}</p>
                          {selected.proof && (
                            <div className="space-y-1.5 pt-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Reproduce the request</span>
                                <Button variant="ghost" size="sm" onClick={() => copyText(selected.proof, `proof-${selected.key}`)} className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-slate-200">
                                  {copied === `proof-${selected.key}` ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                                  {copied === `proof-${selected.key}` ? "Copied" : "Copy"}
                                </Button>
                              </div>
                              <div className="max-h-40 overflow-auto rounded-md border border-white/5 bg-black/40 p-3">
                                <pre className="whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-blue-300">{selected.proof}</pre>
                              </div>
                            </div>
                          )}
                        </section>
                        <section className="space-y-2 rounded-lg border border-emerald-500/10 bg-emerald-500/[0.04] p-4">
                          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400/80">
                            <Wrench className="size-3.5" /> How to fix it
                          </p>
                          <ol className="space-y-1.5">
                            {guidance.fix.map((step, i) => (
                              <li key={i} className="flex gap-2 text-xs leading-relaxed text-slate-300">
                                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-[10px] font-semibold text-emerald-300">{i + 1}</span>
                                {step}
                              </li>
                            ))}
                          </ol>
                        </section>
                      </div>

                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <button type="button" className="flex w-full items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3.5 py-2.5 text-sm text-slate-300 transition-colors hover:bg-black/30">
                            <span className="flex items-center gap-2"><Globe className="size-4 text-sky-400" /> Affected components</span>
                            <ChevronDown className="size-4 text-muted-foreground" />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="flex flex-wrap gap-2 pt-3">
                          {[
                            endpoint?.Method && { label: `method: ${endpoint.Method}` },
                            endpoint?.PathPattern && { label: `path: ${endpoint.PathPattern}` },
                            port && { label: `port: ${port}` },
                            endpoint?.BaseURL && { label: `host: ${endpoint.BaseURL.replace(/^https?:\/\//, "")}` },
                            selected.outOfBand && { label: "out-of-band" },
                          ].filter(Boolean).map((chip, i) => (
                            <span key={i} className="rounded-full border border-white/10 bg-black/30 px-3 py-1 font-mono text-[11px] text-slate-300">
                              {(chip as { label: string }).label}
                            </span>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    </TabsContent>

                    {/* Evidence */}
                    <TabsContent value="evidence" className="space-y-3 pt-4">
                      <p className="text-sm leading-relaxed text-slate-300">{guidance.howProved}</p>
                      {selected.proof ? (
                        <div className="max-h-72 overflow-auto rounded-lg border border-white/5 bg-black/40 p-4">
                          <pre className="whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-blue-300">{selected.proof}</pre>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No request proof stored for this result.</p>
                      )}
                    </TabsContent>

                    {/* Request & Response */}
                    <TabsContent value="request" className="space-y-3 pt-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Raw response {selected.responseStatus ? `· HTTP ${selected.responseStatus}` : ""}</p>
                        {selected.responseBody && (
                          <Button variant="ghost" size="sm" onClick={() => copyText(selected.responseBody, `body-${selected.key}`)} className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-slate-200">
                            {copied === `body-${selected.key}` ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                            {copied === `body-${selected.key}` ? "Copied" : "Copy"}
                          </Button>
                        )}
                      </div>
                      {selected.responseBody ? (
                        <div className="max-h-72 overflow-auto rounded-lg border border-white/5 bg-black/40 p-4">
                          <pre className="whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-emerald-300/90">{selected.responseBody}</pre>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No response body stored for this result.</p>
                      )}
                    </TabsContent>

                    {/* Remediation */}
                    <TabsContent value="remediation" className="pt-4">
                      <ol className="space-y-2 rounded-lg border border-emerald-500/10 bg-emerald-500/[0.03] p-4">
                        {guidance.fix.map((step, i) => (
                          <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-300">
                            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-[11px] font-semibold text-emerald-300">{i + 1}</span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </TabsContent>

                    {/* References */}
                    <TabsContent value="references" className="space-y-2 pt-4">
                      <a href={guidance.owasp.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-sm text-sky-300 hover:bg-sky-500/20">
                        <BookOpen className="size-4" /> {guidance.owasp.id} · {guidance.owasp.name}
                      </a>
                      {guidance.references?.map(ref => (
                        <a key={ref.url} href={ref.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm text-slate-300 hover:bg-black/30">
                          <BookOpen className="size-4 text-muted-foreground" /> {ref.label}
                        </a>
                      ))}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-5">
            <Card className="border-white/10 bg-black/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-200">Scan information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  { label: "Target", value: targetBase || "—" },
                  { label: "Scan type", value: job?.test_type ? testTypeLabel(job.test_type) : "Suite / single test" },
                  { label: "Started at", value: formatDate(job?.started_at || job?.created_at) },
                  { label: "Finished at", value: formatDate(job?.completed_at) },
                  { label: "Status", value: job?.status ? job.status.replace(/_/g, " ") : "—" },
                  { label: "Duration", value: formatDuration(job?.started_at, job?.completed_at) },
                ].map(row => (
                  <div key={row.label} className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="max-w-[60%] break-all text-right font-mono text-xs text-slate-200">{row.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" asChild className="border-white/10 text-slate-200">
                <Link href={`/dashboard/scan${selected ? `?id=${selected.inventoryId}` : ""}`}>
                  <RefreshCcw className="mr-2 size-4" /> Rescan endpoint
                </Link>
              </Button>
              <Button variant="outline" disabled title="Not available yet" className="border-white/10 text-slate-400">
                <FileText className="mr-2 size-4" /> Export report
              </Button>
            </div>

            {risk && (
              <Card className="border-white/10 bg-black/20">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-200">
                    <Swords className="size-4 text-rose-400" /> Risk context
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">CVSS (estimated)</span>
                    <span className="font-semibold text-amber-300">{risk.cvss}</span>
                  </div>
                  {[
                    { label: "Attack complexity", value: risk.attackComplexity },
                    { label: "Privileges required", value: risk.privilegesRequired },
                    { label: "User interaction", value: risk.userInteraction },
                    { label: "Data exposed", value: risk.dataExposed },
                    { label: "Business impact", value: risk.businessImpact },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="text-right text-xs text-slate-200">{row.value}</span>
                    </div>
                  ))}
                  <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
                    Estimate for this vulnerability class, not a per-finding CVSS computation.
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="border-white/10 bg-black/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <Wrench className="size-4 text-sky-400" /> Quick actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <button type="button" onClick={() => setActiveTab("request")} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-slate-300 transition-colors hover:bg-white/5">
                  <FileText className="size-4 text-muted-foreground" /> View raw response
                </button>
                {endpointURL && (
                  <a href={endpointURL} target="_blank" rel="noreferrer" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-slate-300 transition-colors hover:bg-white/5">
                    <ExternalLink className="size-4 text-muted-foreground" /> Open in new tab
                  </a>
                )}
                {selected && (
                  <Link href={`/dashboard/findings?inventory_id=${selected.inventoryId}&test_type=${selected.testType}`} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-slate-300 transition-colors hover:bg-white/5">
                    <Ban className="size-4 text-muted-foreground" /> Triage / mark status
                  </Link>
                )}
                {[
                  { label: "Create ticket", icon: FileText },
                  { label: "Add to allowlist", icon: ShieldCheck },
                ].map(item => (
                  <span key={item.label} title="Not available yet" className="flex w-full cursor-not-allowed items-center gap-2 rounded-lg px-2 py-1.5 text-slate-500">
                    <item.icon className="size-4" /> {item.label}
                  </span>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Pagination ── */}
        {total > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="border-white/10">
                <ChevronLeft className="mr-1 size-4" /> Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page * limit >= total} onClick={() => setPage(p => p + 1)} className="border-white/10">
                Next <ChevronRight className="ml-1 size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
