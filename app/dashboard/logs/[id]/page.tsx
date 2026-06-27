"use client"
import React, { Suspense, useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowLeft, Activity, ShieldAlert, Database, Globe,
  Clock, Braces, KeyRound, Lock, Fingerprint, CreditCard,
  FileText, User, Shield, Tag, Radio, Cpu, CheckCircle2,
  XCircle, AlertCircle, Info, BarChart3, Crosshair,
} from "lucide-react"
import { apiFetch } from "@/lib/api"

interface ApiInventoryDetail {
  ID?: string
  _id?: { $oid: string }
  Method: string
  BaseURL: string
  PathPattern: string
  OriginalPath: string
  RiskLevel: string
  CaptureSource?: string
  CaptureMode?: string
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
  FirstSeenAt?: string
  LastSeenAt?: string
  CreatedAt: string | { $date: string }
  UpdatedAt: string | { $date: string }
}

interface Issue {
  id: string
  test_type: string
  severity: string
  status: string
  title: string
  description?: string
  evidence_summary?: string
  first_seen_at: string
  last_seen_at: string
}

interface IssuesResponse {
  data: Issue[]
  total: number
}

interface ScanResultRaw {
  _id?: { $oid?: string }
  id?: string
  test_type?: string
  TestType?: string
  vulnerable?: boolean
  severity?: string
  description?: string
  proof?: string
  response_status?: number
  created_at?: string | { $date?: string }
}

interface ScanResultRecord {
  id: string
  test_type: string
  vulnerable: boolean
  severity: string
  description: string
  proof: string
  response_status: number
  created_at: string
}

interface ScanResultsResponse {
  data: ScanResultRaw[]
  total: number
}

export default function LogDetailsPage() {
  return (
    <Suspense fallback={<div className="glass-page min-h-full" />}>
      <LogDetailsPageContent />
    </Suspense>
  )
}

function LogDetailsPageContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = params.id as string
  const listQuery = searchParams.toString()
  const logsHref = listQuery ? `/dashboard/logs?${listQuery}` : "/dashboard/logs"

  const [log, setLog] = useState<ApiInventoryDetail | null>(null)
  const [issues, setIssues] = useState<Issue[]>([])
  const [scanResults, setScanResults] = useState<ScanResultRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        const data = await apiFetch<ApiInventoryDetail>(`/inventory/${id}`)
        setLog(data)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  useEffect(() => {
    if (!id) return
    apiFetch<IssuesResponse>(`/v1/issues?inventory_id=${id}&limit=50`)
      .then(r => setIssues(r.data || []))
      .catch(() => {})
  }, [id])

  useEffect(() => {
    if (!id) return
    apiFetch<ScanResultsResponse>(`/scan-results?inventory_id=${id}&limit=50`)
      .then(r => {
        const norm: ScanResultRecord[] = (r.data || []).map((raw) => ({
          id: (raw._id?.$oid) || raw.id || "",
          test_type: raw.test_type || raw.TestType || "Unknown",
          vulnerable: Boolean(raw.vulnerable),
          severity: raw.severity || "unknown",
          description: raw.description || "",
          proof: raw.proof || "",
          response_status: raw.response_status || 0,
          created_at: typeof raw.created_at === "string"
            ? raw.created_at
            : raw.created_at?.$date || "",
        }))
        setScanResults(norm)
      })
      .catch(() => {})
  }, [id])

  const getRiskColor = (risk: string) => {
    switch ((risk || "").toUpperCase()) {
      case "CRITICAL": return "bg-rose-500/10 text-rose-400 border-rose-500/20"
      case "HIGH":     return "bg-orange-500/10 text-orange-400 border-orange-500/20"
      case "MEDIUM":   return "bg-amber-500/10 text-amber-400 border-amber-500/20"
      case "LOW":      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      default:         return "bg-slate-500/10 text-slate-400 border-slate-500/20"
    }
  }

  const getMethodColor = (method: string) => {
    switch (method?.toUpperCase()) {
      case "GET":    return "bg-blue-500/10 text-blue-400 border-blue-500/20"
      case "POST":   return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      case "PUT":    return "bg-amber-500/10 text-amber-400 border-amber-500/20"
      case "DELETE": return "bg-rose-500/10 text-rose-400 border-rose-500/20"
      case "PATCH":  return "bg-purple-500/10 text-purple-400 border-purple-500/20"
      default:       return "bg-slate-500/10 text-slate-400 border-slate-500/20"
    }
  }

  const getSeverityColor = (sev: string) => {
    switch (sev?.toLowerCase()) {
      case "critical": return "bg-rose-500/10 text-rose-400 border-rose-500/20"
      case "high":     return "bg-orange-500/10 text-orange-400 border-orange-500/20"
      case "medium":   return "bg-amber-500/10 text-amber-400 border-amber-500/20"
      case "low":      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      default:         return "bg-slate-500/10 text-slate-400 border-slate-500/20"
    }
  }

  const getStatusColor = (code: number) => {
    if (code >= 500) return "text-rose-400 bg-rose-500/10 border-rose-500/20"
    if (code >= 400) return "text-orange-400 bg-orange-500/10 border-orange-500/20"
    if (code >= 300) return "text-amber-400 bg-amber-500/10 border-amber-500/20"
    return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
  }

  const parseDate = (dateObj: string | { $date: string } | null | undefined) => {
    if (!dateObj) return "Unknown"
    const dateStr = typeof dateObj === "string" ? dateObj : dateObj.$date
    return new Intl.DateTimeFormat("en-US", {
      month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
    }).format(new Date(dateStr))
  }

  const formatJSON = (str: string) => {
    if (!str) return "No content"
    try { return JSON.stringify(JSON.parse(str), null, 2) }
    catch { return str }
  }

  const getSensitivityData = (tag: string) => {
    const t = tag.toUpperCase()
    let val = 25; let color = "bg-slate-500"; let Icon = Lock
    if (["PASSWORD", "AUTH_TOKEN_BEARER", "AWS_KEY"].includes(t)) { val = 100; Icon = KeyRound }
    else if (t === "JWT_TOKEN") { val = 95; Icon = KeyRound }
    else if (["VISA_CARD", "MASTER_CARD"].includes(t)) { val = 90; Icon = CreditCard }
    else if (t === "CREDIT_CARD") { val = 85; Icon = CreditCard }
    else if (t === "IBAN_CODE") { val = 75; Icon = CreditCard }
    else if (t === "SWIFT_CODE") { val = 70; Icon = CreditCard }
    else if (["US_SSN", "INDIAN_AADHAR"].includes(t)) { val = 90; Icon = Fingerprint }
    else if (t === "CANADIAN_SIN") { val = 85; Icon = Fingerprint }
    else if (t === "FINNISH_PIN") { val = 80; Icon = Fingerprint }
    else if (["INDIAN_PAN", "PASSPORT_NO", "GERMAN_INSURANCE_ID", "INDIAN_HEALTH_ID"].includes(t)) { val = 75; Icon = FileText }
    else if (["DRIVERS_LICENSE", "US_MEDICARE"].includes(t)) { val = 70; Icon = FileText }
    else if (t === "DATE_OF_BIRTH") { val = 45; Icon = User }
    else if (["ADDRESS", "STREET_ADDRESS"].includes(t)) { val = 40; Icon = User }
    else if (["EMAIL", "PHONE_NUMBER"].includes(t)) { val = 35; Icon = User }
    else if (["FULL_NAME", "PERSON_NAME", "USERNAME", "USER_ID"].includes(t)) { val = 30; Icon = User }
    if (val >= 85) color = "bg-rose-500"
    else if (val >= 70) color = "bg-orange-500"
    else if (val >= 40) color = "bg-amber-500"
    else if (val >= 30) color = "bg-emerald-500"
    return { val, color, icon: Icon }
  }

  const tabTriggerClass = "cursor-pointer rounded-none border-0 bg-transparent px-0 py-0 text-sm text-white shadow-none transition-colors hover:text-amber-400 after:bg-amber-400 data-[state=active]:bg-transparent data-[state=active]:text-amber-400 data-[state=active]:shadow-none"

  if (loading) {
    return (
      <div className="glass-page min-h-full p-6 space-y-4">
        <Skeleton className="h-8 w-48 bg-white/10" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 bg-white/10 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 bg-white/10 rounded-xl" />
      </div>
    )
  }

  if (error || !log) {
    return <div className="p-8 text-rose-400">Error: {error || "Endpoint not found"}</div>
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
                  <BreadcrumbLink href={logsHref}>Inventory</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-mono text-xs">{log.PathPattern}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 p-5 pt-0">
        {/* Title row */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push(logsHref)} className="glass-chip border-white/10 shrink-0">
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex flex-1 items-start justify-between gap-4 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className={`font-mono px-3 py-1 text-sm ${getMethodColor(log.Method)}`}>
                  {log.Method}
                </Badge>
                <h1 className="font-mono text-lg font-bold text-slate-100 truncate">{log.PathPattern}</h1>
              </div>
              <p className="text-muted-foreground text-xs mt-1">{log.BaseURL}</p>
            </div>
            <Badge variant="outline" className={`shrink-0 px-3 py-1.5 text-sm font-semibold ${getRiskColor(log.RiskLevel)}`}>
              {log.RiskLevel || "UNKNOWN"}
            </Badge>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="glass-panel p-4 space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Shield className="size-3 text-blue-400" /> Auth Status
            </p>
            <p className={`text-lg font-semibold ${log.AuthObserved ? "text-emerald-400" : "text-slate-400"}`}>
              {log.AuthObserved ? "Authenticated" : "Unauthenticated"}
            </p>
          </Card>
          <Card className="glass-panel p-4 space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Radio className="size-3 text-purple-400" /> Capture Source
            </p>
            <p className="text-lg font-semibold text-slate-200">{log.CaptureSource || "—"}</p>
          </Card>
          <Card className="glass-panel p-4 space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Activity className="size-3 text-amber-400" /> Requests
            </p>
            <p className="text-lg font-semibold text-slate-200">
              {log.RequestCount != null ? log.RequestCount.toLocaleString() : "—"}
            </p>
          </Card>
          <Card className="glass-panel p-4 space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Database className="size-3 text-rose-400" /> Sensitive Data
            </p>
            <p className="text-lg font-semibold text-slate-200">{log.SensitiveData?.length || 0} types</p>
          </Card>
        </div>

        {/* Main tabbed panel */}
        <Card className="glass-panel flex-1 flex flex-col">
          <Tabs defaultValue="overview" className="flex flex-col flex-1">
            <div className="px-5 pt-4 border-b border-white/5">
              <TabsList variant="line" className="h-auto gap-6 rounded-none border-0 bg-transparent p-0">
                <TabsTrigger value="overview" className={tabTriggerClass}>Overview</TabsTrigger>
                <TabsTrigger value="schema" className={tabTriggerClass}>Schema</TabsTrigger>
                <TabsTrigger value="samples" className={tabTriggerClass}>Samples</TabsTrigger>
                <TabsTrigger value="findings" className={tabTriggerClass}>
                  Findings
                  {issues.length > 0 && (
                    <span className="ml-1.5 text-xs bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-full px-1.5 py-0.5">
                      {issues.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="scans" className={tabTriggerClass}>
                  Scans
                  {scanResults.length > 0 && (
                    <span className="ml-1.5 text-xs bg-slate-500/20 text-slate-400 border border-white/10 rounded-full px-1.5 py-0.5">
                      {scanResults.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* OVERVIEW */}
            <TabsContent value="overview" className="m-0 flex-1 p-5">
              <div className="grid gap-5 xl:grid-cols-2">
                {/* Left col */}
                <div className="space-y-5">
                  {/* Risk reasons */}
                  {log.RiskReasons && log.RiskReasons.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <ShieldAlert className="size-3" /> Risk Reasons
                      </p>
                      <div className="space-y-1.5">
                        {log.RiskReasons.map((r, i) => (
                          <div key={i} className="flex items-start gap-2 glass-chip rounded-lg px-3 py-2 text-sm">
                            <AlertCircle className="size-3.5 text-amber-400 mt-0.5 shrink-0" />
                            <span className="text-slate-300">{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {log.Tags && log.Tags.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Tag className="size-3" /> Tags
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {log.Tags.map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/20">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status codes & content types */}
                  <div className="grid grid-cols-2 gap-4">
                    {log.StatusCodes && log.StatusCodes.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status Codes</p>
                        <div className="flex flex-wrap gap-1.5">
                          {log.StatusCodes.map((code, i) => (
                            <Badge key={i} variant="outline" className={`font-mono text-xs ${getStatusColor(code)}`}>
                              {code}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {log.ContentTypes && log.ContentTypes.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Content Types</p>
                        <div className="flex flex-wrap gap-1.5">
                          {log.ContentTypes.map((ct, i) => (
                            <Badge key={i} variant="outline" className="text-xs bg-slate-500/10 text-slate-400 border-slate-500/20 font-mono">
                              {ct}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Timestamps */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="glass-chip rounded-lg px-3 py-3 space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="size-3" /> First Seen
                      </p>
                      <p className="text-sm font-medium text-slate-200">
                        {log.FirstSeenAt ? parseDate(log.FirstSeenAt) : parseDate(log.CreatedAt)}
                      </p>
                    </div>
                    <div className="glass-chip rounded-lg px-3 py-3 space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="size-3" /> Last Seen
                      </p>
                      <p className="text-sm font-medium text-slate-200">
                        {log.LastSeenAt ? parseDate(log.LastSeenAt) : parseDate(log.UpdatedAt)}
                      </p>
                    </div>
                  </div>

                  {/* Capture info */}
                  <div className="glass-chip rounded-lg px-3 py-3 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Cpu className="size-3" /> Capture Info
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Source</span>
                        <p className="text-slate-200 font-medium">{log.CaptureSource || "—"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Mode</span>
                        <p className="text-slate-200 font-medium">{log.CaptureMode || "—"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right col — sensitive data exposure */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Database className="size-3" /> Data Exposure Profile
                  </p>
                  {!log.SensitiveData || log.SensitiveData.length === 0 ? (
                    <div className="glass-chip rounded-xl flex items-center justify-center h-32 text-muted-foreground text-sm">
                      No sensitive data detected
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {[...log.SensitiveData]
                        .sort((a, b) => getSensitivityData(b).val - getSensitivityData(a).val)
                        .map((item, idx) => {
                          const weight = getSensitivityData(item)
                          return (
                            <div key={idx} className="space-y-1.5">
                              <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2 font-medium text-slate-200">
                                  <weight.icon className="size-4 text-muted-foreground" />
                                  {item.replace(/_/g, " ")}
                                </span>
                                <span className="text-xs text-muted-foreground font-mono">{weight.val}</span>
                              </div>
                              <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                                <div className={`h-full ${weight.color} rounded-full transition-all duration-500`} style={{ width: `${weight.val}%` }} />
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* SCHEMA */}
            <TabsContent value="schema" className="m-0 flex-1 p-5">
              <div className="grid gap-5 xl:grid-cols-2">
                {/* Request schema */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Request Schema</p>
                  {log.SchemaReq && Object.keys(log.SchemaReq).length > 0 ? (
                    <div className="glass-chip rounded-xl p-4 space-y-2">
                      {Object.entries(log.SchemaReq).map(([key, type]) => (
                        <div key={key} className="flex items-center justify-between text-sm font-mono">
                          <span className="text-blue-400">{key}</span>
                          <span className="text-slate-500 text-xs">{type}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptySlot label="No request schema observed" />
                  )}
                </div>

                {/* Response schema */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Response Schema</p>
                  {log.SchemaResp && Object.keys(log.SchemaResp).length > 0 ? (
                    <div className="glass-chip rounded-xl p-4 space-y-2">
                      {Object.entries(log.SchemaResp).map(([key, type]) => (
                        <div key={key} className="flex items-center justify-between text-sm font-mono">
                          <span className="text-emerald-400">{key}</span>
                          <span className="text-slate-500 text-xs">{type}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptySlot label="No response schema observed" />
                  )}
                </div>

                {/* Header schema */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Header Schema</p>
                  {log.HeaderSchema && Object.keys(log.HeaderSchema).length > 0 ? (
                    <div className="glass-chip rounded-xl p-4 space-y-2">
                      {Object.entries(log.HeaderSchema).map(([key, type]) => (
                        <div key={key} className="flex items-center justify-between text-sm font-mono">
                          <span className="text-purple-400">{key}</span>
                          <span className="text-slate-500 text-xs">{type}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptySlot label="No header schema observed" />
                  )}
                </div>

                {/* Parameter values */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Parameter Values</p>
                  {log.ParamValues && Object.keys(log.ParamValues).length > 0 ? (
                    <div className="glass-chip rounded-xl p-4 space-y-3">
                      {Object.entries(log.ParamValues).map(([key, vals]) => (
                        <div key={key} className="space-y-1">
                          <span className="text-xs font-mono text-amber-400">{key}</span>
                          <div className="flex flex-wrap gap-1.5">
                            {vals.slice(0, 5).map((v, i) => (
                              <span key={i} className="text-xs font-mono bg-black/30 border border-white/5 rounded px-1.5 py-0.5 text-slate-300">
                                {v}
                              </span>
                            ))}
                            {vals.length > 5 && (
                              <span className="text-xs text-muted-foreground">+{vals.length - 5} more</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptySlot label="No parameter values observed" />
                  )}
                </div>
              </div>
            </TabsContent>

            {/* SAMPLES */}
            <TabsContent value="samples" className="m-0 flex-1 p-5">
              {/* Redaction indicator */}
              <div className="flex items-start gap-2.5 mb-4 px-3 py-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15 text-xs text-emerald-300/70">
                <svg className="size-3.5 mt-0.5 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 12c0 6.627 5.373 12 12 12s12-5.373 12-12c0-1.929-.459-3.751-1.274-5.362" /></svg>
                <span><strong className="text-emerald-400 font-semibold">Redaction active</strong> — Authorization headers, API keys, JWTs, passwords, and PII are automatically stripped from all stored samples before display. Values shown are safe to share.</span>
              </div>
              <Tabs defaultValue="response" className="flex flex-col h-full">
                <div className="border-b border-white/5 pb-3 mb-4">
                  <TabsList variant="line" className="h-auto gap-5 rounded-none border-0 bg-transparent p-0">
                    <TabsTrigger value="response" className={tabTriggerClass}>Response Body</TabsTrigger>
                    <TabsTrigger value="request" className={tabTriggerClass}>Request Body</TabsTrigger>
                    <TabsTrigger value="headers" className={tabTriggerClass}>Headers</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="response" className="m-0">
                  <ScrollArea className="h-96 w-full rounded-xl border border-white/5 bg-black/40 p-4">
                    <pre className="text-sm text-emerald-400 font-mono whitespace-pre-wrap break-all">
                      {formatJSON(log.SampleRespBody || "")}
                    </pre>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="request" className="m-0">
                  <ScrollArea className="h-96 w-full rounded-xl border border-white/5 bg-black/40 p-4">
                    <pre className="text-sm text-amber-400 font-mono whitespace-pre-wrap break-all">
                      {formatJSON(log.SampleReqBody || "")}
                    </pre>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="headers" className="m-0">
                  <ScrollArea className="h-96 w-full rounded-xl border border-white/5 bg-black/40 p-4">
                    <div className="space-y-2 font-mono text-sm">
                      {Object.entries(log.SampleHeaders || {}).map(([key, vals]) => (
                        <div key={key} className="break-words">
                          <span className="text-blue-400 font-semibold">{key}: </span>
                          <span className="text-slate-300">{vals.join(", ")}</span>
                        </div>
                      ))}
                      {(!log.SampleHeaders || Object.keys(log.SampleHeaders).length === 0) && (
                        <p className="text-muted-foreground text-center py-8">No headers captured</p>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* FINDINGS */}
            <TabsContent value="findings" className="m-0 flex-1 p-5">
              {issues.length === 0 ? (
                <EmptySlot label="No findings for this endpoint" icon={<CheckCircle2 className="size-8 text-emerald-500/30" />} />
              ) : (
                <div className="space-y-3">
                  {issues.map((issue) => (
                    <Card key={issue.id} className={`border-l-4 bg-black/30 border-white/5 ${
                      issue.severity === "critical" ? "border-l-rose-500" :
                      issue.severity === "high" ? "border-l-orange-500" :
                      issue.severity === "medium" ? "border-l-amber-500" :
                      "border-l-emerald-500"
                    }`}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={`text-xs ${getSeverityColor(issue.severity)}`}>
                              {issue.severity.toUpperCase()}
                            </Badge>
                            <span className="text-sm font-semibold text-slate-200">{issue.title || issue.test_type.replace(/_/g, " ")}</span>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0 bg-slate-500/10 text-slate-400 border-white/10">
                            {issue.status}
                          </Badge>
                        </div>
                        {issue.description && (
                          <p className="text-xs text-muted-foreground">{issue.description}</p>
                        )}
                        <p className="text-xs text-slate-600">
                          First seen {parseDate(issue.first_seen_at)} · Last seen {parseDate(issue.last_seen_at)}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* SCANS */}
            <TabsContent value="scans" className="m-0 flex-1 p-5">
              {scanResults.length === 0 ? (
                <EmptySlot label="No scan results for this endpoint" icon={<Crosshair className="size-8 text-slate-500/30" />} />
              ) : (
                <div className="space-y-3">
                  {scanResults.map((result, idx) => (
                    <div key={result.id || idx} className="glass-chip rounded-xl px-4 py-3 flex items-center gap-4">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {result.vulnerable
                          ? <XCircle className="size-4 text-rose-400 shrink-0" />
                          : <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />}
                        <span className="text-sm font-medium text-slate-200 truncate">
                          {result.test_type.replace(/_/g, " ")}
                        </span>
                      </div>
                      <Badge variant="outline" className={`text-xs shrink-0 ${getSeverityColor(result.severity)}`}>
                        {result.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-xs shrink-0 font-mono bg-black/30 border-white/10 text-slate-400">
                        {result.response_status || "—"}
                      </Badge>
                      <span className="text-xs text-muted-foreground shrink-0 hidden lg:block">
                        {result.created_at ? parseDate(result.created_at) : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}

function EmptySlot({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <div className="glass-chip rounded-xl flex flex-col items-center justify-center gap-3 py-12 text-center">
      {icon ?? <Info className="size-8 text-slate-500/30" />}
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}
