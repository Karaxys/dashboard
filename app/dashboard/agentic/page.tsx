"use client"
import React, { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Crosshair, RefreshCcw, ShieldX, Radio, Activity, ChevronRight, XCircle,
} from "lucide-react"
import { apiFetch } from "@/lib/api"

interface Stats {
  total_sessions: number
  sessions_today: number
  blocked_total: number
  unreported_egress_total: number
  avg_risk_score: number
}

interface Session {
  session_id: string
  connector: string
  machine_id?: string
  user?: string
  status: string
  started_at: string
  last_event_at: string
  event_count: number
  tool_call_count: number
  blocked_count: number
  risk_score: number
  ebpf_correlated_count: number
  unreported_egress_count: number
}

function formatDate(s: string) {
  if (!s) return "—"
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(s))
}

export default function AgenticPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [s, list] = await Promise.all([
        apiFetch<Stats>("/v1/agentic/stats"),
        apiFetch<{ data: Session[] }>("/v1/agentic/sessions?limit=50"),
      ])
      setStats(s)
      setSessions(list.data || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load agent sessions")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const tiles = [
    { label: "Sessions today", value: stats?.sessions_today, icon: Activity, cls: "text-blue-400" },
    { label: "Blocked", value: stats?.blocked_total, icon: ShieldX, cls: "text-rose-400" },
    { label: "Unreported egress", value: stats?.unreported_egress_total, icon: Radio, cls: "text-amber-400" },
    { label: "Avg risk", value: stats ? stats.avg_risk_score.toFixed(2) : undefined, icon: Crosshair, cls: "text-purple-400" },
  ]

  return (
    <div className="glass-page min-h-full">
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex w-full items-center gap-3 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block"><BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem><BreadcrumbPage>Vanguard</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 p-5 pt-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Crosshair className="size-6 text-purple-400" />
              Vanguard — Agent Sessions
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              What your AI agents did — every prompt and tool call, per session.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="glass-chip border-white/10">
            <RefreshCcw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {tiles.map(t => (
            <div key={t.label} className="glass-chip rounded-xl px-4 py-3 border border-white/5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <t.icon className={`size-3.5 ${t.cls}`} /> {t.label}
              </p>
              <p className="text-2xl font-bold mt-1 text-slate-200">
                {loading ? <span className="animate-pulse">—</span> : t.value ?? 0}
              </p>
            </div>
          ))}
        </div>

        {error ? (
          <div className="glass-chip rounded-xl flex flex-col items-center justify-center gap-3 py-16 text-center">
            <XCircle className="size-10 text-rose-400/40" />
            <p className="text-rose-400 font-medium">{error}</p>
            <Button variant="outline" size="sm" onClick={load} className="glass-chip border-white/10 mt-1">Retry</Button>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl bg-white/5" />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="glass-chip rounded-xl flex flex-col items-center justify-center gap-3 py-20 text-center">
            <Crosshair className="size-14 text-purple-500/20" />
            <p className="text-lg font-semibold text-purple-300">No agent sessions yet</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Install the shield on a machine running Claude Code, then use the agent — sessions appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => (
              <Link key={s.session_id} href={`/dashboard/agentic/${encodeURIComponent(s.session_id)}`}>
                <Card className="bg-black/20 border-white/5 hover:border-white/15 transition-all">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-slate-200 truncate">{s.session_id}</span>
                        <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/20">{s.connector}</Badge>
                        <Badge variant="outline" className={`text-xs ${s.status === "ended" ? "bg-slate-500/10 text-slate-400 border-slate-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>{s.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {s.user || "unknown"} · started {formatDate(s.started_at)} · last {formatDate(s.last_event_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                      <span title="events"><Activity className="inline size-3.5 mr-1 text-blue-400" />{s.event_count}</span>
                      <span title="tool calls"><Crosshair className="inline size-3.5 mr-1 text-purple-400" />{s.tool_call_count}</span>
                      {s.blocked_count > 0 && <span title="blocked" className="text-rose-400"><ShieldX className="inline size-3.5 mr-1" />{s.blocked_count}</span>}
                      {s.unreported_egress_count > 0 && <span title="unreported egress" className="text-amber-400"><Radio className="inline size-3.5 mr-1" />{s.unreported_egress_count}</span>}
                      <ChevronRight className="size-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
