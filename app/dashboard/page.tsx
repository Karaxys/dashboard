"use client"
import React, { useEffect, useState } from "react"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertTriangle, Bug, Crosshair, Database, Radar,
  RefreshCcw, ShieldAlert, ShieldCheck, Target,
} from "lucide-react"
import Link from "next/link"
import {
  DataClassChart, EndpointRiskChart, RiskTrendChart,
  type DailyIssueCounts, type SensitiveDataBreakdown, type TopEndpoint,
} from "@/components/dashboard/security-charts"
import { apiFetch } from "@/lib/api"

interface MetricsSummary {
  inventory:      { total: number; critical: number; high: number; medium: number; low: number; authenticated: number; unauthenticated: number }
  issues:         { total: number; critical: number; high: number; medium: number; low: number; open: number; accepted_risk: number; false_positive: number; fixed: number }
  scans:          { total: number; queued: number; running: number; completed: number; failed: number; cancelled: number }
  agents:         { total: number; online: number }
  sensitive_data: SensitiveDataBreakdown
  daily_issues:   DailyIssueCounts[]
  top_endpoints:  TopEndpoint[]
}

interface QuickStartState {
  inventory_count: number
  data_sources: { id: string; type: string; name: string; status: string }[]
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<MetricsSummary | null>(null)
  const [quickStart, setQuickStart] = useState<QuickStartState | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchData = async () => {
    setLoading(true)
    try {
      const [s, q] = await Promise.all([
        apiFetch<MetricsSummary>("/v1/metrics/summary").catch(() => null),
        apiFetch<QuickStartState>("/quick-start").catch(() => null),
      ])
      setSummary(s)
      setQuickStart(q)
      setLastRefresh(new Date())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const inv   = summary?.inventory
  const iss   = summary?.issues
  const scans = summary?.scans

  const topStats = [
    {
      title: "Endpoints Captured",
      value: loading ? "—" : (inv?.total ?? 0).toLocaleString(),
      delta: loading ? "—" : inv ? `+${inv.unauthenticated} unauthenticated` : "—",
      deltaClass: (inv?.unauthenticated ?? 0) > 0 ? "text-amber-300" : "text-emerald-400",
      icon: Radar,
      href: "/dashboard/logs",
    },
    {
      title: "Sensitive Data Findings",
      value: loading ? "—" : (() => {
        const sd = summary?.sensitive_data
        return sd ? (sd.pii + sd.financial + sd.secrets + sd.other).toLocaleString() : "0"
      })(),
      delta: loading ? "—" : summary?.sensitive_data ? `${summary.sensitive_data.pii} PII · ${summary.sensitive_data.secrets} secrets` : "—",
      deltaClass: "text-amber-300",
      icon: Database,
      href: "/dashboard/logs",
    },
    {
      title: "Open Vulnerabilities",
      value: loading ? "—" : (iss?.open ?? 0).toLocaleString(),
      delta: loading ? "—" : iss ? `${iss.critical} critical · ${iss.high} high` : "—",
      deltaClass: (iss?.critical ?? 0) > 0 ? "text-rose-400" : "text-emerald-400",
      icon: Target,
      href: "/dashboard/findings",
    },
    {
      title: "Open OWASP Risks",
      value: loading ? "—" : (iss?.open ?? 0).toLocaleString(),
      delta: loading ? "—" : scans ? `${scans.completed} scans run` : "—",
      deltaClass: "text-rose-400",
      icon: ShieldAlert,
      href: "/dashboard/findings",
    },
  ]

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
                  <BreadcrumbLink href="#">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem><BreadcrumbPage>Overview</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <p className="text-xs text-muted-foreground hidden sm:block">Updated {lastRefresh.toLocaleTimeString()}</p>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="glass-chip border-white/10">
              <RefreshCcw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />Refresh
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">

        {/* Stat cards — live data */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {topStats.map((stat) => (
            <Link key={stat.title} href={stat.href}>
              <Card className="glass-panel gap-3 py-4 hover:border-white/15 transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between px-4">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">{stat.title}</p>
                    {loading
                      ? <Skeleton className="h-7 w-16 rounded bg-white/5" />
                      : <p className="text-xl font-semibold tracking-tight">{stat.value}</p>
                    }
                    <p className={`text-xs font-medium ${stat.deltaClass}`}>{loading ? "—" : stat.delta}</p>
                  </div>
                  <div className="glass-chip flex size-10 items-center justify-center rounded-xl shrink-0">
                    <stat.icon className="size-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Middle row — command center + data class chart + OWASP coverage */}
        <div className="grid gap-4 xl:grid-cols-12">
          {/* API Risk Command Center */}
          <Card className="glass-panel relative overflow-hidden xl:col-span-6">
            <CardHeader className="relative space-y-1">
              <CardDescription>Scanner health</CardDescription>
              <CardTitle className="text-3xl">API Risk Command Center</CardTitle>
              <p className="text-muted-foreground text-sm">Realtime endpoint discovery and OWASP risk mapping.</p>
              <p className="text-muted-foreground text-sm">
                {loading
                  ? "Loading…"
                  : scans && scans.completed > 0
                  ? `${scans.completed} scans completed · ${scans.running + scans.queued} active`
                  : "No scans run yet — start your first scan below."
                }
              </p>
            </CardHeader>
            <CardContent className="relative grid gap-3 pb-5 sm:grid-cols-2">
              <div className="glass-chip rounded-xl p-3">
                <p className="text-muted-foreground text-xs">Authenticated APIs</p>
                {loading ? <Skeleton className="h-7 w-12 rounded bg-white/5 mt-1" /> : <p className="text-xl font-semibold">{inv?.authenticated ?? 0}</p>}
              </div>
              <div className="glass-chip rounded-xl p-3">
                <p className="text-muted-foreground text-xs">Unauthenticated APIs</p>
                {loading
                  ? <Skeleton className="h-7 w-12 rounded bg-white/5 mt-1" />
                  : <p className={`text-xl font-semibold ${(inv?.unauthenticated ?? 0) > 0 ? "text-amber-300" : ""}`}>{inv?.unauthenticated ?? 0}</p>
                }
              </div>
              <div className="glass-chip rounded-xl p-3 sm:col-span-2">
                <p className="text-muted-foreground text-xs">Top issue class</p>
                {loading
                  ? <Skeleton className="h-6 w-48 rounded bg-white/5 mt-1" />
                  : <p className="text-lg font-semibold">
                      {(iss?.critical ?? 0) > 0 ? "Critical vulnerabilities detected"
                        : (iss?.high ?? 0) > 0 ? "High-severity findings need review"
                        : (iss?.open ?? 0) > 0 ? "Open findings awaiting triage"
                        : "No open vulnerabilities — looking good!"}
                    </p>
                }
              </div>
            </CardContent>
          </Card>

          {/* Data Classification Donut — live */}
          <Card className="glass-panel xl:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Data Classification</CardTitle>
              <CardDescription>Sensitive data detected across traffic</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading
                ? <Skeleton className="h-56 w-full rounded-xl bg-white/5" />
                : <DataClassChart data={summary?.sensitive_data} />
              }
            </CardContent>
          </Card>

          {/* OWASP Coverage + quick metrics */}
          <Card className="glass-panel xl:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">OWASP Coverage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="glass-chip rounded-2xl p-4">
                <p className="text-muted-foreground text-xs">Issues by Severity</p>
                {loading
                  ? <Skeleton className="h-7 w-20 rounded bg-white/5 mt-1" />
                  : <p className="text-2xl font-semibold">
                      {iss ? `${(iss.critical + iss.high + iss.medium + iss.low).toLocaleString()} total` : "0 total"}
                    </p>
                }
              </div>
              <div className="glass-chip rounded-2xl p-4">
                <p className="text-muted-foreground text-xs">Endpoints with Auth Gaps</p>
                {loading
                  ? <Skeleton className="h-7 w-12 rounded bg-white/5 mt-1" />
                  : <p className="text-2xl font-semibold">{inv?.unauthenticated ?? 0}</p>
                }
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
                <p className="text-muted-foreground text-sm">Issues Fixed</p>
                {loading
                  ? <Skeleton className="h-8 w-10 rounded bg-white/5" />
                  : <p className="text-3xl font-semibold text-emerald-400">{iss?.fixed ?? 0}</p>
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom row — risk trend + top vulnerable endpoints */}
        <div className="grid gap-4 xl:grid-cols-12">
          <Card className="glass-panel xl:col-span-8">
            <CardHeader className="pb-2">
              <CardTitle>Risk Trend — Last 7 Days</CardTitle>
              <CardDescription>Critical, high, and medium findings by first-seen date</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="glass-chip rounded-2xl p-4">
                {loading
                  ? <Skeleton className="h-72 w-full rounded-xl bg-white/5" />
                  : <RiskTrendChart data={summary?.daily_issues} />
                }
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel xl:col-span-4">
            <CardHeader>
              <CardTitle>Most Vulnerable Endpoints</CardTitle>
              <CardDescription>Ranked by finding count</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="glass-chip rounded-2xl p-4">
                {loading
                  ? <Skeleton className="h-64 w-full rounded-xl bg-white/5" />
                  : <EndpointRiskChart data={summary?.top_endpoints} />
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Immediate actions — live counts */}
        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Immediate Actions</CardTitle>
              <CardDescription>Prioritized remediation queue from live findings</CardDescription>
            </div>
            <Button variant="ghost" size="icon" className="glass-chip" asChild>
              <Link href="/dashboard/findings"><ShieldCheck className="size-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="glass-chip rounded-xl p-4">
              <p className="text-muted-foreground text-xs">Critical issues to fix</p>
              {loading
                ? <Skeleton className="h-8 w-12 rounded bg-white/5 mt-1" />
                : <p className="text-2xl font-semibold text-rose-400">{iss?.critical ?? 0}</p>
              }
              <p className="text-muted-foreground mt-1 text-xs">Highest-severity open findings</p>
            </div>
            <div className="glass-chip rounded-xl p-4">
              <p className="text-muted-foreground text-xs">High-severity findings</p>
              {loading
                ? <Skeleton className="h-8 w-12 rounded bg-white/5 mt-1" />
                : <p className="text-2xl font-semibold text-orange-400">{iss?.high ?? 0}</p>
              }
              <p className="text-muted-foreground mt-1 text-xs">Require prompt attention</p>
            </div>
            <div className="glass-chip rounded-xl p-4">
              <p className="text-muted-foreground text-xs">Endpoints with sensitive data</p>
              {loading
                ? <Skeleton className="h-8 w-12 rounded bg-white/5 mt-1" />
                : <p className="text-2xl font-semibold text-amber-300">
                    {summary ? (summary.sensitive_data.pii + summary.sensitive_data.financial + summary.sensitive_data.secrets + summary.sensitive_data.other) : 0}
                  </p>
              }
              <p className="text-muted-foreground mt-1 text-xs">PII, credentials, financial data observed</p>
            </div>
          </CardContent>
        </Card>

        {/* Recent alerts — live open critical/high issues */}
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Recent Scanner Alerts</CardTitle>
            <CardDescription>
              {loading ? "Loading…" : iss && (iss.critical + iss.high) > 0
                ? `${iss.critical + iss.high} high-priority findings require attention`
                : "All clear — no critical or high findings open"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg bg-white/5" />)}
              </div>
            ) : iss && (iss.critical + iss.high) > 0 ? (
              <div className="space-y-2">
                {iss.critical > 0 && (
                  <div className="glass-chip flex items-center gap-3 rounded-lg px-3 py-2 text-sm border border-rose-500/15">
                    <AlertTriangle className="size-4 text-rose-400 shrink-0" />
                    <span><span className="text-rose-400 font-semibold">[CRITICAL]</span> {iss.critical} critical vulnerabilit{iss.critical !== 1 ? "ies" : "y"} detected — immediate remediation required</span>
                  </div>
                )}
                {iss.high > 0 && (
                  <div className="glass-chip flex items-center gap-3 rounded-lg px-3 py-2 text-sm border border-orange-500/15">
                    <AlertTriangle className="size-4 text-orange-400 shrink-0" />
                    <span><span className="text-orange-400 font-semibold">[HIGH]</span> {iss.high} high-severity finding{iss.high !== 1 ? "s" : ""} open — review and triage</span>
                  </div>
                )}
                {iss.medium > 0 && (
                  <div className="glass-chip flex items-center gap-3 rounded-lg px-3 py-2 text-sm border border-amber-500/15">
                    <AlertTriangle className="size-4 text-amber-400 shrink-0" />
                    <span><span className="text-amber-400 font-semibold">[MEDIUM]</span> {iss.medium} medium-severity finding{iss.medium !== 1 ? "s" : ""} pending</span>
                  </div>
                )}
                <div className="pt-1">
                  <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-slate-200">
                    <Link href="/dashboard/findings"><Bug className="size-3.5 mr-1.5" />View all findings →</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg px-3 py-4 text-sm text-emerald-400 bg-emerald-500/5 border border-emerald-500/15">
                <ShieldCheck className="size-5 shrink-0" />
                {iss?.total === 0
                  ? "No findings yet — run scans on your discovered endpoints."
                  : "No critical or high findings open. Keep up the great work!"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick-start CTA when no data */}
        {!loading && (inv?.total ?? 0) === 0 && (
          <Card className="glass-panel border-purple-500/20 bg-purple-500/5">
            <CardContent className="flex flex-col sm:flex-row items-center gap-4 py-6 px-5">
              <div className="flex-1">
                <p className="font-semibold text-purple-300">No endpoints discovered yet</p>
                <p className="text-sm text-muted-foreground mt-0.5">Add an eBPF agent or active URL scan to start discovering your API surface.</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button asChild size="sm" className="bg-purple-600 hover:bg-purple-500 text-white border-0">
                  <Link href="/dashboard/agents">Add Data Source</Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="glass-chip border-white/10">
                  <Link href="/dashboard/scan">Run a Scan</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
