"use client"
import React, { Suspense, useCallback, useEffect, useState } from "react"
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
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Activity, AlertTriangle, Check, CheckCircle2, ChevronDown, Clock,
  Copy, Eye, EyeOff, ExternalLink, Globe, Loader2, Plus, Radio, RefreshCcw,
  RotateCcw, Server, Shield, Trash2, Wifi, WifiOff, Zap,
} from "lucide-react"
import { apiFetch } from "@/lib/api"

interface IngestTokenInfo {
  id: string
  token_prefix: string
  token: string
  ingest_url: string
  created_at: string
  rotated_at?: string
  last_used_at?: string
}

interface DataSource {
  id: string
  type: string
  name: string
  status: string
  target_url?: string
  created_at: string
  updated_at: string
}

interface Agent {
  id: string
  account_id: string
  data_source_id: string
  name: string
  status: string
  created_at: string
  updated_at: string
  last_seen_at?: string
}

interface AgentEnrollment {
  enrollment_id: string
  data_source_id: string
  enrollment_token?: string
  expires_at: string
  registration_command?: string
  agent_run_hint?: string
}

const DS_TYPE_META: Record<string, { label: string; icon: React.ElementType; cls: string; description: string }> = {
  EBPF_LINUX:       { label: "eBPF Linux Agent",       icon: Server,  cls: "bg-purple-500/10 text-purple-400 border-purple-500/20",  description: "Passively capture live API traffic from a Linux host." },
  EBPF_KUBERNETES:  { label: "eBPF Kubernetes Agent",  icon: Server,  cls: "bg-blue-500/10 text-blue-400 border-blue-500/20",       description: "Deploy the eBPF agent as a Kubernetes node-level collector." },
  ACTIVE_URL:       { label: "Active URL Scan",        icon: Globe,   cls: "bg-amber-500/10 text-amber-400 border-amber-500/20",     description: "Crawl and actively test a reachable API or web application URL." },
  OPENAPI:          { label: "OpenAPI Import",         icon: ExternalLink, cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", description: "Import endpoints from an OpenAPI or Swagger specification." },
  POSTMAN:          { label: "Postman Import",         icon: ExternalLink, cls: "bg-orange-500/10 text-orange-400 border-orange-500/20",   description: "Import endpoints from a Postman collection." },
  HAR:              { label: "HAR Upload",             icon: ExternalLink, cls: "bg-slate-500/10 text-slate-400 border-slate-500/20",      description: "Import browser-captured HTTP traffic from a HAR file." },
}

const DS_STATUS_META: Record<string, { label: string; cls: string }> = {
  pending:    { label: "Pending",    cls: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  connected:  { label: "Connected",  cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  error:      { label: "Error",      cls: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  disabled:   { label: "Disabled",   cls: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
}

const EBPF_TYPES = ["EBPF_LINUX", "EBPF_KUBERNETES"]

function formatAgo(s?: string): string {
  if (!s) return "Never"
  const diff = Date.now() - new Date(s).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}

function isOnline(lastSeen?: string): boolean {
  if (!lastSeen) return false
  return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000
}

export default function AgentsPage() {
  return (
    <Suspense fallback={<div className="glass-page min-h-full" />}>
      <AgentsPageContent />
    </Suspense>
  )
}

function AgentsPageContent() {
  const [sources, setSources] = useState<DataSource[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [enrollments, setEnrollments] = useState<AgentEnrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Account ingest token
  const [tokenInfo, setTokenInfo] = useState<IngestTokenInfo | null>(null)
  const [tokenLoading, setTokenLoading] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [tokenVisible, setTokenVisible] = useState(false)
  const [rotating, setRotating] = useState(false)

  // Create source form
  const [showCreate, setShowCreate] = useState(false)
  const [newType, setNewType] = useState("EBPF_LINUX")
  const [newName, setNewName] = useState("")
  const [newURL, setNewURL] = useState("")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Enrollment form
  const [enrollingSourceId, setEnrollingSourceId] = useState<string | null>(null)
  const [enrollName, setEnrollName] = useState("")
  const [enrollTTL, setEnrollTTL] = useState(24)
  const [enrolling, setEnrolling] = useState(false)
  const [newEnrollment, setNewEnrollment] = useState<AgentEnrollment | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [srcsData, agentsData, enrollData] = await Promise.all([
        apiFetch<{ data: DataSource[] }>("/data-sources"),
        apiFetch<{ data: Agent[] }>("/v1/agents").catch(() => ({ data: [] })),
        apiFetch<{ data: AgentEnrollment[] }>("/v1/agent-enrollments").catch(() => ({ data: [] })),
      ])
      setSources(srcsData.data || [])
      setAgents(agentsData.data || [])
      setEnrollments(enrollData.data || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const fetchToken = useCallback(async () => {
    setTokenLoading(true)
    setTokenError(null)
    try {
      const data = await apiFetch<IngestTokenInfo>("/account/ingest-token")
      setTokenInfo(data)
    } catch (e: unknown) {
      setTokenError(e instanceof Error ? e.message : "Failed to load ingest token")
    } finally {
      setTokenLoading(false)
    }
  }, [])

  useEffect(() => { fetchToken() }, [fetchToken])

  const rotateToken = async () => {
    setRotating(true)
    setTokenError(null)
    try {
      const data = await apiFetch<IngestTokenInfo>("/account/ingest-token/rotate", { method: "POST" })
      setTokenInfo(data)
      setTokenVisible(true)
    } catch (e: unknown) {
      setTokenError(e instanceof Error ? e.message : "Failed to rotate token")
    } finally {
      setRotating(false)
    }
  }

  const createSource = async () => {
    setCreating(true)
    setCreateError(null)
    try {
      const body: Record<string, string> = { type: newType, name: newName.trim() || "" }
      if (newType === "ACTIVE_URL" && newURL.trim()) body.target_url = newURL.trim()
      await apiFetch("/data-sources", { method: "POST", body: JSON.stringify(body) })
      setShowCreate(false)
      setNewName("")
      setNewURL("")
      setNewType("EBPF_LINUX")
      fetchAll()
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Failed to create data source")
    } finally {
      setCreating(false)
    }
  }

  const deleteSource = async (id: string) => {
    setDeletingId(id)
    try {
      await apiFetch(`/data-sources/${id}`, { method: "DELETE" })
      fetchAll()
    } catch { } finally {
      setDeletingId(null)
    }
  }

  const createEnrollment = async (sourceId: string) => {
    setEnrolling(true)
    try {
      const resp = await apiFetch<AgentEnrollment>("/agent-enrollments", {
        method: "POST",
        body: JSON.stringify({
          data_source_id: sourceId,
          name: enrollName.trim() || "Agent",
          ttl_hours: enrollTTL,
        }),
      })
      setNewEnrollment(resp)
      setEnrollingSourceId(null)
      setEnrollName("")
      fetchAll()
    } catch { } finally {
      setEnrolling(false)
    }
  }

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const onlineAgents = agents.filter(a => isOnline(a.last_seen_at))

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
              <BreadcrumbItem><BreadcrumbPage>Agents</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 p-5 pt-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Radio className="size-6 text-purple-400" />
              Agents & Data Sources
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage eBPF capture agents, active scans, and import data sources.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading} className="glass-chip border-white/10">
              <RefreshCcw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />Refresh
            </Button>
            <Button size="sm" onClick={() => setShowCreate(v => !v)} className="bg-purple-600 hover:bg-purple-500 text-white border-0">
              <Plus className="size-4 mr-2" />Add Data Source
            </Button>
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Data Sources", value: sources.length, icon: Server, cls: "text-purple-400" },
            { label: "Agents", value: agents.length, icon: Radio, cls: "text-blue-400" },
            { label: "Online Now", value: onlineAgents.length, icon: Wifi, cls: "text-emerald-400" },
            { label: "Pending Tokens", value: enrollments.length, icon: Shield, cls: "text-amber-400" },
          ].map(s => (
            <div key={s.label} className="glass-chip rounded-xl px-4 py-3 border border-white/5">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold mt-0.5 ${s.cls}`}>{loading ? "—" : s.value}</p>
            </div>
          ))}
        </div>

        {/* Account Ingest Token */}
        <Card className="glass-panel border-purple-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-purple-400" />
                <CardTitle className="text-sm">Account Ingest Token</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {tokenInfo && (
                  <Button
                    variant="ghost" size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-slate-200"
                    onClick={() => setTokenVisible(v => !v)}
                  >
                    {tokenVisible
                      ? <><EyeOff className="size-3 mr-1.5" />Hide</>
                      : <><Eye className="size-3 mr-1.5" />Show</>}
                  </Button>
                )}
                <Button
                  variant="outline" size="sm"
                  className="h-7 text-xs glass-chip border-white/10"
                  disabled={rotating || tokenLoading}
                  onClick={rotateToken}
                >
                  <RotateCcw className={`size-3 mr-1.5 ${rotating ? "animate-spin" : ""}`} />
                  Rotate
                </Button>
              </div>
            </div>
            <CardDescription className="text-xs">
              Use this token with <code className="text-purple-300">KARAXYS_ACCOUNT_TOKEN</code> in your collector command. Always accessible — never expires unless rotated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tokenLoading && <Skeleton className="h-9 rounded-lg bg-white/5" />}
            {tokenError && (
              <p className="text-xs text-rose-400">{tokenError}</p>
            )}
            {!tokenLoading && tokenInfo && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-black/30 border border-white/8">
                  <code className="flex-1 font-mono text-xs text-slate-300 truncate">
                    {tokenVisible ? tokenInfo.token : `${tokenInfo.token_prefix}${"•".repeat(32)}`}
                  </code>
                  <button
                    onClick={() => copyText(tokenInfo.token, "ingest-token")}
                    className="shrink-0 text-muted-foreground hover:text-slate-200 transition-colors"
                  >
                    {copiedId === "ingest-token"
                      ? <Check className="size-3.5 text-emerald-400" />
                      : <Copy className="size-3.5" />}
                  </button>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Ingest URL:&nbsp;
                    <code className="text-slate-400 font-mono">{tokenInfo.ingest_url}</code>
                    <button
                      onClick={() => copyText(tokenInfo.ingest_url, "ingest-url")}
                      className="ml-1.5 inline-flex text-muted-foreground hover:text-slate-200 transition-colors"
                    >
                      {copiedId === "ingest-url"
                        ? <Check className="size-3 text-emerald-400" />
                        : <Copy className="size-3" />}
                    </button>
                  </span>
                  {tokenInfo.last_used_at && (
                    <span>Last used: {new Date(tokenInfo.last_used_at).toLocaleDateString()}</span>
                  )}
                  {tokenInfo.rotated_at && (
                    <span>Rotated: {new Date(tokenInfo.rotated_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create data source form */}
        {showCreate && (
          <Card className="glass-panel border-purple-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Plus className="size-4 text-purple-400" />New Data Source</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <Select value={newType} onValueChange={setNewType}>
                    <SelectTrigger className="bg-black/20 border-white/10 text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                      {Object.entries(DS_TYPE_META).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{DS_TYPE_META[newType]?.description}</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Name (optional)</Label>
                  <Input
                    value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. production-linux-01"
                    className="bg-black/20 border-white/10 text-slate-200 placeholder:text-slate-600"
                  />
                </div>
                {newType === "ACTIVE_URL" && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Target URL</Label>
                    <Input
                      value={newURL} onChange={e => setNewURL(e.target.value)}
                      placeholder="https://api.example.com"
                      className="bg-black/20 border-white/10 text-slate-200 placeholder:text-slate-600"
                    />
                  </div>
                )}
              </div>
              {createError && <p className="text-xs text-rose-400">{createError}</p>}
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={createSource} disabled={creating} className="bg-purple-600 hover:bg-purple-500 text-white border-0">
                  {creating ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Plus className="size-4 mr-2" />}
                  Create
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)} className="text-muted-foreground">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* New enrollment result */}
        {newEnrollment && (
          <Card className="glass-panel border-emerald-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-400" />Enrollment Token Created</CardTitle>
              <CardDescription className="text-xs">Copy the token now — it will not be shown again after you navigate away.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Registration Command</Label>
                <div className="relative mt-1.5">
                  <pre className="p-3 rounded-lg bg-black/40 border border-white/5 font-mono text-xs text-emerald-300 overflow-auto whitespace-pre-wrap break-all">
                    {newEnrollment.registration_command || `kx-agent register --token ${newEnrollment.enrollment_token}`}
                  </pre>
                  <button onClick={() => copyText(newEnrollment.registration_command || newEnrollment.enrollment_token || "", "cmd")} className="absolute top-2 right-2 text-muted-foreground hover:text-slate-200">
                    {copiedId === "cmd" ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                  </button>
                </div>
              </div>
              {newEnrollment.agent_run_hint && (
                <div>
                  <Label className="text-xs text-muted-foreground">Run Agent</Label>
                  <div className="relative mt-1.5">
                    <pre className="p-3 rounded-lg bg-black/40 border border-white/5 font-mono text-xs text-blue-300 overflow-auto whitespace-pre-wrap break-all">{newEnrollment.agent_run_hint}</pre>
                    <button onClick={() => copyText(newEnrollment.agent_run_hint!, "hint")} className="absolute top-2 right-2 text-muted-foreground hover:text-slate-200">
                      {copiedId === "hint" ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                    </button>
                  </div>
                </div>
              )}
              <Button size="sm" variant="ghost" onClick={() => setNewEnrollment(null)} className="text-muted-foreground">Dismiss</Button>
            </CardContent>
          </Card>
        )}

        {error && (
          <div className="glass-chip rounded-xl p-4 border border-rose-500/20 text-rose-400 text-sm">{error}</div>
        )}

        <div className="grid gap-5 xl:grid-cols-3">
          {/* Data sources */}
          <div className="xl:col-span-2 space-y-3">
            <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2"><Server className="size-4 text-purple-400" />Data Sources</h2>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl bg-white/5" />)}</div>
            ) : sources.length === 0 ? (
              <div className="glass-chip rounded-xl flex flex-col items-center justify-center gap-3 py-14 text-center border border-white/5">
                <Server className="size-12 text-slate-700" />
                <p className="text-slate-400 font-medium">No data sources yet</p>
                <p className="text-xs text-muted-foreground">Add an eBPF agent or active URL scan to start discovering APIs.</p>
                <Button size="sm" onClick={() => setShowCreate(true)} className="bg-purple-600 hover:bg-purple-500 text-white border-0 mt-1">
                  <Plus className="size-4 mr-2" />Add Data Source
                </Button>
              </div>
            ) : (
              sources.map(src => {
                const meta = DS_TYPE_META[src.type] ?? DS_TYPE_META.ACTIVE_URL
                const sMeta = DS_STATUS_META[src.status] ?? DS_STATUS_META.pending
                const Icon = meta.icon
                const isEBPF = EBPF_TYPES.includes(src.type)
                const srcAgents = agents.filter(a => a.data_source_id === src.id)
                const onlineCount = srcAgents.filter(a => isOnline(a.last_seen_at)).length
                const isEnrolling = enrollingSourceId === src.id

                return (
                  <Card key={src.id} className="glass-panel">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-3 justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`size-9 flex items-center justify-center rounded-lg border ${meta.cls}`}>
                            <Icon className="size-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-slate-100">{src.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className={`text-xs ${meta.cls}`}>{meta.label}</Badge>
                              <Badge variant="outline" className={`text-xs ${sMeta.cls}`}>{sMeta.label}</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isEBPF && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline" size="sm"
                                    className="glass-chip border-white/10 text-xs h-7"
                                    onClick={() => setEnrollingSourceId(isEnrolling ? null : src.id)}
                                  >
                                    <Shield className="size-3 mr-1.5" />Enroll Agent
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="text-xs">Generate an enrollment token for a new eBPF agent</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <Button
                            variant="ghost" size="icon"
                            className="size-7 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
                            disabled={deletingId === src.id}
                            onClick={() => deleteSource(src.id)}
                          >
                            {deletingId === src.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                          </Button>
                        </div>
                      </div>
                      {src.target_url && <p className="text-xs text-muted-foreground font-mono truncate">{src.target_url}</p>}
                      {isEBPF && (
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {onlineCount > 0
                            ? <span className="flex items-center gap-1.5 text-emerald-400"><Wifi className="size-3" />{onlineCount} online</span>
                            : <span className="flex items-center gap-1.5"><WifiOff className="size-3" />No agents online</span>
                          }
                          <span>{srcAgents.length} agent{srcAgents.length !== 1 ? "s" : ""} total</span>
                        </div>
                      )}

                      {/* Enrollment form */}
                      {isEnrolling && (
                        <div className="pt-2 border-t border-white/5 space-y-3">
                          <p className="text-xs font-medium text-slate-300">Generate Enrollment Token</p>
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Agent Name</Label>
                              <Input value={enrollName} onChange={e => setEnrollName(e.target.value)} placeholder="prod-node-01" className="h-8 text-xs bg-black/20 border-white/10 text-slate-200 placeholder:text-slate-600" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Token Validity (hours)</Label>
                              <Input type="number" min={1} max={168} value={enrollTTL} onChange={e => setEnrollTTL(Number(e.target.value))} className="h-8 text-xs bg-black/20 border-white/10 text-slate-200" />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => createEnrollment(src.id)} disabled={enrolling} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white border-0">
                              {enrolling ? <Loader2 className="size-3 mr-1.5 animate-spin" /> : <Shield className="size-3 mr-1.5" />}
                              Generate Token
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEnrollingSourceId(null)} className="h-7 text-xs text-muted-foreground">Cancel</Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>

          {/* Right panel: agents list + pending enrollments */}
          <div className="space-y-4">
            {/* Registered agents */}
            <Card className="glass-panel">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Radio className="size-4 text-blue-400" />Registered Agents</CardTitle>
                <CardDescription className="text-xs">Last heartbeat within 5 minutes = online</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading ? (
                  <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg bg-white/5" />)}</div>
                ) : agents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                    <WifiOff className="size-8 text-slate-700" />
                    <p className="text-xs text-muted-foreground">No agents registered yet</p>
                  </div>
                ) : (
                  agents.map(agent => {
                    const online = isOnline(agent.last_seen_at)
                    return (
                      <div key={agent.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-black/10 border border-white/5">
                        <div className={`size-2 rounded-full shrink-0 ${online ? "bg-emerald-400 shadow-[0_0_6px_theme(colors.emerald.400)]" : "bg-slate-600"}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-slate-200 truncate">{agent.name}</p>
                          <p className="text-xs text-muted-foreground">{online ? "Online" : formatAgo(agent.last_seen_at)}</p>
                        </div>
                        <Badge variant="outline" className={`text-xs shrink-0 ${agent.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20"}`}>
                          {agent.status}
                        </Badge>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            {/* Pending enrollment tokens */}
            {enrollments.length > 0 && (
              <Card className="glass-panel">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><Shield className="size-4 text-amber-400" />Pending Tokens</CardTitle>
                  <CardDescription className="text-xs">Active enrollment tokens awaiting agent registration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {enrollments.map((en, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-black/10 border border-white/5 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Expires <span className="text-slate-300">{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(en.expires_at))}</span>
                        </p>
                        <Clock className="size-3 text-amber-400" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
