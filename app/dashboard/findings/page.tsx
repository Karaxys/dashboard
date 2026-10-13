"use client"

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Cell, Pie, PieChart } from "recharts"
import {
  AlertTriangle, Check, CheckCircle2, ChevronDown, ChevronLeft,
  ChevronRight, Clock, Copy, ExternalLink, Play, RefreshCcw, Search,
  ShieldAlert, ShieldCheck, ShieldOff, Swords, Terminal, TrendingUp, Wrench,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/lib/api"
import { guidanceFor } from "@/lib/vuln-guidance"
import { cn } from "@/lib/utils"

// ─── Types ──────────────────────────────────────────────────────────────────
interface Issue {
  id: string
  inventory_id: string
  scan_job_id?: string
  test_type: string
  severity: string
  status: string
  title: string
  description?: string
  evidence_summary?: string
  first_seen_at: string
  last_seen_at: string
  updated_at: string
}

interface IssuesResponse {
  data: Issue[]
  total: number
  page: number
  limit: number
  total_pages: number
}

interface InventoryOption {
  ID: string
  Method: string
  PathPattern: string
  BaseURL: string
}

const SEVERITIES = ["critical", "high", "medium", "low"] as const
const STATUS_KEYS = ["all", "open", "accepted_risk", "false_positive", "fixed"] as const
const SORT_OPTIONS = [
  { id: "risk", label: "Risk: highest first" },
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
] as const

/** The test types the registry ships, for the coverage panel. */
const COVERAGE_TEST_TYPES = [
  "BOLA", "BOLA_CHAINED_ENUMERATION", "BFLA", "BROKEN_USER_AUTH",
  "JWT_NONE_ALGO", "JWT_INVALID_SIGNATURE", "MASS_ASSIGNMENT",
  "DEFAULT_CREDENTIALS", "WEAK_CREDENTIALS_REUSE", "SQL_INJECTION",
  "REFLECTED_XSS", "STORED_XSS", "COMMAND_INJECTION", "SSRF",
  "OPEN_REDIRECT", "CORS_MISCONFIGURATION", "EXPOSED_METRICS",
  "EXPOSED_SENSITIVE_PATHS", "SWAGGER_CHECK",
]

const SEVERITY_META: Record<string, { label: string; cls: string; border: string; fill: string; icon: React.ElementType }> = {
  critical: { label: "Critical", cls: "bg-rose-500/15 text-rose-300 border-rose-500/30", border: "border-l-rose-500", fill: "#f43f5e", icon: ShieldAlert },
  high:     { label: "High",     cls: "bg-orange-500/15 text-orange-300 border-orange-500/30", border: "border-l-orange-500", fill: "#f97316", icon: AlertTriangle },
  medium:   { label: "Medium",   cls: "bg-amber-500/15 text-amber-300 border-amber-500/30", border: "border-l-amber-500", fill: "#f59e0b", icon: AlertTriangle },
  low:      { label: "Low",      cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", border: "border-l-emerald-500", fill: "#10b981", icon: ShieldCheck },
}

const STATUS_META: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  open:           { label: "Open",          icon: ShieldAlert,  cls: "text-rose-300 bg-rose-500/10 border-rose-500/20" },
  accepted_risk:  { label: "Accepted Risk", icon: ShieldOff,    cls: "text-amber-300 bg-amber-500/10 border-amber-500/20" },
  false_positive: { label: "False Positive",icon: ShieldCheck,  cls: "text-slate-300 bg-slate-500/10 border-slate-500/20" },
  fixed:          { label: "Fixed",         icon: CheckCircle2, cls: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20" },
}

const METHOD_CLS: Record<string, string> = {
  GET: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  POST: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  PUT: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  PATCH: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  DELETE: "text-rose-400 bg-rose-500/10 border-rose-500/20",
}

const severityMeta = (s: string) => SEVERITY_META[s?.toLowerCase()] ?? SEVERITY_META.medium
const statusMeta = (s: string) => STATUS_META[s] ?? STATUS_META.open

const formatDate = (value?: string) => {
  if (!value) return "—"
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
}

export default function FindingsPage() {
  return (
    <Suspense fallback={<div className="glass-page min-h-full" />}>
      <FindingsPageContent />
    </Suspense>
  )
}

function FindingsPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [issues, setIssues] = useState<Issue[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [endpoints, setEndpoints] = useState<Map<string, InventoryOption>>(new Map())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Global counts for the stat cards, the chart and quick stats.
  const [severityCounts, setSeverityCounts] = useState<Record<string, number>>({})
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [coverage, setCoverage] = useState<Record<string, number>>({})

  // Filters (URL-backed so a filtered view is shareable)
  const [severity, setSeverity] = useState(searchParams.get("severity") || "all")
  const [status, setStatus] = useState(searchParams.get("status") || "all")
  const [testType, setTestType] = useState(searchParams.get("test_type") || "all")
  const [sort, setSort] = useState(searchParams.get("sort") || "risk")
  const [page, setPage] = useState(() => Number(searchParams.get("page")) || 1)
  const [search, setSearch] = useState(searchParams.get("q") || "")
  const [debouncedSearch, setDebouncedSearch] = useState(search)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  const limit = 10

  useEffect(() => {
    const params = new URLSearchParams()
    if (severity !== "all") params.set("severity", severity)
    if (status !== "all") params.set("status", status)
    if (testType !== "all") params.set("test_type", testType)
    if (sort !== "risk") params.set("sort", sort)
    if (page > 1) params.set("page", String(page))
    if (debouncedSearch) params.set("q", debouncedSearch)
    const next = params.toString()
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [severity, status, testType, sort, debouncedSearch])

  const sortParams = useMemo(() => {
    if (sort === "risk") return "sort_by=severity&sort_order=asc"
    if (sort === "oldest") return "sort_by=first_seen_at&sort_order=asc"
    return "sort_by=first_seen_at&sort_order=desc"
  }, [sort])

  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams()
    if (severity !== "all") params.set("severity", severity)
    if (status !== "all") params.set("status", status)
    if (testType !== "all") params.set("test_type", testType)
    if (debouncedSearch) params.set("q", debouncedSearch)
    return params
  }, [severity, status, testType, debouncedSearch])

  // Issues for the current page
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true); setError(null)
      try {
        const params = buildFilterParams()
        params.set("page", String(page))
        params.set("limit", String(limit))
        const data = await apiFetch<IssuesResponse>(`/v1/issues?${params.toString()}&${sortParams}`)
        if (cancelled) return
        setIssues(data.data || [])
        setTotal(data.total || 0)
        setTotalPages(Math.max(1, data.total_pages || 1))
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load findings")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [page, sortParams, buildFilterParams, refreshKey])

  // Endpoint metadata for the rows
  useEffect(() => {
    apiFetch<{ data: InventoryOption[] }>("/inventory?limit=500")
      .then(d => setEndpoints(new Map((d.data || []).map(e => [e.ID, e]))))
      .catch(() => { /* rows fall back to the endpoint id */ })
  }, [])

  // Global counters (unfiltered by severity/status) and per-test-type coverage
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const count = async (query: string) => {
        const data = await apiFetch<{ total: number }>(`/v1/issues?limit=1&${query}`)
        return data.total || 0
      }
      try {
        const [critical, high, medium, low, open, accepted, falsePositive, fixed] = await Promise.all([
          count("severity=critical"), count("severity=high"), count("severity=medium"), count("severity=low"),
          count("status=open"), count("status=accepted_risk"), count("status=false_positive"), count("status=fixed"),
        ])
        if (cancelled) return
        setSeverityCounts({ critical, high, medium, low })
        setStatusCounts({ open, accepted_risk: accepted, false_positive: falsePositive, fixed })

        const sample = await apiFetch<IssuesResponse>("/v1/issues?limit=100")
        if (cancelled) return
        const tally: Record<string, number> = {}
        for (const issue of sample.data || []) tally[issue.test_type] = (tally[issue.test_type] || 0) + 1
        setCoverage(tally)
      } catch { /* counters are best-effort */ }
    }
    load()
    return () => { cancelled = true }
  }, [refreshKey])

  const updateStatus = async (issueId: string, newStatus: string) => {
    setUpdatingId(issueId)
    try {
      const updated = await apiFetch<Issue>(`/v1/issues/${issueId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      })
      setIssues(prev => prev.map(i => (i.id === issueId ? { ...i, status: updated.status ?? newStatus } : i)))
      setRefreshKey(k => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update the finding")
    } finally {
      setUpdatingId(null)
    }
  }

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const chartData = useMemo(
    () => SEVERITIES.map(s => ({ name: s, value: severityCounts[s] || 0, fill: SEVERITY_META[s].fill })).filter(d => d.value > 0),
    [severityCounts],
  )
  const chartConfig = useMemo(() => ({
    value: { label: "Findings" },
  } satisfies ChartConfig), [])

  const severityTotal = SEVERITIES.reduce((sum, s) => sum + (severityCounts[s] || 0), 0)
  const showingFrom = total === 0 ? 0 : (page - 1) * limit + 1
  const showingTo = Math.min(page * limit, total)

  return (
    <div className="glass-page min-h-full">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 p-5">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10">
              <ShieldAlert className="size-5 text-rose-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-100">Findings</h1>
              <p className="text-sm text-muted-foreground">Prioritize exploitable issues across your observed API traffic</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setRefreshKey(k => k + 1)} className="border-white/10 text-slate-300 hover:text-white" aria-label="Refresh">
              <RefreshCcw className="size-4" />
            </Button>
            <Button asChild className="border-0 bg-rose-500 font-semibold text-white hover:bg-rose-400">
              <Link href="/dashboard/scan"><Play className="mr-2 size-4" /> Run new scan</Link>
            </Button>
          </div>
        </div>

        {/* ── Severity stat cards ── */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {SEVERITIES.map(sev => {
            const meta = SEVERITY_META[sev]
            const Icon = meta.icon
            const active = severity === sev
            return (
              <button
                key={sev}
                type="button"
                onClick={() => setSeverity(active ? "all" : sev)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border bg-black/20 p-4 text-left transition-colors hover:bg-black/30",
                  active ? meta.cls : "border-white/10",
                )}
              >
                <span className={cn("flex size-10 items-center justify-center rounded-lg border", meta.cls)}>
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm text-muted-foreground">{meta.label}</span>
                  <span className="block text-2xl font-semibold leading-tight text-slate-100">{severityCounts[sev] ?? 0}</span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          {/* ── List column ── */}
          <div className="space-y-4">
            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search findings, endpoints, CWE…"
                  className="h-10 border-white/10 bg-black/30 pl-9 text-slate-200 placeholder:text-muted-foreground/60"
                />
              </div>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="h-10 w-[130px] border-white/10 bg-black/30 text-slate-200"><SelectValue placeholder="Severity" /></SelectTrigger>
                <SelectContent className="border-white/10 bg-slate-900 text-slate-200">
                  <SelectItem value="all">All severities</SelectItem>
                  {SEVERITIES.map(s => <SelectItem key={s} value={s} className="capitalize">{SEVERITY_META[s].label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-10 w-[130px] border-white/10 bg-black/30 text-slate-200"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent className="border-white/10 bg-slate-900 text-slate-200">
                  {STATUS_KEYS.map(s => <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : STATUS_META[s].label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={testType} onValueChange={setTestType}>
                <SelectTrigger className="h-10 w-[150px] border-white/10 bg-black/30 text-slate-200"><SelectValue placeholder="Test type" /></SelectTrigger>
                <SelectContent className="max-h-80 border-white/10 bg-slate-900 text-slate-200">
                  <SelectItem value="all">All test types</SelectItem>
                  {COVERAGE_TEST_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="h-10 w-[170px] border-white/10 bg-black/30 text-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent className="border-white/10 bg-slate-900 text-slate-200">
                  {SORT_OPTIONS.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">{total} finding{total === 1 ? "" : "s"}</span>
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-400" />
                <div>
                  <p className="text-sm font-medium text-rose-300">Could not load findings</p>
                  <p className="text-xs text-rose-200/80">{error}</p>
                </div>
              </div>
            )}

            {loading && (
              <div className="space-y-3">
                {[0, 1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl bg-white/5" />)}
              </div>
            )}

            {!loading && issues.length === 0 && !error && (
              <Card className="border-white/10 bg-black/20">
                <CardContent className="flex flex-col items-center justify-center gap-2 py-14 text-center">
                  <ShieldCheck className="size-9 text-emerald-400/70" />
                  <p className="text-sm font-medium text-slate-200">No findings match these filters</p>
                  <p className="max-w-sm text-xs text-muted-foreground">
                    {severityTotal === 0
                      ? "Run a scan on a captured endpoint to populate findings."
                      : "Clear the filters or search for something else."}
                  </p>
                </CardContent>
              </Card>
            )}

            {!loading && issues.map(issue => (
              <FindingRow
                key={issue.id}
                issue={issue}
                endpoint={endpoints.get(issue.inventory_id)}
                expanded={expandedId === issue.id}
                onToggle={() => setExpandedId(expandedId === issue.id ? null : issue.id)}
                onStatusChange={updateStatus}
                updating={updatingId === issue.id}
                copied={copied}
                onCopy={copyText}
              />
            ))}

            {/* Pagination */}
            {total > 0 && (
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-muted-foreground">Showing {showingFrom}–{showingTo} of {total}</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="border-white/10">
                    <ChevronLeft className="mr-1 size-4" /> Previous
                  </Button>
                  <span className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-sm text-rose-200">{page}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="border-white/10">
                    Next <ChevronRight className="ml-1 size-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-5">
            <Card className="border-white/10 bg-black/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <TrendingUp className="size-4 text-rose-400" /> Risk overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  {severityTotal === 0 ? (
                    <div className="flex h-[180px] items-center justify-center text-xs text-muted-foreground">No findings yet</div>
                  ) : (
                    <>
                      <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[180px]">
                        <PieChart>
                          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                          <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={82} strokeWidth={2} stroke="#0b1020">
                            {chartData.map(slice => <Cell key={slice.name} fill={slice.fill} />)}
                          </Pie>
                        </PieChart>
                      </ChartContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-semibold text-slate-100">{severityTotal}</span>
                        <span className="text-[11px] text-muted-foreground">Findings</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="space-y-2">
                  {SEVERITIES.map(sev => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSeverity(severity === sev ? "all" : sev)}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-sm transition-colors hover:bg-white/5"
                    >
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span className="size-2.5 rounded-full" style={{ background: SEVERITY_META[sev].fill }} />
                        {SEVERITY_META[sev].label}
                      </span>
                      <span className="font-medium text-slate-200">{severityCounts[sev] ?? 0}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-black/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <Swords className="size-4 text-purple-400" /> Test coverage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="pb-2 text-[11px] text-muted-foreground">Findings per test type — select one to filter</p>
                {COVERAGE_TEST_TYPES.filter(t => coverage[t]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTestType(testType === t ? "all" : t)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-white/5",
                      testType === t && "bg-white/5",
                    )}
                  >
                    <span className="truncate text-slate-300">{t.replace(/_/g, " ")}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-muted-foreground">{coverage[t]} finding{coverage[t] === 1 ? "" : "s"}</span>
                      <AlertTriangle className="size-3.5 text-amber-400" />
                    </span>
                  </button>
                ))}
                {COVERAGE_TEST_TYPES.filter(t => !coverage[t]).slice(0, 6).map(t => (
                  <div key={t} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs text-muted-foreground/70">
                    <span className="truncate">{t.replace(/_/g, " ")}</span>
                    <CheckCircle2 className="size-3.5 text-emerald-400/60" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-black/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <Wrench className="size-4 text-sky-400" /> Quick stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  { label: "Total findings", value: severityTotal, icon: TrendingUp },
                  { label: "Open", value: statusCounts.open ?? 0, icon: ShieldAlert },
                  { label: "Accepted risk", value: statusCounts.accepted_risk ?? 0, icon: ShieldOff },
                  { label: "Fixed", value: statusCounts.fixed ?? 0, icon: CheckCircle2 },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between rounded-lg px-2 py-1 transition-colors hover:bg-white/5">
                    <span className="flex items-center gap-2 text-muted-foreground"><row.icon className="size-3.5" /> {row.label}</span>
                    <span className="font-medium text-slate-200">{row.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Finding row (collapsed summary, or expanded with evidence + remediation) ─
function FindingRow({ issue, endpoint, expanded, onToggle, onStatusChange, updating, copied, onCopy }: {
  issue: Issue
  endpoint?: InventoryOption
  expanded: boolean
  onToggle: () => void
  onStatusChange: (id: string, status: string) => void
  updating: boolean
  copied: string | null
  onCopy: (text: string, id: string) => void
}) {
  const sev = severityMeta(issue.severity)
  const st = statusMeta(issue.status)
  const StIcon = st.icon
  const guidance = guidanceFor(issue.test_type)
  const cwe = guidance.cwe
  const endpointHref = `/dashboard/logs/${issue.inventory_id}`
  const title = issue.title || `${issue.test_type.replace(/_/g, " ")} on ${endpoint?.PathPattern || "endpoint"}`

  return (
    <Card className={cn("border-l-4 border-white/5 bg-black/20 transition-colors", sev.border)}>
      <CardContent className={cn("space-y-3 p-4", expanded && "space-y-4 p-5")}>
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <Badge variant="outline" className={cn("shrink-0 text-xs font-semibold", sev.cls)}>{sev.label}</Badge>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-snug text-slate-100">{title}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                {endpoint && (
                  <span className={cn("rounded border px-1.5 py-0.5 font-mono font-bold", METHOD_CLS[endpoint.Method] ?? METHOD_CLS.GET)}>
                    {endpoint.Method}
                  </span>
                )}
                <Link href={endpointHref} className="inline-flex items-center gap-1 break-all font-mono text-slate-300 hover:text-slate-100">
                  {endpoint?.PathPattern || issue.inventory_id}
                  <ExternalLink className="size-3" />
                </Link>
                {!expanded && issue.description && (
                  <span className="truncate text-muted-foreground">· {issue.description}</span>
                )}
              </div>
              {expanded && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <a href={guidance.owasp.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded border border-sky-500/20 bg-sky-500/10 px-1.5 py-0.5 text-sky-300 hover:bg-sky-500/20">
                    {guidance.owasp.id} · {guidance.owasp.name}
                  </a>
                  {cwe && <span className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-muted-foreground">{cwe}</span>}
                  {endpoint?.BaseURL && <span className="break-all text-muted-foreground">{endpoint.BaseURL}</span>}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(issue.last_seen_at)}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={updating} className={cn("h-7 border px-2.5 text-xs", st.cls)}>
                  <StIcon className="mr-1.5 size-3" />{st.label}<ChevronDown className="ml-1 size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 border-white/10 bg-slate-900 text-slate-200">
                {Object.entries(STATUS_META).map(([key, meta]) => (
                  <DropdownMenuItem
                    key={key}
                    disabled={issue.status === key}
                    onClick={() => onStatusChange(issue.id, key)}
                    className="cursor-pointer text-xs hover:bg-white/5"
                  >
                    <meta.icon className="mr-2 size-3.5" /> {meta.label}
                    {issue.status === key && <Check className="ml-auto size-3 text-emerald-400" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" onClick={onToggle} className="size-7 text-muted-foreground hover:text-slate-200" aria-label={expanded ? "Collapse" : "Expand"}>
              <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
            </Button>
          </div>
        </div>

        {expanded && (
          <>
            {/* Summary */}
            <p className="text-sm leading-relaxed text-slate-300">{guidance.summary}</p>

            {/* Impact | Evidence | actions */}
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <div className="space-y-1.5 rounded-lg border border-white/5 bg-black/25 p-3.5">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <ShieldAlert className="size-3.5 text-rose-400" /> Impact
                </p>
                <p className="text-xs leading-relaxed text-slate-300">{issue.description || guidance.summary}</p>
              </div>
              <div className="space-y-1.5 rounded-lg border border-white/5 bg-black/25 p-3.5">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <Terminal className="size-3.5 text-blue-400" /> Evidence
                </p>
                <p className="text-xs leading-relaxed text-slate-300">{guidance.howProved}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="outline" size="sm" asChild className="border-white/10 text-slate-200">
                  <a href={endpointHref}>
                    <Terminal className="mr-2 size-4" /> View request
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!issue.evidence_summary}
                  onClick={() => issue.evidence_summary && onCopy(issue.evidence_summary, issue.id)}
                  className="border-white/10 text-slate-200"
                >
                  {copied === issue.id ? <Check className="mr-2 size-4 text-emerald-400" /> : <Copy className="mr-2 size-4" />}
                  {copied === issue.id ? "Copied" : "Copy cURL"}
                </Button>
              </div>
            </div>

            {/* Evidence & reproduction */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <button type="button" className="flex w-full items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3.5 py-2.5 text-sm text-slate-300 transition-colors hover:bg-black/30">
                  <span className="flex items-center gap-2"><Terminal className="size-4 text-blue-400" /> Evidence &amp; reproduction</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">View details <ChevronRight className="size-3.5" /></span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                {issue.evidence_summary ? (
                  <div className="max-h-48 overflow-auto rounded-lg border border-white/5 bg-black/40 p-3">
                    <pre className="whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-blue-300">{issue.evidence_summary}</pre>
                  </div>
                ) : (
                  <p className="px-1 text-xs text-muted-foreground">No stored proof for this finding.</p>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Remediation */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <button type="button" className="flex w-full items-center justify-between rounded-lg border border-emerald-500/10 bg-emerald-500/[0.04] px-3.5 py-2.5 text-sm text-slate-300 transition-colors hover:bg-emerald-500/[0.08]">
                  <span className="flex items-center gap-2"><Wrench className="size-4 text-emerald-400" /> Remediation</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">View details <ChevronRight className="size-3.5" /></span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <ol className="space-y-1.5 rounded-lg border border-emerald-500/10 bg-emerald-500/[0.03] p-3.5">
                  {guidance.fix.map((step, i) => (
                    <li key={i} className="flex gap-2 text-xs leading-relaxed text-slate-300">
                      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-[10px] font-semibold text-emerald-300">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </CollapsibleContent>
            </Collapsible>

            <p className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
              <Clock className="size-3" /> First seen {formatDate(issue.first_seen_at)} · Last seen {formatDate(issue.last_seen_at)}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
