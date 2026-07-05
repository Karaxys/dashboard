"use client"
import React, { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
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
  Crosshair, RefreshCcw, XCircle, MessageSquare, Terminal, CornerDownRight, Flag,
} from "lucide-react"
import { apiFetch } from "@/lib/api"

interface HTTPCall {
  method: string
  host: string
  path?: string
  status?: number
  at: string
}

interface AgentEvent {
  event_id: string
  event_type: string
  connector: string
  tool_name?: string
  tool_input?: string
  tool_output?: string
  prompt_summary?: string
  guardrail_decision?: string
  risk_score: number
  ebpf_correlated: boolean
  ebpf_http_calls?: HTTPCall[]
  occurred_at: string
}

const EVENT_META: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  prompt_submit: { label: "Prompt", icon: MessageSquare, cls: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  pre_tool_use:  { label: "Tool call", icon: Terminal, cls: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  post_tool_use: { label: "Tool result", icon: CornerDownRight, cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  response:      { label: "Response", icon: Flag, cls: "text-slate-300 bg-slate-500/10 border-slate-500/20" },
}

function meta(t: string) {
  return EVENT_META[t] ?? { label: t, icon: Crosshair, cls: "text-slate-400 bg-slate-500/10 border-slate-500/20" }
}

function formatTime(s: string) {
  if (!s) return "—"
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(s))
}

export default function AgentSessionPage() {
  const params = useParams<{ id: string }>()
  const sessionId = decodeURIComponent(params.id)
  const [events, setEvents] = useState<AgentEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<{ data: AgentEvent[] }>(`/v1/agentic/sessions/${encodeURIComponent(sessionId)}/events?limit=200`)
      setEvents(res.data || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load session")
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => { load() }, [load])

  return (
    <div className="glass-page min-h-full">
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex w-full items-center gap-3 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block"><BreadcrumbLink href="/dashboard/agentic">Vanguard</BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem><BreadcrumbPage>Session</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 p-5 pt-0">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Crosshair className="size-5 text-purple-400" />
              Session
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5 font-mono truncate">{sessionId}</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="glass-chip border-white/10">
            <RefreshCcw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error ? (
          <div className="glass-chip rounded-xl flex flex-col items-center justify-center gap-3 py-16 text-center">
            <XCircle className="size-10 text-rose-400/40" />
            <p className="text-rose-400 font-medium">{error}</p>
            <Button variant="outline" size="sm" onClick={load} className="glass-chip border-white/10 mt-1">Retry</Button>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl bg-white/5" />)}
          </div>
        ) : events.length === 0 ? (
          <div className="glass-chip rounded-xl flex items-center justify-center py-20 text-muted-foreground text-sm">
            No events recorded for this session.
          </div>
        ) : (
          <div className="relative space-y-3 before:absolute before:left-4.75 before:top-2 before:bottom-2 before:w-px before:bg-white/10">
            {events.map(ev => {
              const m = meta(ev.event_type)
              const Icon = m.icon
              const blocked = ev.guardrail_decision === "block"
              return (
                <div key={ev.event_id} className="relative flex gap-4">
                  <div className={`z-10 flex size-10 shrink-0 items-center justify-center rounded-full border ${m.cls}`}>
                    <Icon className="size-4" />
                  </div>
                  <Card className="flex-1 bg-black/20 border-white/5">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-xs ${m.cls}`}>{m.label}</Badge>
                        {ev.tool_name && <span className="font-mono text-xs text-slate-300">{ev.tool_name}</span>}
                        {blocked && <Badge variant="outline" className="text-xs bg-rose-500/10 text-rose-400 border-rose-500/20">blocked</Badge>}
                        {ev.ebpf_correlated && <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/20">kernel-correlated</Badge>}
                        <span className="ml-auto text-xs text-muted-foreground">{formatTime(ev.occurred_at)}</span>
                      </div>
                      {ev.prompt_summary && (
                        <p className="text-sm text-slate-300 whitespace-pre-wrap line-clamp-4">{ev.prompt_summary}</p>
                      )}
                      {ev.tool_input && (
                        <pre className="p-2 rounded-lg bg-black/40 border border-white/5 font-mono text-xs text-blue-300 whitespace-pre-wrap break-all max-h-32 overflow-auto">{ev.tool_input}</pre>
                      )}
                      {ev.tool_output && (
                        <pre className="p-2 rounded-lg bg-black/30 border border-white/5 font-mono text-xs text-emerald-300/80 whitespace-pre-wrap break-all max-h-32 overflow-auto">{ev.tool_output}</pre>
                      )}
                      {ev.ebpf_http_calls && ev.ebpf_http_calls.length > 0 && (
                        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 space-y-1">
                          <p className="text-xs font-semibold text-amber-400/90">Observed at the kernel</p>
                          {ev.ebpf_http_calls.map((c, idx) => (
                            <div key={idx} className="flex items-center gap-2 font-mono text-xs text-amber-200/80">
                              <span className="font-bold text-amber-300">{c.method}</span>
                              <span className="truncate">{c.host}{c.path}</span>
                              {c.status ? <span className="ml-auto text-slate-400">{c.status}</span> : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
