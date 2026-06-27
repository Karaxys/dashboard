"use client"
import React, { useCallback, useEffect, useState } from "react"
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
  AlertTriangle, Check, CheckCircle2, Clock, Database,
  Loader2, Lock, RefreshCcw, Settings2, Shield, ShieldCheck,
} from "lucide-react"
import { apiFetch } from "@/lib/api"

interface SecuritySettings {
  id: string
  account_id: string
  retention_hours: number
  max_traffic_events: number
  redaction_enabled: boolean
  updated_at: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SecuritySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Form state
  const [retentionHours, setRetentionHours] = useState(24)
  const [maxEvents, setMaxEvents] = useState(10000)

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<SecuritySettings>("/settings/security")
      setSettings(data)
      setRetentionHours(data.retention_hours)
      setMaxEvents(data.max_traffic_events)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load settings")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const saveSettings = async () => {
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      const data = await apiFetch<SecuritySettings>("/settings/security", {
        method: "PUT",
        body: JSON.stringify({
          retention_hours: retentionHours,
          max_traffic_events: maxEvents,
        }),
      })
      setSettings(data)
      setRetentionHours(data.retention_hours)
      setMaxEvents(data.max_traffic_events)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = settings
    ? retentionHours !== settings.retention_hours || maxEvents !== settings.max_traffic_events
    : false

  const retentionValid = retentionHours >= 1 && retentionHours <= 168
  const eventsValid = maxEvents >= 100 && maxEvents <= 100000

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
              <BreadcrumbItem><BreadcrumbPage>Settings</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 p-5 pt-0 max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings2 className="size-6 text-amber-400" />
              Settings
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Account-level retention, redaction, and data policy configuration.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchSettings} disabled={loading} className="glass-chip border-white/10">
            <RefreshCcw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
        </div>

        {error && (
          <div className="glass-chip rounded-xl p-4 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />{error}
          </div>
        )}

        {/* Data Retention */}
        <Card className="glass-panel">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="size-4 text-blue-400" />
              Data Retention
            </CardTitle>
            <CardDescription className="text-xs">
              Controls how long captured traffic logs and metric events are kept. Shorter retention reduces storage, longer enables deeper historical analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 rounded-lg bg-white/5" />
                <Skeleton className="h-10 rounded-lg bg-white/5" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-200">Traffic Log Retention (hours)</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={1}
                      max={168}
                      value={retentionHours}
                      onChange={e => setRetentionHours(Number(e.target.value))}
                      className={`max-w-xs bg-black/20 border-white/10 text-slate-200 ${!retentionValid ? "border-rose-500/50" : ""}`}
                    />
                    <p className="text-xs text-muted-foreground">{retentionHours < 24 ? `${retentionHours}h` : `${(retentionHours / 24).toFixed(1)} days`}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Between 1 hour and 168 hours (7 days). Default: 24h.</p>
                  {!retentionValid && <p className="text-xs text-rose-400">Must be between 1 and 168 hours.</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-200">Max Traffic Events Per Endpoint</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={100}
                      max={100000}
                      step={100}
                      value={maxEvents}
                      onChange={e => setMaxEvents(Number(e.target.value))}
                      className={`max-w-xs bg-black/20 border-white/10 text-slate-200 ${!eventsValid ? "border-rose-500/50" : ""}`}
                    />
                    <p className="text-xs text-muted-foreground">{maxEvents.toLocaleString()} events</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Between 100 and 100,000. Controls storage cap per endpoint. Default: 10,000.</p>
                  {!eventsValid && <p className="text-xs text-rose-400">Must be between 100 and 100,000.</p>}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Redaction Policy */}
        <Card className="glass-panel">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="size-4 text-emerald-400" />
              Redaction Policy
            </CardTitle>
            <CardDescription className="text-xs">
              Sensitive values are automatically scrubbed before any data is stored. This cannot be disabled.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
              <ShieldCheck className="size-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-300">Redaction Always Enabled</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Authorization headers, API keys, JWTs, passwords, and PII are stripped from all stored traffic samples and scan evidence.
                </p>
              </div>
              <Badge variant="outline" className="ml-auto shrink-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Active</Badge>
            </div>

            <div className="grid sm:grid-cols-2 gap-2 text-xs">
              {[
                "Authorization headers",
                "Cookie values",
                "API keys & tokens",
                "JWT contents",
                "AWS / cloud credentials",
                "Passwords in request bodies",
                "Credit card numbers",
                "SSN / government IDs",
              ].map(item => (
                <div key={item} className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="size-3 text-emerald-500/60 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Scan Policy (read-only, env-configured) */}
        <Card className="glass-panel">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="size-4 text-amber-400" />
              Scan Policy
            </CardTitle>
            <CardDescription className="text-xs">
              Scanner safety controls are configured via environment variables on the backend. Contact your administrator to change these.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "SSRF Protection", desc: "Blocks private/internal network scan targets in production.", active: true },
              { label: "Metadata Endpoint Block", desc: "Cloud metadata (169.254.169.254, etc.) is always blocked.", active: true },
              { label: "Target Allowlist", desc: "Configurable via KARAXYS_SCAN_TARGET_ALLOWLIST env var.", active: false },
              { label: "Target Denylist", desc: "Configurable via KARAXYS_SCAN_TARGET_DENYLIST env var.", active: false },
              { label: "Rate Limiting per Target", desc: "Configurable via KARAXYS_SCANNER_TARGET_JOBS_PER_WINDOW.", active: true },
              { label: "Global Concurrency Cap", desc: "Configurable via KARAXYS_SCANNER_GLOBAL_CONCURRENCY.", active: true },
            ].map(policy => (
              <div key={policy.label} className="flex items-start gap-3 p-3 rounded-lg bg-black/10 border border-white/5">
                <div className={`mt-0.5 size-2 rounded-full shrink-0 ${policy.active ? "bg-emerald-400" : "bg-slate-600"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200">{policy.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{policy.desc}</p>
                </div>
                <Badge variant="outline" className={`text-xs shrink-0 ${policy.active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20"}`}>
                  {policy.active ? "Enforced" : "Optional"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Save button */}
        {!loading && (
          <div className="flex items-center gap-3 pb-4">
            <Button
              onClick={saveSettings}
              disabled={saving || !hasChanges || !retentionValid || !eventsValid}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold border-0"
            >
              {saving
                ? <><Loader2 className="size-4 mr-2 animate-spin" />Saving…</>
                : saved
                ? <><Check className="size-4 mr-2" />Saved</>
                : "Save Changes"
              }
            </Button>
            {hasChanges && !saving && !saved && (
              <Button
                variant="ghost" size="sm"
                onClick={() => { setRetentionHours(settings!.retention_hours); setMaxEvents(settings!.max_traffic_events) }}
                className="text-muted-foreground"
              >
                Reset
              </Button>
            )}
            {saveError && <p className="text-xs text-rose-400">{saveError}</p>}
            {settings && (
              <p className="text-xs text-muted-foreground ml-auto">
                Last updated: {new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(settings.updated_at))}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
