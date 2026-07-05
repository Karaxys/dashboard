"use client"
import React, { useCallback, useEffect, useState } from "react"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { ShieldCheck, Plus, Trash2, Save, RefreshCcw, Info } from "lucide-react"
import { apiFetch } from "@/lib/api"

type Behaviour = "block" | "warn" | "alert"
type RuleAction = "block" | "warn" | "alert" | "allow"

interface ScannerConfig { enabled: boolean; threshold: number; behaviour: Behaviour }
interface RuleMatch { tool_names?: string[]; input_pattern?: string; egress_hosts?: string[] }
interface Rule { id: string; match: RuleMatch; action: RuleAction; reason?: string }
interface Policy {
  policy_version: number
  scanners: Record<string, ScannerConfig>
  rules: Rule[]
  fail_mode: "open" | "closed"
}

const SCANNERS: { key: string; label: string }[] = [
  { key: "prompt_injection", label: "Prompt Injection" },
  { key: "sensitive_data", label: "Sensitive Data" },
  { key: "intent_analysis", label: "Intent Analysis" },
  { key: "ban_content", label: "Banned Content" },
]

const csv = (a?: string[]) => (a || []).join(", ")
const parseCsv = (s: string) => s.split(",").map(x => x.trim()).filter(Boolean)

export default function AgenticPolicyPage() {
  const [policy, setPolicy] = useState<Policy | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const p = await apiFetch<Policy>("/v1/agentic/policy")
      p.scanners = p.scanners || {}
      p.rules = p.rules || []
      setPolicy(p)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load policy")
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!policy) return
    setSaving(true); setError(null); setNotice(null)
    try {
      const saved = await apiFetch<Policy>("/v1/agentic/policy", { method: "PUT", body: JSON.stringify(policy) })
      setPolicy(saved)
      setNotice(`Saved — policy version ${saved.policy_version}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save policy")
    } finally { setSaving(false) }
  }

  const setScanner = (key: string, patch: Partial<ScannerConfig>) => {
    setPolicy(p => p && ({ ...p, scanners: { ...p.scanners, [key]: { ...p.scanners[key], ...patch } } }))
  }
  const setRule = (i: number, patch: Partial<Rule>) => {
    setPolicy(p => p && ({ ...p, rules: p.rules.map((r, idx) => idx === i ? { ...r, ...patch } : r) }))
  }
  const addRule = () => setPolicy(p => p && ({ ...p, rules: [...p.rules, { id: `rule-${p.rules.length + 1}`, match: {}, action: "block" }] }))
  const removeRule = (i: number) => setPolicy(p => p && ({ ...p, rules: p.rules.filter((_, idx) => idx !== i) }))

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
              <BreadcrumbItem><BreadcrumbPage>Policy</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 p-5 pt-0 max-w-4xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="size-6 text-emerald-400" /> Guardrail Policy
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {policy ? `Version ${policy.policy_version}` : "—"} · how the shield decides to allow, warn, or block.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="glass-chip border-white/10">
              <RefreshCcw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} /> Reload
            </Button>
            <Button size="sm" onClick={save} disabled={saving || !policy} className="bg-emerald-600 hover:bg-emerald-500 text-white border-0">
              <Save className="mr-2 size-4" /> {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        {error && <div className="glass-chip rounded-lg p-3 text-sm text-rose-400 border border-rose-500/20">{error}</div>}
        {notice && <div className="glass-chip rounded-lg p-3 text-sm text-emerald-400 border border-emerald-500/20">{notice}</div>}

        {loading || !policy ? (
          <div className="glass-chip rounded-xl py-16 text-center text-muted-foreground text-sm">Loading policy…</div>
        ) : (
          <>
            {/* Deterministic rules — active now */}
            <Card className="glass-panel">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">Rules</CardTitle>
                <CardDescription className="text-xs">
                  Deterministic, always-on matching over tool calls and prompts. These run with no ML.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {policy.rules.length === 0 && (
                  <p className="text-xs text-muted-foreground">No custom rules. Built-in protections (destructive commands, remote-code execution, secret exposure) are always active.</p>
                )}
                {policy.rules.map((rule, i) => (
                  <div key={i} className="rounded-lg border border-white/10 p-3 space-y-2 bg-black/20">
                    <div className="flex items-center gap-2">
                      <Input value={rule.id} onChange={e => setRule(i, { id: e.target.value })} placeholder="rule id" className="h-8 bg-black/20 border-white/10 text-sm font-mono max-w-[200px]" />
                      <Select value={rule.action} onValueChange={v => setRule(i, { action: v as RuleAction })}>
                        <SelectTrigger className="h-8 w-28 bg-black/20 border-white/10 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                          {["block", "warn", "alert", "allow"].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" onClick={() => removeRule(i)} className="ml-auto text-muted-foreground hover:text-rose-400 h-8 px-2">
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-2">
                      <Input value={csv(rule.match.tool_names)} onChange={e => setRule(i, { match: { ...rule.match, tool_names: parseCsv(e.target.value) } })} placeholder="tool names (csv)" className="h-8 bg-black/20 border-white/10 text-xs" />
                      <Input value={rule.match.input_pattern || ""} onChange={e => setRule(i, { match: { ...rule.match, input_pattern: e.target.value } })} placeholder="input regex" className="h-8 bg-black/20 border-white/10 text-xs font-mono" />
                      <Input value={csv(rule.match.egress_hosts)} onChange={e => setRule(i, { match: { ...rule.match, egress_hosts: parseCsv(e.target.value) } })} placeholder="egress hosts (csv)" className="h-8 bg-black/20 border-white/10 text-xs" />
                    </div>
                    <Input value={rule.reason || ""} onChange={e => setRule(i, { reason: e.target.value })} placeholder="reason (shown when it fires)" className="h-8 bg-black/20 border-white/10 text-xs" />
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addRule} className="glass-chip border-white/10">
                  <Plus className="mr-2 size-4" /> Add rule
                </Button>
              </CardContent>
            </Card>

            {/* ML scanners — configuration stored, active when the guardrail service is enabled */}
            <Card className="glass-panel">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">ML Scanners</CardTitle>
                <CardDescription className="text-xs flex items-center gap-1.5">
                  <Info className="size-3.5 text-amber-400" />
                  Configuration is saved now; scanners apply once the optional guardrail service is enabled.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {SCANNERS.map(({ key, label }) => {
                  const cfg = policy.scanners[key] || { enabled: false, threshold: 0.8, behaviour: "warn" as Behaviour }
                  return (
                    <div key={key} className="flex items-center gap-3 rounded-lg border border-white/10 p-2.5 bg-black/20">
                      <button
                        onClick={() => setScanner(key, { enabled: !cfg.enabled })}
                        className={`px-2 py-1 rounded text-xs font-semibold border ${cfg.enabled ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-slate-500/10 text-slate-400 border-white/10"}`}
                      >
                        {cfg.enabled ? "on" : "off"}
                      </button>
                      <span className="text-sm text-slate-200 flex-1">{label}</span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        threshold
                        <Input type="number" min={0} max={1} step={0.05} value={cfg.threshold}
                          onChange={e => setScanner(key, { threshold: parseFloat(e.target.value) })}
                          className="h-7 w-20 bg-black/20 border-white/10 text-xs" />
                      </div>
                      <Select value={cfg.behaviour} onValueChange={v => setScanner(key, { behaviour: v as Behaviour })}>
                        <SelectTrigger className="h-7 w-24 bg-black/20 border-white/10 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                          {["block", "warn", "alert"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Fail mode */}
            <Card className="glass-panel">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Fail mode</CardTitle>
                <CardDescription className="text-xs">What happens when the guardrail can’t be reached.</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                {(["open", "closed"] as const).map(mode => (
                  <button key={mode} onClick={() => setPolicy(p => p && ({ ...p, fail_mode: mode }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${policy.fail_mode === mode ? "bg-blue-500/15 text-blue-300 border-blue-500/30" : "border-white/10 text-muted-foreground hover:border-white/20"}`}>
                    {mode === "open" ? "Fail open (allow)" : "Fail closed (block)"}
                    {policy.fail_mode === mode && <Badge variant="outline" className="ml-2 text-xs bg-blue-500/10 text-blue-400 border-blue-500/20">active</Badge>}
                  </button>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
