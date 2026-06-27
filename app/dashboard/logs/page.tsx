"use client"
import React, { Suspense, useEffect, useState, useMemo } from "react"
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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RefreshCcw, Search, Server, ChevronLeft, ChevronRight, Clock, FilterX } from "lucide-react"
import Link from "next/link"
import { apiFetch } from "@/lib/api"

interface ApiInventory {
  ID: string
  Method: string
  RiskLevel: string
  BaseURL: string
  PathPattern: string
  OriginalPath: string
  SensitiveData: string[] | null
  SchemaReq: Record<string, string> | null
  SampleHeaders: Record<string, string[]> | null
  ParamValues: Record<string, string[]> | null
  SampleReqBody: string
  SampleRespBody: string
  CreatedAt: string
  UpdatedAt: string
}

interface InventoryResponse {
  data: ApiInventory[]
  total: number
  page: number
  limit: number
  total_pages: number
  offset: number
}

interface PaginationInfo {
  total: number
  page: number
  limit: number
  total_pages: number
  offset: number
}

const PAGE_SIZE_OPTIONS = ["10", "20", "50", "100"] as const
const METHOD_OPTIONS = ["ALL", "GET", "POST", "PUT", "DELETE", "PATCH"] as const
const RISK_OPTIONS = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"] as const

const parsePage = (value: string | null) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

const parseLimit = (value: string | null) => {
  return PAGE_SIZE_OPTIONS.includes((value || "") as (typeof PAGE_SIZE_OPTIONS)[number]) ? value! : "10"
}

const parseMethod = (value: string | null) => {
  return METHOD_OPTIONS.includes((value || "") as (typeof METHOD_OPTIONS)[number]) ? value! : "ALL"
}

const parseRisk = (value: string | null) => {
  return RISK_OPTIONS.includes((value || "") as (typeof RISK_OPTIONS)[number]) ? value! : "ALL"
}

export default function LogsPage() {
  return (
    <Suspense fallback={<div className="glass-page min-h-full" />}>
      <LogsPageContent />
    </Suspense>
  )
}

function LogsPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initialPage = useMemo(() => parsePage(searchParams.get("page")), [searchParams])
  const initialLimit = useMemo(() => parseLimit(searchParams.get("limit")), [searchParams])
  const initialPath = useMemo(() => searchParams.get("path") || "", [searchParams])
  const initialUrl = useMemo(() => searchParams.get("url") || "", [searchParams])
  const initialMethod = useMemo(() => parseMethod(searchParams.get("method")), [searchParams])
  const initialRisk = useMemo(() => parseRisk(searchParams.get("risk")), [searchParams])

  const [logs, setLogs] = useState<ApiInventory[]>([])
  const [allLogs, setAllLogs] = useState<ApiInventory[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [limit, setLimit] = useState(initialLimit)
  const [searchPath, setSearchPath] = useState(initialPath)
  const [searchUrl, setSearchUrl] = useState(initialUrl)
  const [methodFilter, setMethodFilter] = useState(initialMethod)
  const [riskFilter, setRiskFilter] = useState(initialRisk)
  const [debouncedPath, setDebouncedPath] = useState(initialPath)
  const [debouncedUrl, setDebouncedUrl] = useState(initialUrl)
  const hasActiveFilters = Boolean(
    debouncedPath || debouncedUrl || methodFilter !== "ALL" || riskFilter !== "ALL"
  )

  useEffect(() => {
    const params = new URLSearchParams()
    if (currentPage > 1) params.set("page", currentPage.toString())
    if (limit !== "10") params.set("limit", limit)
    if (searchPath.trim()) params.set("path", searchPath.trim())
    if (searchUrl.trim()) params.set("url", searchUrl.trim())
    if (methodFilter !== "ALL") params.set("method", methodFilter)
    if (riskFilter !== "ALL") params.set("risk", riskFilter)

    const nextQuery = params.toString()
    const currentQuery = searchParams.toString()
    if (nextQuery === currentQuery) return

    const target = nextQuery ? `${pathname}?${nextQuery}` : pathname
    router.replace(target, { scroll: false })
  }, [currentPage, limit, searchPath, searchUrl, methodFilter, riskFilter, pathname, router, searchParams])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPath(searchPath)
      setDebouncedUrl(searchUrl)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchPath, searchUrl])

  const fetchLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit,
      })

      const responseData = await apiFetch<InventoryResponse>(`/inventory?${queryParams.toString()}`)
      
      setLogs(responseData.data || [])
      setPagination({
        total: responseData.total,
        page: responseData.page,
        limit: responseData.limit,
        total_pages: responseData.total_pages,
        offset: responseData.offset,
      })
      
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred while fetching logs.")
    } finally {
      setLoading(false)
    }
  }

  const fetchAllLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const pageSize = 200
      let page = 1
      let totalPages = 1
      const aggregated: ApiInventory[] = []
      while (page <= totalPages) {
        const responseData = await apiFetch<InventoryResponse>(`/inventory?page=${page}&limit=${pageSize}`)
        aggregated.push(...(responseData.data || []))
        totalPages = responseData.total_pages || 1
        page += 1
      }
      setAllLogs(aggregated)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred while fetching logs.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!hasActiveFilters) {
      fetchLogs()
    }
  }, [currentPage, limit, hasActiveFilters])
  useEffect(() => {
    if (hasActiveFilters && allLogs.length === 0) {
      fetchAllLogs()
    }
  }, [hasActiveFilters, allLogs.length])
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedPath, debouncedUrl, methodFilter, riskFilter, limit])
  const filteredLogs = useMemo(() => {
    const sourceLogs = hasActiveFilters ? allLogs : logs
    return sourceLogs.filter(log => {
      const matchPath = log.PathPattern.toLowerCase().includes(debouncedPath.toLowerCase())
      const matchUrl = log.BaseURL.toLowerCase().includes(debouncedUrl.toLowerCase())
      const matchMethod = methodFilter === "ALL" || log.Method === methodFilter
      const matchRisk = riskFilter === "ALL" || (log.RiskLevel || "").toUpperCase() === riskFilter
      return matchPath && matchUrl && matchMethod && matchRisk
    })
  }, [hasActiveFilters, allLogs, logs, debouncedPath, debouncedUrl, methodFilter, riskFilter])
  const filteredPagination = useMemo<PaginationInfo>(() => {
    const pageSize = Number(limit)
    const total = filteredLogs.length
    const total_pages = Math.max(1, Math.ceil(total / pageSize))
    const page = Math.min(currentPage, total_pages)
    return {
      total,
      page,
      limit: pageSize,
      total_pages,
      offset: (page - 1) * pageSize,
    }
  }, [filteredLogs.length, currentPage, limit])

  const effectivePagination = hasActiveFilters ? filteredPagination : pagination
  const displayedLogs = useMemo(() => {
    if (!hasActiveFilters) {
      return filteredLogs
    }
    const start = (filteredPagination.page - 1) * filteredPagination.limit
    const end = start + filteredPagination.limit
    return filteredLogs.slice(start, end)
  }, [hasActiveFilters, filteredLogs, filteredPagination.page, filteredPagination.limit])

  useEffect(() => {
    if (!hasActiveFilters) return
    if (currentPage > filteredPagination.total_pages) {
      setCurrentPage(filteredPagination.total_pages)
    }
  }, [hasActiveFilters, currentPage, filteredPagination.total_pages])

  const clearFilters = () => {
    setSearchPath("")
    setSearchUrl("")
    setMethodFilter("ALL")
    setRiskFilter("ALL")
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET": return "bg-blue-500/10 text-blue-400 border-blue-500/20"
      case "POST": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      case "PUT": return "bg-amber-500/10 text-amber-400 border-amber-500/20"
      case "DELETE": return "bg-rose-500/10 text-rose-400 border-rose-500/20"
      case "PATCH": return "bg-purple-500/10 text-purple-400 border-purple-500/20"
      default: return "bg-slate-500/10 text-slate-400 border-slate-500/20"
    }
  }

  const getRiskColor = (risk: string) => {
    switch ((risk || "").toUpperCase()) {
      case "CRITICAL": return "bg-rose-500/10 text-rose-400 border-rose-500/20"
      case "HIGH": return "bg-orange-500/10 text-orange-400 border-orange-500/20"
      case "MEDIUM": return "bg-amber-500/10 text-amber-400 border-amber-500/20"
      case "LOW": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      default: return "bg-slate-500/10 text-slate-400 border-slate-500/20"
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(date)
  }

  return (
    <div className="glass-page min-h-full">
      {/* Header */}
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
                  <BreadcrumbLink href="/dashboard">Endpoints</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Logs</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Card className="glass-panel flex-1 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-4">
            <div className="space-y-1">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Server className="size-5 text-blue-400" />
                API Inventory Logs
              </CardTitle>
              <CardDescription>
                View and manage all captured endpoints discovered by Karaxys.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={hasActiveFilters ? fetchAllLogs : fetchLogs}
                disabled={loading}
                className="glass-chip border-white/10"
              >
                <RefreshCcw className={`mr-2 size-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>

          {/* Filters*/}
          <div className="flex flex-col sm:flex-row gap-3 p-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input 
                placeholder="Search endpoints (e.g. /api/users)..." 
                value={searchPath}
                onChange={(e) => setSearchPath(e.target.value)}
                className="pl-9 bg-black/20 border-white/10 text-slate-200 placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="flex-1">
              <Input 
                placeholder="Search target URL..." 
                value={searchUrl}
                onChange={(e) => setSearchUrl(e.target.value)}
                className="bg-black/20 border-white/10 text-slate-200 placeholder:text-muted-foreground/50"
              />
            </div>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-35 bg-black/20 border-white/10 text-slate-200">
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                <SelectItem value="ALL">All Methods</SelectItem>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
              </SelectContent>
            </Select>

            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-30 bg-black/20 border-white/10 text-slate-200">
                <SelectValue placeholder="Risk" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                <SelectItem value="ALL">All Risks</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
            {(searchPath || searchUrl || methodFilter !== "ALL" || riskFilter !== "ALL") && (
              <Button 
                variant="ghost" 
                onClick={clearFilters}
                className="text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
              >
                <FilterX className="size-4 mr-2" />
                Clear
              </Button>
            )}
          </div>

          <CardContent className="p-0 flex-1">
            {error ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-rose-400">
                <p>{error}</p>
                <Button variant="link" onClick={fetchLogs} className="text-blue-400 mt-2">Try Again</Button>
              </div>
            ) : (
              <div className="relative overflow-x-auto px-4 py-2">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="w-24 rounded-l-lg bg-white/5">Method</TableHead>
                      <TableHead className="w-28 bg-white/5">Risk</TableHead>
                      <TableHead className="bg-white/5">Path Pattern</TableHead>
                      <TableHead className="bg-white/5">Base URL</TableHead>
                      <TableHead className="bg-white/5">Last Seen</TableHead>
                      <TableHead className="w-40 pl-12 rounded-r-lg bg-white/5">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i} className="border-white/5">
                          <TableCell><Skeleton className="h-6 w-16 bg-white/10" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-20 bg-white/10" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-48 bg-white/10" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32 bg-white/10" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24 bg-white/10" /></TableCell>
                          <TableCell className="w-40 text-left"><Skeleton className="h-8 w-20 bg-white/10" /></TableCell>
                        </TableRow>
                      ))
                    ) : displayedLogs.length === 0 ? (
                      <TableRow className="border-white/5 hover:bg-transparent">
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Search className="size-6 text-white/20" />
                            <p>No endpoints found matching your filters.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayedLogs.map((log) => (
                        <TableRow key={log.ID} className="border-white/5 hover:bg-white/5 transition-colors">
                          <TableCell className="font-medium">
                            <Badge variant="outline" className={getMethodColor(log.Method)}>
                              {log.Method}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getRiskColor(log.RiskLevel)}>
                              {log.RiskLevel || "Unknown"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm text-slate-200">
                            {log.PathPattern}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {log.BaseURL}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            <div className="flex items-center gap-1.5">
                              <Clock className="size-3" />
                              {formatDate(log.UpdatedAt || log.CreatedAt)}
                            </div>
                          </TableCell>
                          <TableCell className="w-40">
                            <div className="flex justify-end pr-4">
                              <Button variant="ghost" size="sm" className="px-3 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300">
                                <Link
                                  href={
                                    searchParams.toString()
                                      ? `/dashboard/logs/${log.ID}?${searchParams.toString()}`
                                      : `/dashboard/logs/${log.ID}`
                                  }
                                  className="text-inherit"
                                >
                                  View Details
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {!loading && !error && effectivePagination && effectivePagination.total > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-white/5 p-4 gap-4">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Select value={limit} onValueChange={setLimit}>
                    <SelectTrigger className="w-20 h-8 bg-black/20 border-white/10 text-slate-200">
                      <SelectValue placeholder="10" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="hidden sm:inline">
                    Showing <span className="text-slate-200 font-medium">{(effectivePagination.page - 1) * effectivePagination.limit + 1}</span> to <span className="text-slate-200 font-medium">{Math.min(effectivePagination.page * effectivePagination.limit, effectivePagination.total)}</span> of <span className="text-slate-200 font-medium">{effectivePagination.total}</span> endpoints
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="glass-chip border-white/10"
                    disabled={effectivePagination.page <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="size-4 mr-1" />
                    Previous
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="glass-chip border-white/10"
                    disabled={effectivePagination.page >= effectivePagination.total_pages}
                    onClick={() => setCurrentPage(p => p + 1)}
                  >
                    Next
                    <ChevronRight className="size-4 ml-1" />
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
