"use client"

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertTriangle, Ban, Bug, Check, CheckCircle2,
  ChevronDown, ChevronLeft, ChevronRight, Clock,
  Code2, Copy, ExternalLink, FilterX, Globe,
  Loader2, Play, Radio, RefreshCcw, RotateCcw,
  Shield, ShieldAlert, ShieldCheck, ShieldX, Terminal, XCircle,
} from "lucide-react"
import Link from "next/link"
import { apiFetch } from "@/lib/api"

// ─── Types ────────────────────────────────────────────────────────────────────

interface InventoryOption {
  ID: string
  Method: string
  PathPattern: string
  BaseURL: string
}

interface ScanResultRecord {
  id: string
  inventoryId: string
  testType: string
  vulnerable: boolean
  severity: string
  description: string
  proof: string
  responseStatus: number
  responseBody: string
  createdAt: string
}

interface PaginationInfo {
  total: number
  page: number
  limit: number
  total_pages: number
  offset: number
}

interface ScanJob {
  id: string
  inventory_id: string
  status: string
  test_type: string
  error?: string
  attempts: number
  results_count: number
  created_at: string
  updated_at: string
  started_at?: string
  completed_at?: string
  cancelled_at?: string
}

interface ScanJobsResponse {
  data: ScanJob[]
  total: number
  page: number
  limit: number
  total_pages: number
}

type RawScanResult = Record<string, unknown>

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = ["10", "20", "50", "100"] as const
const ALL_ENDPOINTS = "ALL_ENDPOINTS"

const parsePage = (v: string | null) => { const n = Number(v); return n > 0 ? n : 1 }
const parseLimit = (v: string | null) =>
  PAGE_SIZE_OPTIONS.includes((v || "") as (typeof PAGE_SIZE_OPTIONS)[number]) ? v! : "10"

const normalizeObjectId = (v: unknown) => {
  if (!v) return ""
  if (typeof v === "string") return v
  if (typeof v === "object" && v !== null) {
    const oid = (v as { $oid?: string }).$oid
    if (typeof oid === "string") return oid
  }
  return ""
}

const normalizeDate = (v: unknown) => {
  if (!v) return ""
  if (typeof v === "string") return v
  if (typeof v === "object" && v !== null) {
    const d = (v as { $date?: string }).$date
    if (typeof d === "string") return d
  }
  return ""
}

const normalizeScanResult = (r: RawScanResult): ScanResultRecord => ({
  id: normalizeObjectId(r._id) || String(r.ID || r.id || ""),
  inventoryId: normalizeObjectId(r.inventory_id) || normalizeObjectId(r.InventoryID) || "",
  testType: String(r.test_type || r.TestType || "Unknown"),
  vulnerable: Boolean(r.vulnerable ?? r.Vulnerable),
  severity: String(r.severity || r.Severity || "unknown"),
  description: String(r.description || r.Description || "No description provided."),
  proof: String(r.proof || r.Proof || ""),
  responseStatus: Number(r.response_status ?? r.ResponseStatus ?? 0),
  responseBody: String(r.response_body || r.ResponseBody || ""),
  createdAt: normalizeDate(r.created_at) || normalizeDate(r.CreatedAt),
})

const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  queued:    { label: "Queued",    cls: "bg-blue-500/10 text-blue-400 border-blue-500/20",         dot: "bg-blue-400" },
  running:   { label: "Running",   cls: "bg-amber-500/10 text-amber-400 border-amber-500/20",       dot: "bg-amber-400 animate-pulse" },
  completed: { label: "Completed", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  failed:    { label: "Failed",    cls: "bg-rose-500/10 text-rose-400 border-rose-500/20",          dot: "bg-rose-400" },
  cancelled: { label: "Cancelled", cls: "bg-slate-500/10 text-slate-400 border-slate-500/20",       dot: "bg-slate-400" },
  timed_out: { label: "Timed Out", cls: "bg-orange-500/10 text-orange-400 border-orange-500/20",    dot: "bg-orange-400" },
}

const STATUS_TABS = ["all", "running", "queued", "completed", "failed", "cancelled", "timed_out"] as const
type StatusTab = typeof STATUS_TABS[number]

function jobDuration(job: ScanJob): string {
  const start = job.started_at ? new Date(job.started_at).getTime() : null
  const end = job.completed_at ? new Date(job.completed_at).getTime()
    : job.cancelled_at ? new Date(job.cancelled_at).getTime() : null
  if (!start || !end) return "—"
  const secs = Math.round((end - start) / 1000)
  return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`
}

// ─── Page exports ──────────────────────────────────────────────────────────────

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="glass-page min-h-full" />}>
      <ResultsPageContent />
    </Suspense>
  )
}

function ResultsPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const initialPage    = useMemo(() => parsePage(searchParams.get("page")), [searchParams])
  const initialLimit   = useMemo(() => parseLimit(searchParams.get("limit")), [searchParams])
  const initialInvId   = useMemo(() => searchParams.get("inventory_id") || "", [searchParams])
  const initialTab     = useMemo(() => searchParams.get("tab") === "jobs" ? "jobs" : "results", [searchParams])

  // ── Results tab state ──────────────────────────────────────────────────────
  const [results, setResults]       = useState<ScanResultRecord[]>([])
  const [endpoints, setEndpoints]   = useState<InventoryOption[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [limit, setLimit]           = useState(initialLimit)
  const [inventoryId, setInventoryId] = useState(initialInvId)
  const [resultsLoading, setResultsLoading] = useState(true)
  const [resultsError, setResultsError]     = useState<string | null>(null)
  const [copiedId, setCopiedId]     = useState<string | null>(null)

  // ── Jobs tab state ─────────────────────────────────────────────────────────
  const [jobs, setJobs]             = useState<ScanJob[]>([])
  const [jobsPagination, setJobsPagination] = useState<ScanJobsResponse | null>(null)
  const [jobsLoading, setJobsLoading] = useState(true)
  const [jobsError, setJobsError]   = useState<string | null>(null)
  const [endpointMap, setEndpointMap] = useState<Map<string, InventoryOption>>(new Map())
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusTab>("all")
  const [jobsPage, setJobsPage]     = useState(1)

  const [activeTab, setActiveTab]   = useState(initialTab)

  // ── URL sync ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const p = new URLSearchParams()
    if (activeTab !== "results") p.set("tab", activeTab)
    if (currentPage > 1) p.set("page", currentPage.toString())
    if (limit !== "10") p.set("limit", limit)
    if (inventoryId) p.set("inventory_id", inventoryId)
    const next = p.toString()
    if (next === searchParams.toString()) return
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
  }, [activeTab, currentPage, inventoryId, limit, pathname, router, searchParams])

  // ── Endpoints ──────────────────────────────────────────────────────────────
  useEffect(() => {
    apiFetch<{ data: InventoryOption[] }>("/inventory?limit=500")
      .then(r => {
        const list = r.data || []
        setEndpoints(list)
        setEndpointMap(new Map(list.map(e => [e.ID, e])))
      }).catch(() => {})
  }, [])

  // ── Results fetch ──────────────────────────────────────────────────────────
  const fetchResults = useCallback(async () => {
    setResultsLoading(true)
    setResultsError(null)
    try {
      const q = new URLSearchParams({ page: currentPage.toString(), limit })
      if (inventoryId) q.set("inventory_id", inventoryId)
      const r = await apiFetch<{
        data: RawScanResult[]; total: number; page: number; limit: number; total_pages: number; offset: number
      }>(`/scan-results?${q}`)
      setResults(Array.isArray(r.data) ? r.data.map(normalizeScanResult) : [])
      setPagination({ total: r.total || 0, page: r.page || currentPage, limit: r.limit || Number(limit), total_pages: r.total_pages || 1, offset: r.offset || 0 })
    } catch (e: unknown) {
      setResultsError(e instanceof Error ? e.message : "Failed to fetch scan results.")
      setResults([])
      setPagination(null)
    } finally {
      setResultsLoading(false)
    }
  }, [currentPage, inventoryId, limit])

  useEffect(() => { fetchResults() }, [fetchResults])
  useEffect(() => { setCurrentPage(1) }, [inventoryId, limit])

  // ── Jobs fetch ─────────────────────────────────────────────────────────────
  const fetchJobs = useCallback(async () => {
    setJobsLoading(true)
    setJobsError(null)
    try {
      const q = new URLSearchParams({ page: String(jobsPage), limit: "20", sort_order: "desc" })
      if (statusFilter !== "all") q.set("status", statusFilter)
      const r = await apiFetch<ScanJobsResponse>(`/v1/scans?${q}`)
      setJobs(r.data || [])
      setJobsPagination(r)
    } catch (e: unknown) {
      setJobsError(e instanceof Error ? e.message : "Failed to load scan jobs")
    } finally {
      setJobsLoading(false)
    }
  }, [jobsPage, statusFilter])

  useEffect(() => { fetchJobs() }, [fetchJobs])
  useEffect(() => { setJobsPage(1) }, [statusFilter])

  // Auto-refresh when active jobs exist
  useEffect(() => {
    const hasActive = jobs.some(j => j.status === "running" || j.status === "queued")
    if (!hasActive) return
    const t = setTimeout(fetchJobs, 5000)
    return () => clearTimeout(t)
  }, [jobs, fetchJobs])

  // ── Job actions ────────────────────────────────────────────────────────────
  const cancelJob = async (id: string) => {
    setActioningId(id)
    try { await apiFetch(`/v1/scans/${id}/cancel`, { method: "POST" }); await fetchJobs() }
    catch { } finally { setActioningId(null) }
  }

  const rerunJob = async (id: string) => {
    setActioningId(id)
    try { await apiFetch(`/v1/scans/${id}/rerun`, { method: "POST" }); await fetchJobs() }
    catch { } finally { setActioningId(null) }
  }

  // ── Display helpers ────────────────────────────────────────────────────────
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const selectedEndpoint = inventoryId ? endpointMap.get(inventoryId) : null

  const summary = useMemo(() => results.reduce(
    (acc, r) => {
      acc.total++
      if (r.vulnerable) acc.vulnerable++
      if (r.severity.toLowerCase() === "critical") acc.critical++
      if (r.severity.toLowerCase() === "high") acc.high++
      return acc
    },
    { total: 0, vulnerable: 0, critical: 0, high: 0 }
  ), [results])

  const activeJobCount = jobs.filter(j => j.status === "running" || j.status === "queued").length

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {}
    jobs.forEach(j => { c[j.status] = (c[j.status] || 0) + 1 })
    return c
  }, [jobs])

  const getSeverityColor = (sev: string) => {
    switch (sev.toLowerCase()) {
      case "critical": return "bg-rose-500/15 text-rose-400 border-rose-500/30"
      case "high":     return "bg-orange-500/15 text-orange-400 border-orange-500/30"
      case "medium":   return "bg-amber-500/15 text-amber-400 border-amber-500/30"
      case "low":      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      default:         return "bg-slate-500/15 text-slate-400 border-slate-500/30"
    }
  }

  const getSeverityIcon = (sev: string) => {
    switch (sev.toLowerCase()) {
      case "critical": return <ShieldX className="size-4" />
      case "high":     return <ShieldAlert className="size-4" />
      case "medium":   return <AlertTriangle className="size-4" />
      default:         return <Shield className="size-4" />
    }
  }

  const getMethodColor = (m: string) => {
    switch (m?.toUpperCase()) {
      case "GET":    return "text-blue-400"
      case "POST":   return "text-emerald-400"
      case "PUT":    return "text-amber-400"
      case "DELETE": return "text-rose-400"
      case "PATCH":  return "text-purple-400"
      default:       return "text-slate-400"
    }
  }

  const methodBadgeColor = (m: string) => {
    switch (m?.toUpperCase()) {
      case "GET":    return "bg-blue-500/10 text-blue-400 border-blue-500/20"
      case "POST":   return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      case "DELETE": return "bg-rose-500/10 text-rose-400 border-rose-500/20"
      case "PUT": case "PATCH": return "bg-amber-500/10 text-amber-400 border-amber-500/20"
      default:       return "bg-slate-500/10 text-slate-400 border-slate-500/20"
    }
  }

  const formatDate = (s?: string) => {
    if (!s) return "—"
    const d = new Date(s)
    if (Number.isNaN(d.getTime())) return "—"
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d)
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="glass-page min-h-full">
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex w-full items-center gap-3 px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard/scan">Vulnerabilities</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{activeTab === "jobs" ? "Job History" : "Results"}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 p-5 pt-0">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "results" | "jobs")}>
          <div className="flex items-center justify-between gap-4">
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger value="results" className="data-[state=active]:bg-white/10">
                <Bug className="size-4 mr-2" />
                Scan Results
                {!resultsLoading && pagination && pagination.total > 0 && (
                  <span className="ml-2 rounded-full bg-rose-500/20 text-rose-400 px-1.5 py-0.5 text-xs">{pagination.total}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="jobs" className="data-[state=active]:bg-white/10">
                <Clock className="size-4 mr-2" />
                Job History
                {activeJobCount > 0 && (
                  <span className="ml-2 rounded-full bg-amber-500/20 text-amber-400 px-1.5 py-0.5 text-xs animate-pulse">{activeJobCount} active</span>
                )}
              </TabsTrigger>
            </TabsList>

            <Button asChild size="sm" className="bg-rose-600 hover:bg-rose-500 text-white border-0 font-semibold">
              <Link href="/dashboard/scan"><Play className="size-4 mr-2" />New Scan</Link>
            </Button>
          </div>

          {/* ── Results Tab ────────────────────────────────────────────────────── */}
          <TabsContent value="results" className="mt-5 space-y-5">
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { value: summary.total,      label: "Total Findings",  cls: "bg-blue-500/10 border-blue-500/20",   icon: <Bug className="size-5 text-blue-400" />,         textCls: "" },
                { value: summary.vulnerable, label: "Vulnerable",      cls: "bg-rose-500/10 border-rose-500/20",   icon: <ShieldX className="size-5 text-rose-400" />,     textCls: "text-rose-400" },
                { value: summary.critical,   label: "Critical",        cls: "bg-rose-500/10 border-rose-500/20",   icon: <ShieldAlert className="size-5 text-rose-400" />, textCls: "" },
                { value: summary.high,       label: "High Severity",   cls: "bg-orange-500/10 border-orange-500/20", icon: <AlertTriangle className="size-5 text-orange-400" />, textCls: "" },
              ].map(stat => (
                <Card key={stat.label} className="glass-panel border-white/10 py-4">
                  <CardContent className="flex items-center gap-4 px-5">
                    <div className={`flex size-12 items-center justify-center rounded-xl border ${stat.cls}`}>{stat.icon}</div>
                    <div className="space-y-0.5">
                      <p className={`text-2xl font-bold tracking-tight ${stat.textCls}`}>{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 flex-wrap items-center gap-3">
                <Select value={inventoryId || ALL_ENDPOINTS} onValueChange={v => setInventoryId(v === ALL_ENDPOINTS ? "" : v)}>
                  <SelectTrigger className="w-full sm:w-80 bg-black/30 border-white/10 text-slate-200">
                    <Globe className="mr-2 size-4 text-muted-foreground" />
                    <SelectValue placeholder="Filter by endpoint" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-slate-200 max-h-80">
                    <SelectItem value={ALL_ENDPOINTS}>All endpoints</SelectItem>
                    {endpoints.map(e => (
                      <SelectItem key={e.ID} value={e.ID} className="font-mono text-xs">
                        <span className={`mr-2 font-bold ${getMethodColor(e.Method)}`}>{e.Method}</span>
                        {e.PathPattern}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {inventoryId && (
                  <Button variant="ghost" size="sm" onClick={() => setInventoryId("")} className="text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10">
                    <FilterX className="mr-2 size-4" />Clear
                  </Button>
                )}
                {selectedEndpoint && (
                  <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                    <span className={`font-mono font-bold ${getMethodColor(selectedEndpoint.Method)}`}>{selectedEndpoint.Method}</span>
                    <span className="text-slate-400">{selectedEndpoint.BaseURL}{selectedEndpoint.PathPattern}</span>
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={fetchResults} disabled={resultsLoading} className="glass-chip border-white/10">
                <RefreshCcw className={`mr-2 size-4 ${resultsLoading ? "animate-spin" : ""}`} />Refresh
              </Button>
            </div>

            {/* Results list */}
            <div className="flex flex-col gap-4">
              {resultsError ? (
                <Card className="glass-panel border-rose-500/20">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <ShieldX className="size-12 text-rose-400/50 mb-4" />
                    <p className="text-rose-400 mb-2">{resultsError}</p>
                    <Button variant="outline" size="sm" onClick={fetchResults} className="mt-2">Try Again</Button>
                  </CardContent>
                </Card>
              ) : resultsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="glass-panel border-white/10">
                      <CardContent className="p-5"><div className="flex gap-4"><Skeleton className="size-10 rounded-lg bg-white/10" /><div className="flex-1 space-y-3"><Skeleton className="h-5 w-48 bg-white/10" /><Skeleton className="h-4 w-full bg-white/10" /></div></div></CardContent>
                    </Card>
                  ))}
                </div>
              ) : results.length === 0 ? (
                <Card className="glass-panel border-white/10">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <ShieldCheck className="size-16 text-emerald-400/30 mb-4" />
                    <p className="text-xl font-semibold text-slate-200 mb-2">No Findings</p>
                    <p className="text-sm text-muted-foreground max-w-md">No scan results found. Run a vulnerability scan to populate this view.</p>
                    <Button variant="outline" size="sm" asChild className="mt-6 glass-chip border-white/10">
                      <Link href="/dashboard/scan">Go to Scanner<ExternalLink className="ml-2 size-4" /></Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                results.map((result, index) => {
                  const ep = endpointMap.get(result.inventoryId)
                  const detailsHref = result.inventoryId ? `/dashboard/logs/${result.inventoryId}` : ""
                  const rKey = result.id || `${result.inventoryId}-${index}`
                  return (
                    <Card key={rKey} className={`glass-panel border-l-4 transition-all hover:bg-white/2 ${
                      result.severity.toLowerCase() === "critical" ? "border-l-rose-500" :
                      result.severity.toLowerCase() === "high"     ? "border-l-orange-500" :
                      result.severity.toLowerCase() === "medium"   ? "border-l-amber-500" :
                      "border-l-emerald-500"
                    }`}>
                      <CardContent className="p-0">
                        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex items-start gap-4">
                            <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg border ${getSeverityColor(result.severity)}`}>
                              {getSeverityIcon(result.severity)}
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold text-slate-100">{result.testType.replace(/_/g, " ")}</h3>
                                <Badge variant="outline" className={`text-xs ${getSeverityColor(result.severity)}`}>{result.severity.toUpperCase()}</Badge>
                                {result.vulnerable
                                  ? <Badge variant="outline" className="text-xs bg-rose-500/10 text-rose-400 border-rose-500/30"><ShieldX className="mr-1 size-3" />Vulnerable</Badge>
                                  : <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30"><ShieldCheck className="mr-1 size-3" />Secure</Badge>
                                }
                              </div>
                              {ep
                                ? <div className="flex items-center gap-2 text-sm">
                                    <span className={`font-mono font-bold ${getMethodColor(ep.Method)}`}>{ep.Method}</span>
                                    <span className="font-mono text-slate-300">{ep.PathPattern}</span>
                                    <span className="text-muted-foreground hidden sm:inline">• {ep.BaseURL}</span>
                                  </div>
                                : <p className="text-sm text-muted-foreground font-mono">ID: {result.inventoryId || "Unknown"}</p>
                              }
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground sm:flex-col sm:items-end sm:gap-1">
                            <div className="flex items-center gap-1.5"><Clock className="size-3" />{formatDate(result.createdAt)}</div>
                            <div className="flex items-center gap-1.5"><Code2 className="size-3" />Status: {result.responseStatus || "—"}</div>
                          </div>
                        </div>
                        <div className="px-5 pb-4">
                          <p className="text-sm text-slate-300 leading-relaxed">{result.description}</p>
                        </div>
                        {(result.proof || result.responseBody) && (
                          <div className="border-t border-white/5">
                            <Collapsible>
                              <CollapsibleTrigger asChild>
                                <button className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-white/2 transition-colors">
                                  <div className="flex items-center gap-2"><Terminal className="size-4" />View Evidence</div>
                                  <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                </button>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="space-y-4 px-5 pb-5">
                                  {result.proof && (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">cURL Proof of Concept</p>
                                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.proof, `proof-${rKey}`)} className="h-7 px-2 text-xs text-muted-foreground hover:text-slate-200">
                                          {copiedId === `proof-${rKey}` ? <><Check className="mr-1 size-3 text-emerald-400" />Copied</> : <><Copy className="mr-1 size-3" />Copy</>}
                                        </Button>
                                      </div>
                                      <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black/40">
                                        <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-blue-300 whitespace-pre-wrap break-all">{result.proof}</pre>
                                      </div>
                                    </div>
                                  )}
                                  {result.responseBody && (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Response Body</p>
                                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.responseBody, `response-${rKey}`)} className="h-7 px-2 text-xs text-muted-foreground hover:text-slate-200">
                                          {copiedId === `response-${rKey}` ? <><Check className="mr-1 size-3 text-emerald-400" />Copied</> : <><Copy className="mr-1 size-3" />Copy</>}
                                        </Button>
                                      </div>
                                      <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black/40 max-h-48">
                                        <pre className="overflow-auto p-4 font-mono text-xs leading-relaxed text-emerald-300 whitespace-pre-wrap break-all max-h-48">{result.responseBody}</pre>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        )}
                        {detailsHref && (
                          <div className="flex items-center justify-end gap-2 border-t border-white/5 px-5 py-3">
                            <Button variant="ghost" size="sm" asChild className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10">
                              <Link href={detailsHref}>View Endpoint Details<ExternalLink className="ml-2 size-4" /></Link>
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>

            {/* Pagination */}
            {!resultsLoading && !resultsError && pagination && pagination.total > 0 && (
              <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-white/5 bg-black/20 p-4 sm:flex-row">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Select value={limit} onValueChange={setLimit}>
                    <SelectTrigger className="h-8 w-20 bg-black/30 border-white/10 text-slate-200"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                      {PAGE_SIZE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <span>Showing <span className="font-medium text-slate-200">{pagination.offset + 1}</span> to{" "}
                    <span className="font-medium text-slate-200">{Math.min(pagination.offset + pagination.limit, pagination.total)}</span> of{" "}
                    <span className="font-medium text-slate-200">{pagination.total}</span> results
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="glass-chip border-white/10" disabled={pagination.page <= 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
                    <ChevronLeft className="mr-1 size-4" />Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">Page <span className="font-medium text-slate-200">{pagination.page}</span> of {pagination.total_pages}</span>
                  <Button variant="outline" size="sm" className="glass-chip border-white/10" disabled={pagination.page >= pagination.total_pages} onClick={() => setCurrentPage(p => p + 1)}>
                    Next<ChevronRight className="ml-1 size-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Job History Tab ─────────────────────────────────────────────────── */}
          <TabsContent value="jobs" className="mt-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Scan Job History</h2>
                <p className="text-sm text-muted-foreground">Monitor, cancel, and rerun scanner jobs</p>
              </div>
              <div className="flex items-center gap-3">
                {activeJobCount > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <Radio className="size-3.5 text-amber-400 animate-pulse" />
                    <span className="text-xs font-medium text-amber-400">{activeJobCount} active</span>
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={fetchJobs} disabled={jobsLoading} className="glass-chip border-white/10">
                  <RefreshCcw className={`mr-2 size-4 ${jobsLoading ? "animate-spin" : ""}`} />Refresh
                </Button>
              </div>
            </div>

            {/* Status filter tabs */}
            <div className="flex flex-wrap gap-2">
              {STATUS_TABS.map(tab => {
                const meta = STATUS_META[tab]
                const count = tab === "all" ? jobs.length : (statusCounts[tab] || 0)
                const isActive = statusFilter === tab
                return (
                  <button key={tab} onClick={() => setStatusFilter(tab)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium border transition-all ${isActive
                      ? (meta?.cls ?? "bg-white/10 text-slate-200 border-white/20") + " ring-1 ring-current/20"
                      : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-slate-300"
                    }`}
                  >
                    {meta && <span className={`size-1.5 rounded-full ${meta.dot}`} />}
                    {tab === "all" ? "All Jobs" : (meta?.label ?? tab)}
                    {!jobsLoading && <span className="rounded-full px-1.5 py-0.5 text-xs bg-white/5">{count}</span>}
                  </button>
                )
              })}
            </div>

            {/* Jobs list */}
            {jobsError ? (
              <div className="glass-chip rounded-xl flex flex-col items-center justify-center gap-3 py-16 text-center">
                <XCircle className="size-10 text-rose-400/40" />
                <p className="text-rose-400 font-medium">{jobsError}</p>
                <Button variant="outline" size="sm" onClick={fetchJobs} className="glass-chip border-white/10">Retry</Button>
              </div>
            ) : jobsLoading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl bg-white/5" />)}</div>
            ) : jobs.length === 0 ? (
              <div className="glass-chip rounded-xl flex flex-col items-center justify-center gap-3 py-20 text-center">
                <Clock className="size-14 text-slate-700" />
                <p className="text-lg font-semibold text-slate-400">No scan jobs found</p>
                <p className="text-sm text-muted-foreground">
                  {statusFilter !== "all" ? "No jobs match the selected status." : "Run your first scan to see jobs here."}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {statusFilter !== "all" && (
                    <Button variant="outline" size="sm" onClick={() => setStatusFilter("all")} className="glass-chip border-white/10">
                      <FilterX className="size-4 mr-2" />Show all
                    </Button>
                  )}
                  <Button asChild size="sm" className="bg-rose-600 hover:bg-rose-500 text-white border-0">
                    <Link href="/dashboard/scan"><Play className="size-4 mr-2" />New Scan</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <Card className="glass-panel">
                <div className="divide-y divide-white/5">
                  {jobs.map(job => {
                    const meta      = STATUS_META[job.status] ?? STATUS_META.cancelled
                    const ep        = endpointMap.get(job.inventory_id)
                    const isAction  = actioningId === job.id
                    const isActive  = job.status === "running" || job.status === "queued"
                    const canCancel = isActive
                    const canRerun  = ["completed", "failed", "cancelled", "timed_out"].includes(job.status)

                    return (
                      <div key={job.id} className={`flex items-center gap-4 px-5 py-4 hover:bg-white/2 transition-colors ${isActive ? "bg-amber-500/2" : ""}`}>
                        {/* Status icon */}
                        <div className="shrink-0">
                          {job.status === "running" ? (
                            <div className="relative flex size-8 items-center justify-center">
                              <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
                              <Loader2 className="size-4 text-amber-400 animate-spin relative" />
                            </div>
                          ) : job.status === "queued" ? (
                            <div className="size-8 flex items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/20">
                              <Clock className="size-4 text-blue-400" />
                            </div>
                          ) : job.status === "completed" ? (
                            <div className="size-8 flex items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                              <CheckCircle2 className="size-4 text-emerald-400" />
                            </div>
                          ) : job.status === "failed" || job.status === "timed_out" ? (
                            <div className="size-8 flex items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/20">
                              <XCircle className="size-4 text-rose-400" />
                            </div>
                          ) : (
                            <div className="size-8 flex items-center justify-center rounded-full bg-slate-500/10 border border-slate-500/20">
                              <Ban className="size-4 text-slate-400" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={`text-xs ${meta.cls}`}>
                              <span className={`size-1.5 rounded-full mr-1.5 inline-block ${meta.dot}`} />
                              {meta.label}
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/20">
                              {job.test_type?.replace(/_/g, " ")}
                            </Badge>
                            {job.results_count > 0 && (
                              <Badge variant="outline" className="text-xs bg-rose-500/10 text-rose-400 border-rose-500/20">
                                {job.results_count} finding{job.results_count !== 1 ? "s" : ""}
                              </Badge>
                            )}
                          </div>
                          {ep ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Link href={`/dashboard/logs/${job.inventory_id}`} className="inline-flex items-center gap-1.5 font-mono text-xs text-blue-400 hover:text-blue-300 transition-colors">
                                    <Badge variant="outline" className={`text-xs font-bold ${methodBadgeColor(ep.Method)}`}>{ep.Method}</Badge>
                                    <span className="truncate max-w-xs">{ep.PathPattern}</span>
                                    <ExternalLink className="size-3 shrink-0" />
                                  </Link>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs font-mono">{ep.BaseURL}{ep.PathPattern}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <p className="text-xs text-muted-foreground font-mono truncate">{job.inventory_id}</p>
                          )}
                          {job.error && <p className="text-xs text-rose-400 truncate">{job.error}</p>}
                        </div>

                        {/* Meta */}
                        <div className="hidden lg:flex flex-col items-end gap-1 shrink-0 text-right">
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="size-3" />{formatDate(job.created_at)}</p>
                          {jobDuration(job) !== "—" && <p className="text-xs text-slate-500">Duration: {jobDuration(job)}</p>}
                          {job.attempts > 1 && <p className="text-xs text-slate-600">{job.attempts} attempts</p>}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {job.results_count > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-slate-200" onClick={() => { setInventoryId(""); setActiveTab("results") }}>
                                    <ShieldAlert className="size-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="text-xs">View results</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {canCancel && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10" disabled={isAction} onClick={() => cancelJob(job.id)}>
                                    {isAction ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="text-xs">Cancel job</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {canRerun && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10" disabled={isAction} onClick={() => rerunJob(job.id)}>
                                    {isAction ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="text-xs">Rerun job</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}

            {/* Jobs pagination */}
            {!jobsLoading && !jobsError && jobsPagination && jobsPagination.total > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Showing <span className="text-slate-200 font-medium">{(jobsPagination.page - 1) * jobsPagination.limit + 1}</span>–<span className="text-slate-200 font-medium">{Math.min(jobsPagination.page * jobsPagination.limit, jobsPagination.total)}</span> of <span className="text-slate-200 font-medium">{jobsPagination.total}</span> jobs
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="glass-chip border-white/10" disabled={jobsPage <= 1} onClick={() => setJobsPage(p => Math.max(1, p - 1))}>
                    <ChevronLeft className="size-4 mr-1" />Previous
                  </Button>
                  <Button variant="outline" size="sm" className="glass-chip border-white/10" disabled={jobsPage >= jobsPagination.total_pages} onClick={() => setJobsPage(p => p + 1)}>
                    Next<ChevronRight className="size-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
