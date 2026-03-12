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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FilterX,
  RefreshCcw,
  ShieldAlert,
  Target,
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
        return "bg-rose-500/10 text-rose-400 border-rose-500/20"
      case "high":
        return "bg-orange-500/10 text-orange-400 border-orange-500/20"
      case "medium":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20"
      case "low":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20"
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

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="glass-panel gap-3 py-4">
            <CardContent className="flex items-center justify-between px-4">
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Results On Page</p>
                <p className="text-xl font-semibold tracking-tight">{summary.total}</p>
                <p className="text-xs text-slate-400">Current response window</p>
              </div>
              <div className="glass-chip flex size-10 items-center justify-center rounded-xl">
                <Activity className="size-4 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel gap-3 py-4">
            <CardContent className="flex items-center justify-between px-4">
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Vulnerable Findings</p>
                <p className="text-xl font-semibold tracking-tight">{summary.vulnerable}</p>
                <p className="text-xs text-rose-400">Persisted in scan-results</p>
              </div>
              <div className="glass-chip flex size-10 items-center justify-center rounded-xl">
                <ShieldAlert className="size-4 text-rose-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel gap-3 py-4">
            <CardContent className="flex items-center justify-between px-4">
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Critical</p>
                <p className="text-xl font-semibold tracking-tight">{summary.critical}</p>
                <p className="text-xs text-rose-400">Highest severity on page</p>
              </div>
              <div className="glass-chip flex size-10 items-center justify-center rounded-xl">
                <Target className="size-4 text-amber-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel gap-3 py-4">
            <CardContent className="flex items-center justify-between px-4">
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">High</p>
                <p className="text-xl font-semibold tracking-tight">{summary.high}</p>
                <p className="text-xs text-orange-400">Needs quick remediation</p>
              </div>
              <div className="glass-chip flex size-10 items-center justify-center rounded-xl">
                <ShieldAlert className="size-4 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-panel flex-1">
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
            <div className="space-y-1">
              <CardTitle className="text-2xl">Persisted Scan Results</CardTitle>
              <CardDescription>
                Findings saved by the backend from the scan-results collection.
              </CardDescription>
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
          </CardHeader>

          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <Select
              value={inventoryId || ALL_ENDPOINTS}
              onValueChange={(value) => setInventoryId(value === ALL_ENDPOINTS ? "" : value)}
            >
              <SelectTrigger className="w-full sm:w-105 bg-black/20 border-white/10 text-slate-200">
                <SelectValue placeholder="Filter by endpoint" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-slate-200 max-h-75">
                <SelectItem value={ALL_ENDPOINTS}>All endpoints</SelectItem>
                {endpoints.map((endpoint) => (
                  <SelectItem key={endpoint.ID} value={endpoint.ID} className="font-mono text-xs">
                    <span className="mr-2 font-bold text-slate-300">{endpoint.Method}</span>
                    {endpoint.PathPattern}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {inventoryId && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
              >
                <FilterX className="mr-2 size-4" />
                Clear
              </Button>
            )}

            {selectedEndpoint && (
              <div className="text-xs text-muted-foreground sm:ml-auto">
                <span className="text-slate-200 font-mono">{selectedEndpoint.Method}</span>
                <span className="mx-2">•</span>
                <span>{selectedEndpoint.BaseURL}{selectedEndpoint.PathPattern}</span>
              </div>
            )}
          </div>

          <CardContent className="flex flex-1 flex-col gap-4 p-0">
            {error ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-rose-400">
                <p>{error}</p>
                <Button variant="link" onClick={fetchResults} className="mt-2 text-blue-400">
                  Try Again
                </Button>
              </div>
            ) : (
              <div className="px-4 pb-2">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="bg-white/5 rounded-l-lg">Severity</TableHead>
                      <TableHead className="bg-white/5">Test</TableHead>
                      <TableHead className="bg-white/5">Endpoint</TableHead>
                      <TableHead className="bg-white/5">Status</TableHead>
                      <TableHead className="bg-white/5">Recorded</TableHead>
                      <TableHead className="bg-white/5 rounded-r-lg">Evidence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={index} className="border-white/5">
                          <TableCell><Skeleton className="h-6 w-20 bg-white/10" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-28 bg-white/10" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-60 bg-white/10" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-14 bg-white/10" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24 bg-white/10" /></TableCell>
                          <TableCell><Skeleton className="h-20 w-full bg-white/10" /></TableCell>
                        </TableRow>
                      ))
                    ) : results.length === 0 ? (
                      <TableRow className="border-white/5 hover:bg-transparent">
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                          No persisted scan results found for the selected filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      results.map((result, index) => {
                        const endpoint = endpointMap.get(result.inventoryId)
                        const detailsHref = result.inventoryId
                          ? `/dashboard/logs/${result.inventoryId}`
                          : ""

                        return (
                          <TableRow key={result.id || `${result.inventoryId}-${index}`} className="border-white/5 align-top">
                            <TableCell>
                              <Badge variant="outline" className={getSeverityColor(result.severity)}>
                                {result.severity.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium text-slate-200">{result.testType}</p>
                                <p className={`text-xs ${result.vulnerable ? "text-rose-400" : "text-emerald-400"}`}>
                                  {result.vulnerable ? "Vulnerable" : "No vulnerability detected"}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {endpoint ? (
                                <div className="space-y-1">
                                  <p className="font-mono text-xs text-slate-200">
                                    {endpoint.Method} {endpoint.PathPattern}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{endpoint.BaseURL}</p>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <p className="font-mono text-xs text-slate-200">Inventory ID: {result.inventoryId || "Unknown"}</p>
                                  <p className="text-xs text-muted-foreground">Endpoint details unavailable</p>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-slate-300">{result.responseStatus || "-"}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{formatDate(result.createdAt)}</TableCell>
                            <TableCell>
                              <div className="space-y-3">
                                <p className="text-sm text-slate-300 whitespace-pre-wrap wrap-break-word">
                                  {result.description}
                                </p>
                                {result.proof && (
                                  <ScrollArea className="h-20 rounded-md border border-white/10 bg-black/30 px-3 py-2">
                                    <pre className="font-mono text-xs whitespace-pre-wrap break-all text-blue-300">
                                      {result.proof}
                                    </pre>
                                  </ScrollArea>
                                )}
                                {result.responseBody && (
                                  <ScrollArea className="h-24 rounded-md border border-white/10 bg-black/30 px-3 py-2">
                                    <pre className="font-mono text-xs whitespace-pre-wrap break-all text-emerald-300">
                                      {result.responseBody}
                                    </pre>
                                  </ScrollArea>
                                )}
                                {detailsHref && (
                                  <Button variant="ghost" size="sm" asChild className="px-0 text-amber-400 hover:bg-transparent hover:text-amber-300">
                                    <Link href={detailsHref}>
                                      Endpoint details
                                      <ExternalLink className="ml-1 size-4" />
                                    </Link>
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {!loading && !error && pagination && pagination.total > 0 && (
              <div className="flex flex-col items-center justify-between gap-4 border-t border-white/5 p-4 sm:flex-row">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Select value={limit} onValueChange={setLimit}>
                    <SelectTrigger className="h-8 w-20 bg-black/20 border-white/10 text-slate-200">
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
                    Showing <span className="font-medium text-slate-200">{pagination.offset + 1}</span> to <span className="font-medium text-slate-200">{Math.min(pagination.offset + pagination.limit, pagination.total)}</span> of <span className="font-medium text-slate-200">{pagination.total}</span> results
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}