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
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  CheckCircle2, ChevronLeft, ChevronRight, Clock, ExternalLink,
  FilterX, Loader2, Play, Radio, RefreshCcw, RotateCcw,
  ShieldAlert, XCircle, Crosshair, Ban,
} from "lucide-react"
import Link from "next/link"
import { apiFetch } from "@/lib/api"

interface ScanJob {
  id: string
  inventory_id: string
  status: string
  test_type: string
  attack_method?: string
  error?: string
  attempts: number
  results_count: number
  timeout_seconds?: number
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

interface InventoryOption {
  ID: string
  Method: string
  PathPattern: string
  BaseURL: string
}

const STATUS_TABS = ["all", "running", "queued", "completed", "failed", "cancelled", "timed_out"] as const
type StatusTab = typeof STATUS_TABS[number]

const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  queued:    { label: "Queued",    cls: "bg-blue-500/10 text-blue-400 border-blue-500/20",    dot: "bg-blue-400" },
  running:   { label: "Running",   cls: "bg-amber-500/10 text-amber-400 border-amber-500/20", dot: "bg-amber-400 animate-pulse" },
  completed: { label: "Completed", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  failed:    { label: "Failed",    cls: "bg-rose-500/10 text-rose-400 border-rose-500/20",    dot: "bg-rose-400" },
  cancelled: { label: "Cancelled", cls: "bg-slate-500/10 text-slate-400 border-slate-500/20", dot: "bg-slate-400" },
  timed_out: { label: "Timed Out", cls: "bg-orange-500/10 text-orange-400 border-orange-500/20", dot: "bg-orange-400" },
}

const parsePage = (v: string | null) => { const n = Number(v); return n > 0 ? n : 1 }

function duration(job: ScanJob): string {
  const start = job.started_at ? new Date(job.started_at).getTime() : null
  const end = job.completed_at
    ? new Date(job.completed_at).getTime()
    : job.cancelled_at ? new Date(job.cancelled_at).getTime() : null
  if (!start || !end) return "—"
  const secs = Math.round((end - start) / 1000)
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}m ${secs % 60}s`
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="glass-page min-h-full" />}>
      <JobsPageContent />
    </Suspense>
  )
}

function JobsPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [jobs, setJobs] = useState<ScanJob[]>([])
  const [pagination, setPagination] = useState<ScanJobsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [endpoints, setEndpoints] = useState<Map<string, InventoryOption>>(new Map())
  const [actioningId, setActioningId] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState<StatusTab>(
    (searchParams.get("status") as StatusTab) || "all"
  )
  const [page, setPage] = useState(parsePage(searchParams.get("page")))

  // Sync URL
  useEffect(() => {
    const p = new URLSearchParams()
    if (statusFilter !== "all") p.set("status", statusFilter)
    if (page > 1) p.set("page", String(page))
    const next = p.toString()
    const curr = searchParams.toString()
    if (next === curr) return
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
  }, [statusFilter, page, pathname, router, searchParams])

  useEffect(() => { setPage(1) }, [statusFilter])

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const q = new URLSearchParams({ page: String(page), limit: "20", sort_order: "desc" })
      if (statusFilter !== "all") q.set("status", statusFilter)
      const data = await apiFetch<ScanJobsResponse>(`/v1/scans?${q}`)
      setJobs(data.data || [])
      setPagination(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load scan jobs")
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  // Auto-refresh if any jobs are running or queued
  useEffect(() => {
    const hasActive = jobs.some(j => j.status === "running" || j.status === "queued")
    if (!hasActive) return
    const t = setTimeout(fetchJobs, 5000)
    return () => clearTimeout(t)
  }, [jobs, fetchJobs])

  // Load endpoint map
  useEffect(() => {
    apiFetch<{ data: InventoryOption[] }>("/inventory?limit=500")
      .then(r => setEndpoints(new Map((r.data || []).map(e => [e.ID, e]))))
      .catch(() => {})
  }, [])

  const cancelJob = async (id: string) => {
    setActioningId(id)
    try {
      await apiFetch(`/v1/scans/${id}/cancel`, { method: "POST" })
      await fetchJobs()
    } catch { } finally {
      setActioningId(null)
    }
  }

  const rerunJob = async (id: string) => {
    setActioningId(id)
    try {
      await apiFetch(`/v1/scans/${id}/rerun`, { method: "POST" })
      await fetchJobs()
    } catch { } finally {
      setActioningId(null)
    }
  }

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {}
    jobs.forEach(j => { c[j.status] = (c[j.status] || 0) + 1 })
    return c
  }, [jobs])

  const activeCount = jobs.filter(j => j.status === "running" || j.status === "queued").length

  const formatDate = (s?: string) => {
    if (!s) return "—"
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(s))
  }

  const methodColor = (m: string) => {
    switch (m?.toUpperCase()) {
      case "GET":    return "bg-blue-500/10 text-blue-400 border-blue-500/20"
      case "POST":   return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      case "DELETE": return "bg-rose-500/10 text-rose-400 border-rose-500/20"
      case "PUT": case "PATCH": return "bg-amber-500/10 text-amber-400 border-amber-500/20"
      default:       return "bg-slate-500/10 text-slate-400 border-slate-500/20"
    }
  }

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
              <BreadcrumbItem><BreadcrumbPage>Scan Jobs</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 p-5 pt-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Crosshair className="size-6 text-rose-400" />
              Scan Jobs
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              All scanner runs — monitor active, cancel queued, rerun past jobs.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {activeCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Radio className="size-3.5 text-amber-400 animate-pulse" />
                <span className="text-xs font-medium text-amber-400">{activeCount} active</span>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={fetchJobs} disabled={loading} className="glass-chip border-white/10">
              <RefreshCcw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button asChild size="sm" className="bg-rose-600 hover:bg-rose-500 text-white border-0 font-semibold">
              <Link href="/dashboard/scan"><Play className="size-4 mr-2" />New Scan</Link>
            </Button>
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map(tab => {
            const meta = STATUS_META[tab]
            const count = tab === "all" ? jobs.length : (statusCounts[tab] || 0)
            const isActive = statusFilter === tab
            return (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium border transition-all ${
                  isActive
                    ? (meta?.cls ?? "bg-white/10 text-slate-200 border-white/20") + " ring-1 ring-current/20"
                    : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-slate-300"
                }`}
              >
                {meta && <span className={`size-1.5 rounded-full ${meta.dot}`} />}
                {tab === "all" ? "All Jobs" : meta?.label ?? tab}
                {!loading && (
                  <span className="rounded-full px-1.5 py-0.5 text-xs bg-white/5">{count}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Jobs list */}
        {error ? (
          <div className="glass-chip rounded-xl flex flex-col items-center justify-center gap-3 py-16 text-center">
            <XCircle className="size-10 text-rose-400/40" />
            <p className="text-rose-400 font-medium">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchJobs} className="glass-chip border-white/10">Retry</Button>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl bg-white/5" />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="glass-chip rounded-xl flex flex-col items-center justify-center gap-3 py-20 text-center">
            <Crosshair className="size-14 text-slate-700" />
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
                const meta = STATUS_META[job.status] ?? STATUS_META.cancelled
                const endpoint = endpoints.get(job.inventory_id)
                const isActioning = actioningId === job.id
                const isActive = job.status === "running" || job.status === "queued"
                const canCancel = job.status === "running" || job.status === "queued"
                const canRerun = job.status === "completed" || job.status === "failed" || job.status === "cancelled" || job.status === "timed_out"

                return (
                  <div key={job.id} className={`flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors ${isActive ? "bg-amber-500/[0.02]" : ""}`}>
                    {/* Status indicator */}
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

                    {/* Main info */}
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
                      {endpoint ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link
                                href={`/dashboard/logs/${job.inventory_id}`}
                                className="inline-flex items-center gap-1.5 font-mono text-xs text-blue-400 hover:text-blue-300 transition-colors"
                              >
                                <Badge variant="outline" className={`text-xs font-bold ${methodColor(endpoint.Method)}`}>{endpoint.Method}</Badge>
                                <span className="truncate max-w-xs">{endpoint.PathPattern}</span>
                                <ExternalLink className="size-3 shrink-0" />
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs font-mono">{endpoint.BaseURL}{endpoint.PathPattern}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <p className="text-xs text-muted-foreground font-mono truncate">{job.inventory_id}</p>
                      )}
                      {job.error && (
                        <p className="text-xs text-rose-400 truncate">{job.error}</p>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="hidden lg:flex flex-col items-end gap-1 shrink-0 text-right">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3" />{formatDate(job.created_at)}
                      </p>
                      {duration(job) !== "—" && (
                        <p className="text-xs text-slate-500">Duration: {duration(job)}</p>
                      )}
                      {job.attempts > 1 && (
                        <p className="text-xs text-slate-600">{job.attempts} attempts</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {job.results_count > 0 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" asChild className="size-8 text-muted-foreground hover:text-slate-200">
                                <Link href={`/dashboard/results?job_id=${job.id}`}>
                                  <ShieldAlert className="size-4" />
                                </Link>
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
                              <Button
                                variant="ghost" size="icon"
                                className="size-8 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
                                disabled={isActioning}
                                onClick={() => cancelJob(job.id)}
                              >
                                {isActioning ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
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
                              <Button
                                variant="ghost" size="icon"
                                className="size-8 text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10"
                                disabled={isActioning}
                                onClick={() => rerunJob(job.id)}
                              >
                                {isActioning ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
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

        {/* Pagination */}
        {!loading && !error && pagination && pagination.total > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing <span className="text-slate-200 font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> – <span className="text-slate-200 font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-slate-200 font-medium">{pagination.total}</span> jobs
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
    </div>
  )
}
