"use client"
import React, { useEffect, useState } from "react"
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
import { RefreshCcw, Search, Server, ChevronLeft, ChevronRight, Clock } from "lucide-react"

interface ApiInventory {
  ID: string
  Method: string
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

interface PaginationInfo {
  total: number
  page: number
  limit: number
  total_pages: number
  offset: number
}

export default function LogsPage() {
  const [logs, setLogs] = useState<ApiInventory[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const limit = 10

  const fetchLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`http://localhost:8081/inventory?page=${currentPage}&limit=${limit}`)     
      if (!res.ok) {
        throw new Error("Failed to fetch inventory logs")
      }
      const responseData = await res.json()
      
      setLogs(responseData.data || [])
      setPagination({
        total: responseData.total,
        page: responseData.page,
        limit: responseData.limit,
        total_pages: responseData.total_pages,
        offset: responseData.offset,
      })
      
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching logs.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [currentPage])

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(date)
  }

  return (
    <div className="glass-page min-h-full">
      {/* Header*/}
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

      {/*Main*/}
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
                onClick={fetchLogs} 
                disabled={loading}
                className="glass-chip border-white/10"
              >
                <RefreshCcw className={`mr-2 size-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {error ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-rose-400">
                <p>{error}</p>
                <Button variant="link" onClick={fetchLogs} className="text-blue-400 mt-2">Try Again</Button>
              </div>
            ) : (
              <div className="relative overflow-x-auto px-4">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="w-25 rounded-l-lg bg-white/5">Method</TableHead>
                      <TableHead className="bg-white/5">Path Pattern</TableHead>
                      <TableHead className="bg-white/5">Base URL</TableHead>
                      <TableHead className="bg-white/5">Last Seen</TableHead>
                      <TableHead className="w-40 text-left rounded-r-lg bg-white/5">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i} className="border-white/5">
                          <TableCell><Skeleton className="h-6 w-16 bg-white/10" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-48 bg-white/10" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32 bg-white/10" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24 bg-white/10" /></TableCell>
                          <TableCell className="w-40 text-left"><Skeleton className="h-8 w-20 bg-white/10" /></TableCell>
                        </TableRow>
                      ))
                    ) : logs.length === 0 ? (
                      <TableRow className="border-white/5 hover:bg-transparent">
                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Search className="size-6 text-white/20" />
                            <p>No endpoints captured yet.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => (
                        <TableRow key={log.ID} className="border-white/5 hover:bg-white/5 transition-colors">
                          <TableCell className="font-medium">
                            <Badge variant="outline" className={getMethodColor(log.Method)}>
                              {log.Method}
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
                          <TableCell className="w-40 text-left">
                            <Button variant="ghost" size="sm" className="w-full justify-start px-0 hover:bg-white/10">
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {/*Pagination Controls*/}
            {!loading && !error && pagination && pagination.total > 0 && (
              <div className="flex items-center justify-between border-t border-white/5 p-4">
                <p className="text-sm text-muted-foreground">
                  Showing <span className="text-slate-200 font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="text-slate-200 font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-slate-200 font-medium">{pagination.total}</span> endpoints
                </p>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="glass-chip border-white/10"
                    disabled={pagination.page <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="size-4 mr-1" />
                    Previous
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="glass-chip border-white/10"
                    disabled={pagination.page >= pagination.total_pages}
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