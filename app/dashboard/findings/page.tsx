"use client"
import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertTriangle, Bug, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  Clock, Copy, Check, ExternalLink, FilterX, RefreshCcw, Search,
  ShieldAlert, ShieldCheck, ShieldOff, ShieldX, Swords, XCircle,
  FlaskConical,
} from "lucide-react"
import Link from "next/link"
import { apiFetch } from "@/lib/api"

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

const STATUS_OPTIONS = ["all", "open", "accepted_risk", "false_positive", "fixed"] as const
const SEVERITY_OPTIONS = ["all", "critical", "high", "medium", "low"] as const
const TEST_TYPES = [
  "all", "BOLA", "BFLA", "BROKEN_USER_AUTH", "BOLA_PARAMETER_POLLUTION",
  "JWT_NONE_ALGO", "JWT_INVALID_SIGNATURE", "SWAGGER_CHECK", "OPEN_REDIRECT", "EXPOSED_METRICS",
] as const

type StatusOption = typeof STATUS_OPTIONS[number]
type SeverityOption = typeof SEVERITY_OPTIONS[number]

const STATUS_META: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  open:            { label: "Open",            icon: ShieldAlert,  cls: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
  accepted_risk:   { label: "Accepted Risk",   icon: ShieldOff,    cls: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  false_positive:  { label: "False Positive",  icon: ShieldCheck,  cls: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
  fixed:           { label: "Fixed",           icon: CheckCircle2, cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
}

const SEVERITY_META: Record<string, { cls: string; border: string }> = {
  critical: { cls: "bg-rose-500/10 text-rose-400 border-rose-500/20",     border: "border-l-rose-500" },
  high:     { cls: "bg-orange-500/10 text-orange-400 border-orange-500/20", border: "border-l-orange-500" },
  medium:   { cls: "bg-amber-500/10 text-amber-400 border-amber-500/20",   border: "border-l-amber-500" },
  low:      { cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", border: "border-l-emerald-500" },
  unknown:  { cls: "bg-slate-500/10 text-slate-400 border-slate-500/20",   border: "border-l-slate-500" },
}

function severityMeta(s: string) { return SEVERITY_META[s?.toLowerCase()] ?? SEVERITY_META.unknown }

const parsePage = (v: string | null) => { const n = Number(v); return n > 0 ? n : 1 }

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
  const [pagination, setPagination] = useState<IssuesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [endpoints, setEndpoints] = useState<Map<string, InventoryOption>>(new Map())
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [severity, setSeverity] = useState<SeverityOption>((searchParams.get("severity") as SeverityOption) || "all")
  const [status, setStatus] = useState<StatusOption>((searchParams.get("status") as StatusOption) || "all")
  const [testType, setTestType] = useState(searchParams.get("test_type") || "all")
  const [page, setPage] = useState(parsePage(searchParams.get("page")))

  // Sync URL
  useEffect(() => {
    const p = new URLSearchParams()
    if (severity !== "all") p.set("severity", severity)
    if (status !== "all") p.set("status", status)
    if (testType !== "all") p.set("test_type", testType)
    if (page > 1) p.set("page", String(page))
    const next = p.toString()
    const curr = searchParams.toString()
    if (next === curr) return
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
  }, [severity, status, testType, page, pathname, router, searchParams])

  useEffect(() => { setPage(1) }, [severity, status, testType])

  const fetchIssues = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const q = new URLSearchParams({ page: String(page), limit: "20", sort_order: "desc" })
      if (severity !== "all") q.set("severity", severity)
      if (status !== "all") q.set("status", status)
      const data = await apiFetch<IssuesResponse>(`/v1/issues?${q}`)
      let filtered = data.data || []
      if (testType !== "all") filtered = filtered.filter(i => i.test_type === testType)
      setIssues(filtered)
      setPagination(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load findings")
    } finally {
      setLoading(false)
    }
  }, [page, severity, status, testType])

  useEffect(() => { fetchIssues() }, [fetchIssues])

  // Load endpoint map for path resolution
  useEffect(() => {
    apiFetch<{ data: InventoryOption[] }>("/inventory?limit=500")
      .then(r => setEndpoints(new Map((r.data || []).map(e => [e.ID, e]))))
      .catch(() => {})
  }, [])

  const updateStatus = async (issueId: string, newStatus: string) => {
    setUpdatingId(issueId)
    try {
      const updated = await apiFetch<Issue>(`/v1/issues/${issueId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      })
      setIssues(prev => prev.map(i => i.id === issueId ? { ...i, status: updated.status } : i))
    } catch {
      // silent — keep current state
    } finally {
      setUpdatingId(null)
    }
  }

  const copyProof = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Summary counts from current page (approximate — full counts need separate API calls)
  const counts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0, open: 0, accepted_risk: 0, false_positive: 0, fixed: 0 }
    issues.forEach(i => {
      const sev = i.severity?.toLowerCase() as keyof typeof c
      if (sev in c) c[sev]++
      const st = i.status as keyof typeof c
      if (st in c) c[st]++
    })
    return c
  }, [issues])

  // Test coverage: unique test types seen
  const testTypesSeen = useMemo(() => [...new Set(issues.map(i => i.test_type))], [issues])

  const formatDate = (s: string) => {
    if (!s) return "—"
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(s))
  }

  const hasFilters = severity !== "all" || status !== "all" || testType !== "all"
  const clearFilters = () => { setSeverity("all"); setStatus("all"); setTestType("all") }

  return (
    <div className="glass-page min-h-full">
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex w-full items-center gap-3 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block"><BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem><BreadcrumbPage>Findings</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 p-5 pt-0">
        {/* Header row */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bug className="size-6 text-rose-400" />
              Findings
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              All detected vulnerabilities — triage, accept risk, or mark fixed.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchIssues} disabled={loading} className="glass-chip border-white/10">
            <RefreshCcw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Severity counter strip — Akto-style */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(["critical", "high", "medium", "low"] as const).map(sev => {
            const meta = severityMeta(sev)
            const isActive = severity === sev
            return (
              <button
                key={sev}
                onClick={() => setSeverity(isActive ? "all" : sev)}
                className={`glass-chip rounded-xl px-4 py-3 text-left transition-all border ${
                  isActive ? `${meta.cls} ring-1 ring-current/30` : "border-white/5 hover:border-white/15"
                }`}
              >
                <p className={`text-xs font-semibold uppercase tracking-wider ${isActive ? "" : "text-muted-foreground"}`}>
                  {sev}
                </p>
                <p className={`text-2xl font-bold mt-1 ${isActive ? "" : "text-slate-200"}`}>
                  {loading ? <span className="animate-pulse">—</span> : counts[sev]}
                </p>
              </button>
            )
          })}
        </div>

        {/* Status distribution strip */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(STATUS_META).map(([key, meta]) => {
            const Icon = meta.icon
            const isActive = status === key
            const count = counts[key as keyof typeof counts] ?? 0
            return (
              <button
                key={key}
                onClick={() => setStatus(isActive ? "all" : key as StatusOption)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium border transition-all ${
                  isActive ? meta.cls + " ring-1 ring-current/20" : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-slate-300"
                }`}
              >
                <Icon className="size-3.5" />
                {meta.label}
                <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${isActive ? "bg-current/10" : "bg-white/5"}`}>
                  {loading ? "—" : count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="grid gap-5 xl:grid-cols-4">
          {/* Main findings list */}
          <div className="xl:col-span-3 space-y-3">
            {/* Filter bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={testType} onValueChange={v => setTestType(v)}>
                <SelectTrigger className="sm:w-52 bg-black/20 border-white/10 text-slate-200">
                  <SelectValue placeholder="All Tests" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                  <SelectItem value="all">All Test Types</SelectItem>
                  {TEST_TYPES.filter(t => t !== "all").map(t => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button variant="ghost" onClick={clearFilters} className="text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10">
                  <FilterX className="size-4 mr-2" /> Clear filters
                </Button>
              )}
            </div>

            {/* Issue cards */}
            {error ? (
              <div className="glass-chip rounded-xl flex flex-col items-center justify-center gap-3 py-16 text-center">
                <XCircle className="size-10 text-rose-400/40" />
                <p className="text-rose-400 font-medium">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchIssues} className="glass-chip border-white/10 mt-1">Retry</Button>
              </div>
            ) : loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-xl bg-white/5" />
                ))}
              </div>
            ) : issues.length === 0 ? (
              <div className="glass-chip rounded-xl flex flex-col items-center justify-center gap-3 py-20 text-center">
                <ShieldCheck className="size-14 text-emerald-500/20" />
                <p className="text-lg font-semibold text-emerald-400">No findings</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {hasFilters ? "No findings match your current filters." : "Run scans on your endpoints to discover vulnerabilities."}
                </p>
                {hasFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters} className="glass-chip border-white/10 mt-1">Clear filters</Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {issues.map(issue => {
                  const sm = severityMeta(issue.severity)
                  const stMeta = STATUS_META[issue.status] ?? STATUS_META.open
                  const StIcon = stMeta.icon
                  const endpoint = endpoints.get(issue.inventory_id)
                  const isExpanded = expandedId === issue.id

                  return (
                    <Card
                      key={issue.id}
                      className={`border-l-4 bg-black/20 border-white/5 transition-all ${sm.border}`}
                    >
                      <CardContent className="p-4 space-y-3">
                        {/* Top row */}
                        <div className="flex items-start gap-3 justify-between">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="flex flex-col gap-1.5 pt-0.5">
                              <Badge variant="outline" className={`text-xs shrink-0 ${sm.cls}`}>
                                {issue.severity?.toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className="text-xs shrink-0 bg-purple-500/10 text-purple-400 border-purple-500/20">
                                {issue.test_type?.replace(/_/g, " ")}
                              </Badge>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm text-slate-100 leading-snug">{issue.title || issue.test_type?.replace(/_/g, " ")}</p>
                              {issue.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{issue.description}</p>
                              )}
                              {endpoint && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Link
                                        href={`/dashboard/logs/${issue.inventory_id}`}
                                        className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors font-mono"
                                      >
                                        <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                                          endpoint.Method === "GET" ? "bg-blue-500/10 text-blue-400" :
                                          endpoint.Method === "POST" ? "bg-emerald-500/10 text-emerald-400" :
                                          endpoint.Method === "DELETE" ? "bg-rose-500/10 text-rose-400" :
                                          "bg-amber-500/10 text-amber-400"
                                        }`}>{endpoint.Method}</span>
                                        {endpoint.PathPattern}
                                        <ExternalLink className="size-3" />
                                      </Link>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs">{endpoint.BaseURL}{endpoint.PathPattern}</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </div>

                          {/* Status quick-action dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={updatingId === issue.id}
                                className={`shrink-0 h-7 px-2.5 text-xs border ${stMeta.cls} hover:opacity-80`}
                              >
                                {updatingId === issue.id
                                  ? <span className="animate-pulse">…</span>
                                  : <><StIcon className="size-3 mr-1.5" />{stMeta.label}<ChevronDown className="size-3 ml-1" /></>
                                }
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-slate-200 w-44">
                              {Object.entries(STATUS_META).map(([key, meta]) => {
                                const Icon = meta.icon
                                return (
                                  <DropdownMenuItem
                                    key={key}
                                    disabled={issue.status === key}
                                    onClick={() => updateStatus(issue.id, key)}
                                    className="flex items-center gap-2 text-xs cursor-pointer hover:bg-white/5"
                                  >
                                    <Icon className="size-3.5" />
                                    {meta.label}
                                    {issue.status === key && <Check className="size-3 ml-auto text-emerald-400" />}
                                  </DropdownMenuItem>
                                )
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Evidence expansion */}
                        {issue.evidence_summary && (
                          <div>
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : issue.id)}
                              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                            >
                              <FlaskConical className="size-3" />
                              Evidence
                              <ChevronDown className={`size-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </button>
                            {isExpanded && (
                              <div className="mt-2 relative">
                                <div className="p-3 rounded-lg bg-black/40 border border-white/5 font-mono text-xs text-blue-300 whitespace-pre-wrap break-all max-h-40 overflow-auto">
                                  {issue.evidence_summary}
                                </div>
                                <button
                                  onClick={() => copyProof(issue.evidence_summary!, `ev-${issue.id}`)}
                                  className="absolute top-2 right-2 text-muted-foreground hover:text-slate-200 transition-colors"
                                >
                                  {copiedId === `ev-${issue.id}`
                                    ? <Check className="size-3.5 text-emerald-400" />
                                    : <Copy className="size-3.5" />
                                  }
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-1 border-t border-white/5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="size-3" /> First: {formatDate(issue.first_seen_at)}</span>
                          <span className="flex items-center gap-1"><Clock className="size-3" /> Last: {formatDate(issue.last_seen_at)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Pagination */}
            {!loading && !error && pagination && pagination.total > 0 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">
                  Showing <span className="text-slate-200 font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> – <span className="text-slate-200 font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-slate-200 font-medium">{pagination.total}</span>
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="glass-chip border-white/10" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                    <ChevronLeft className="size-4 mr-1" /> Previous
                  </Button>
                  <Button variant="outline" size="sm" className="glass-chip border-white/10" disabled={page >= pagination.total_pages} onClick={() => setPage(p => p + 1)}>
                    Next <ChevronRight className="size-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar — test coverage widget (Akto-inspired) */}
          <div className="space-y-4">
            <Card className="glass-panel">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Swords className="size-4 text-purple-400" />
                  Test Coverage
                </CardTitle>
                <CardDescription className="text-xs">OWASP tests run on this inventory</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {TEST_TYPES.filter(t => t !== "all").map(type => {
                  const ran = testTypesSeen.includes(type)
                  return (
                    <div key={type} className="flex items-center justify-between text-xs">
                      <span className={ran ? "text-slate-200" : "text-slate-600"}>{type.replace(/_/g, " ")}</span>
                      {ran
                        ? <CheckCircle2 className="size-3.5 text-emerald-400" />
                        : <XCircle className="size-3.5 text-slate-700" />
                      }
                    </div>
                  )
                })}
                <div className="pt-2 border-t border-white/5">
                  <p className="text-xs text-muted-foreground">
                    <span className="text-emerald-400 font-bold">{testTypesSeen.length}</span> / {TEST_TYPES.length - 1} tests run
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="size-4 text-amber-400" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total findings</span>
                  <span className="font-semibold text-slate-200">{loading ? "—" : pagination?.total ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Open</span>
                  <span className="font-semibold text-rose-400">{loading ? "—" : counts.open}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Accepted Risk</span>
                  <span className="font-semibold text-amber-400">{loading ? "—" : counts.accepted_risk}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Fixed</span>
                  <span className="font-semibold text-emerald-400">{loading ? "—" : counts.fixed}</span>
                </div>
              </CardContent>
            </Card>

            <Button asChild className="w-full bg-rose-600 hover:bg-rose-500 text-white border-0 font-semibold">
              <Link href="/dashboard/scan">
                <Swords className="size-4 mr-2" />
                Run New Scan
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
