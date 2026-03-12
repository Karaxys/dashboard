"use client"

import React, { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  AlertTriangle,
  Bug,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Code2,
  Copy,
  Check,
  ExternalLink,
  FilterX,
  Globe,
  RefreshCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Terminal,
} from "lucide-react"
import Link from "next/link"

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

type RawScanResult = Record<string, unknown>

const PAGE_SIZE_OPTIONS = ["10", "20", "50", "100"] as const
const ALL_ENDPOINTS = "ALL_ENDPOINTS"

const parsePage = (value: string | null) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

const parseLimit = (value: string | null) => {
  return PAGE_SIZE_OPTIONS.includes((value || "") as (typeof PAGE_SIZE_OPTIONS)[number]) ? value! : "10"
}

const normalizeObjectId = (value: unknown) => {
  if (!value) return ""
  if (typeof value === "string") return value
  if (typeof value === "object" && value !== null) {
    const objectId = (value as { $oid?: string }).$oid
    if (typeof objectId === "string") return objectId
  }
  return ""
}

const normalizeDate = (value: unknown) => {
  if (!value) return ""
  if (typeof value === "string") return value
  if (typeof value === "object" && value !== null) {
    const rawDate = (value as { $date?: string }).$date
    if (typeof rawDate === "string") return rawDate
  }
  return ""
}

const normalizeScanResult = (result: RawScanResult): ScanResultRecord => ({
  id: normalizeObjectId(result._id) || String(result.ID || result.id || ""),
  inventoryId: normalizeObjectId(result.inventory_id) || normalizeObjectId(result.InventoryID) || "",
  testType: String(result.test_type || result.TestType || "Unknown"),
  vulnerable: Boolean(result.vulnerable ?? result.Vulnerable),
  severity: String(result.severity || result.Severity || "unknown"),
  description: String(result.description || result.Description || "No description provided."),
  proof: String(result.proof || result.Proof || ""),
  responseStatus: Number(result.response_status ?? result.ResponseStatus ?? 0),
  responseBody: String(result.response_body || result.ResponseBody || ""),
  createdAt: normalizeDate(result.created_at) || normalizeDate(result.CreatedAt),
})

export default function ResultsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initialPage = useMemo(() => parsePage(searchParams.get("page")), [searchParams])
  const initialLimit = useMemo(() => parseLimit(searchParams.get("limit")), [searchParams])
  const initialInventoryId = useMemo(() => searchParams.get("inventory_id") || "", [searchParams])

  const [results, setResults] = useState<ScanResultRecord[]>([])
  const [endpoints, setEndpoints] = useState<InventoryOption[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [limit, setLimit] = useState(initialLimit)
  const [inventoryId, setInventoryId] = useState(initialInventoryId)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams()
    if (currentPage > 1) params.set("page", currentPage.toString())
    if (limit !== "10") params.set("limit", limit)
    if (inventoryId) params.set("inventory_id", inventoryId)

    const nextQuery = params.toString()
    const currentQuery = searchParams.toString()
    if (nextQuery === currentQuery) return

    const target = nextQuery ? `${pathname}?${nextQuery}` : pathname
    router.replace(target, { scroll: false })
  }, [currentPage, inventoryId, limit, pathname, router, searchParams])

  useEffect(() => {
    setCurrentPage(1)
  }, [inventoryId, limit])

  useEffect(() => {
    const fetchEndpoints = async () => {
      try {
        const res = await fetch("http://localhost:8081/inventory?limit=500")
        if (!res.ok) return
        const data = await res.json()
        setEndpoints(data.data || [])
      } catch (fetchError) {
        console.error("Failed to fetch endpoints for results page", fetchError)
      }
    }

    fetchEndpoints()
  }, [])

  const fetchResults = async () => {
    setLoading(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit,
      })

      if (inventoryId) {
        queryParams.set("inventory_id", inventoryId)
      }

      const res = await fetch(`http://localhost:8081/scan-results?${queryParams.toString()}`)
      if (!res.ok) {
        throw new Error("Failed to fetch scan results")
      }

      const responseData = await res.json()
      const normalizedResults = Array.isArray(responseData.data)
        ? responseData.data.map((item: RawScanResult) => normalizeScanResult(item))
        : []

      setResults(normalizedResults)
      setPagination({
        total: responseData.total || 0,
        page: responseData.page || currentPage,
        limit: responseData.limit || Number(limit),
        total_pages: responseData.total_pages || 1,
        offset: responseData.offset || 0,
      })
    } catch (fetchError: unknown) {
      const message = fetchError instanceof Error ? fetchError.message : "An error occurred while fetching scan results."
      setError(message)
      setResults([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResults()
  }, [currentPage, inventoryId, limit])

  const endpointMap = useMemo(
    () => new Map(endpoints.map((endpoint) => [endpoint.ID, endpoint])),
    [endpoints]
  )

  const selectedEndpoint = inventoryId ? endpointMap.get(inventoryId) : null

  const summary = useMemo(() => {
    return results.reduce(
      (acc, result) => {
        acc.total += 1
        if (result.vulnerable) acc.vulnerable += 1
        if (result.severity.toLowerCase() === "critical") acc.critical += 1
        if (result.severity.toLowerCase() === "high") acc.high += 1
        return acc
      },
      { total: 0, vulnerable: 0, critical: 0, high: 0 }
    )
  }, [results])

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-rose-500/15 text-rose-400 border-rose-500/30"
      case "high":
        return "bg-orange-500/15 text-orange-400 border-orange-500/30"
      case "medium":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30"
      case "low":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      default:
        return "bg-slate-500/15 text-slate-400 border-slate-500/30"
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return <ShieldX className="size-4" />
      case "high":
        return <ShieldAlert className="size-4" />
      case "medium":
        return <AlertTriangle className="size-4" />
      case "low":
        return <Shield className="size-4" />
      default:
        return <Shield className="size-4" />
    }
  }

  const getMethodColor = (method: string) => {
    switch (method?.toUpperCase()) {
      case "GET": return "text-blue-400"
      case "POST": return "text-emerald-400"
      case "PUT": return "text-amber-400"
      case "DELETE": return "text-rose-400"
      case "PATCH": return "text-purple-400"
      default: return "text-slate-400"
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown"
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return "Unknown"
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const clearFilters = () => {
    setInventoryId("")
  }

  const [copiedId, setCopiedId] = useState<string | null>(null)
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

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
                  <BreadcrumbPage>Results</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 p-5 pt-0">
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="glass-panel border-white/10 py-4">
            <CardContent className="flex items-center gap-4 px-5">
              <div className="flex size-12 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
                <Bug className="size-5 text-blue-400" />
              </div>
              <div className="space-y-0.5">
                <p className="text-2xl font-bold tracking-tight">{summary.total}</p>
                <p className="text-xs text-muted-foreground">Total Findings</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-white/10 py-4">
            <CardContent className="flex items-center gap-4 px-5">
              <div className="flex size-12 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20">
                <ShieldX className="size-5 text-rose-400" />
              </div>
              <div className="space-y-0.5">
                <p className="text-2xl font-bold tracking-tight text-rose-400">{summary.vulnerable}</p>
                <p className="text-xs text-muted-foreground">Vulnerable</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-white/10 py-4">
            <CardContent className="flex items-center gap-4 px-5">
              <div className="flex size-12 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20">
                <ShieldAlert className="size-5 text-rose-400" />
              </div>
              <div className="space-y-0.5">
                <p className="text-2xl font-bold tracking-tight">{summary.critical}</p>
                <p className="text-xs text-muted-foreground">Critical Severity</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-white/10 py-4">
            <CardContent className="flex items-center gap-4 px-5">
              <div className="flex size-12 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/20">
                <AlertTriangle className="size-5 text-orange-400" />
              </div>
              <div className="space-y-0.5">
                <p className="text-2xl font-bold tracking-tight">{summary.high}</p>
                <p className="text-xs text-muted-foreground">High Severity</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <Select
              value={inventoryId || ALL_ENDPOINTS}
              onValueChange={(value) => setInventoryId(value === ALL_ENDPOINTS ? "" : value)}
            >
              <SelectTrigger className="w-full sm:w-80 bg-black/30 border-white/10 text-slate-200">
                <Globe className="mr-2 size-4 text-muted-foreground" />
                <SelectValue placeholder="Filter by endpoint" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-slate-200 max-h-80">
                <SelectItem value={ALL_ENDPOINTS}>All endpoints</SelectItem>
                {endpoints.map((endpoint) => (
                  <SelectItem key={endpoint.ID} value={endpoint.ID} className="font-mono text-xs">
                    <span className={`mr-2 font-bold ${getMethodColor(endpoint.Method)}`}>{endpoint.Method}</span>
                    {endpoint.PathPattern}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {inventoryId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
              >
                <FilterX className="mr-2 size-4" />
                Clear
              </Button>
            )}

            {selectedEndpoint && (
              <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                <span className={`font-mono font-bold ${getMethodColor(selectedEndpoint.Method)}`}>{selectedEndpoint.Method}</span>
                <span className="text-slate-400">{selectedEndpoint.BaseURL}{selectedEndpoint.PathPattern}</span>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchResults}
            disabled={loading}
            className="glass-chip border-white/10"
          >
            <RefreshCcw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Results List */}
        <div className="flex flex-col gap-4">
          {error ? (
            <Card className="glass-panel border-rose-500/20">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <ShieldX className="size-12 text-rose-400/50 mb-4" />
                <p className="text-rose-400 mb-2">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchResults} className="mt-2">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} className="glass-panel border-white/10">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <Skeleton className="size-10 rounded-lg bg-white/10" />
                      <div className="flex-1 space-y-3">
                        <Skeleton className="h-5 w-48 bg-white/10" />
                        <Skeleton className="h-4 w-full bg-white/10" />
                        <Skeleton className="h-24 w-full bg-white/10 rounded-lg" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : results.length === 0 ? (
            <Card className="glass-panel border-white/10">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <ShieldCheck className="size-16 text-emerald-400/30 mb-4" />
                <p className="text-xl font-semibold text-slate-200 mb-2">No Findings</p>
                <p className="text-sm text-muted-foreground max-w-md">
                  No scan results found for the selected filter. Run a vulnerability scan to populate this view.
                </p>
                <Button variant="outline" size="sm" asChild className="mt-6 glass-chip border-white/10">
                  <Link href="/dashboard/scan">
                    Go to Scanner
                    <ExternalLink className="ml-2 size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            results.map((result, index) => {
              const endpoint = endpointMap.get(result.inventoryId)
              const detailsHref = result.inventoryId ? `/dashboard/logs/${result.inventoryId}` : ""
              const resultKey = result.id || `${result.inventoryId}-${index}`

              return (
                <Card
                  key={resultKey}
                  className={`glass-panel border-l-4 transition-all hover:bg-white/2 ${
                    result.severity.toLowerCase() === "critical" ? "border-l-rose-500" :
                    result.severity.toLowerCase() === "high" ? "border-l-orange-500" :
                    result.severity.toLowerCase() === "medium" ? "border-l-amber-500" :
                    "border-l-emerald-500"
                  }`}
                >
                  <CardContent className="p-0">
                    {/* Header */}
                    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg border ${getSeverityColor(result.severity)}`}>
                          {getSeverityIcon(result.severity)}
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-slate-100">{result.testType.replace(/_/g, " ")}</h3>
                            <Badge variant="outline" className={`text-xs ${getSeverityColor(result.severity)}`}>
                              {result.severity.toUpperCase()}
                            </Badge>
                            {result.vulnerable ? (
                              <Badge variant="outline" className="text-xs bg-rose-500/10 text-rose-400 border-rose-500/30">
                                <ShieldX className="mr-1 size-3" />
                                Vulnerable
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                                <ShieldCheck className="mr-1 size-3" />
                                Secure
                              </Badge>
                            )}
                          </div>
                          {endpoint ? (
                            <div className="flex items-center gap-2 text-sm">
                              <span className={`font-mono font-bold ${getMethodColor(endpoint.Method)}`}>{endpoint.Method}</span>
                              <span className="font-mono text-slate-300">{endpoint.PathPattern}</span>
                              <span className="text-muted-foreground hidden sm:inline">• {endpoint.BaseURL}</span>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground font-mono">ID: {result.inventoryId || "Unknown"}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground sm:flex-col sm:items-end sm:gap-1">
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3" />
                          {formatDate(result.createdAt)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Code2 className="size-3" />
                          Status: {result.responseStatus || "-"}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="px-5 pb-4">
                      <p className="text-sm text-slate-300 leading-relaxed">{result.description}</p>
                    </div>

                    {/* Evidence Section */}
                    {(result.proof || result.responseBody) && (
                      <div className="border-t border-white/5">
                        <Collapsible>
                          <CollapsibleTrigger asChild>
                            <button className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-white/2 transition-colors">
                              <div className="flex items-center gap-2">
                                <Terminal className="size-4" />
                                View Evidence
                              </div>
                              <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="space-y-4 px-5 pb-5">
                              {result.proof && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">cURL Proof of Concept</p>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyToClipboard(result.proof, `proof-${resultKey}`)}
                                      className="h-7 px-2 text-xs text-muted-foreground hover:text-slate-200"
                                    >
                                      {copiedId === `proof-${resultKey}` ? (
                                        <><Check className="mr-1 size-3 text-emerald-400" /> Copied</>
                                      ) : (
                                        <><Copy className="mr-1 size-3" /> Copy</>
                                      )}
                                    </Button>
                                  </div>
                                  <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black/40">
                                    <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-blue-300 whitespace-pre-wrap break-all">
                                      {result.proof}
                                    </pre>
                                  </div>
                                </div>
                              )}

                              {result.responseBody && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Response Body</p>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyToClipboard(result.responseBody, `response-${resultKey}`)}
                                      className="h-7 px-2 text-xs text-muted-foreground hover:text-slate-200"
                                    >
                                      {copiedId === `response-${resultKey}` ? (
                                        <><Check className="mr-1 size-3 text-emerald-400" /> Copied</>
                                      ) : (
                                        <><Copy className="mr-1 size-3" /> Copy</>
                                      )}
                                    </Button>
                                  </div>
                                  <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black/40 max-h-48">
                                    <pre className="overflow-auto p-4 font-mono text-xs leading-relaxed text-emerald-300 whitespace-pre-wrap break-all max-h-48">
                                      {result.responseBody}
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    )}

                    {/* Footer Actions */}
                    {detailsHref && (
                      <div className="flex items-center justify-end gap-2 border-t border-white/5 px-5 py-3">
                        <Button variant="ghost" size="sm" asChild className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10">
                          <Link href={detailsHref}>
                            View Endpoint Details
                            <ExternalLink className="ml-2 size-4" />
                          </Link>
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
        {!loading && !error && pagination && pagination.total > 0 && (
          <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-white/5 bg-black/20 p-4 sm:flex-row">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Select value={limit} onValueChange={setLimit}>
                <SelectTrigger className="h-8 w-20 bg-black/30 border-white/10 text-slate-200">
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span>
                Showing <span className="font-medium text-slate-200">{pagination.offset + 1}</span> to{" "}
                <span className="font-medium text-slate-200">{Math.min(pagination.offset + pagination.limit, pagination.total)}</span> of{" "}
                <span className="font-medium text-slate-200">{pagination.total}</span> results
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="glass-chip border-white/10"
                disabled={pagination.page <= 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                <ChevronLeft className="mr-1 size-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1 px-2">
                <span className="text-sm text-muted-foreground">Page</span>
                <span className="font-medium text-slate-200">{pagination.page}</span>
                <span className="text-sm text-muted-foreground">of {pagination.total_pages}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="glass-chip border-white/10"
                disabled={pagination.page >= pagination.total_pages}
                onClick={() => setCurrentPage((page) => page + 1)}
              >
                Next
                <ChevronRight className="ml-1 size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}