"use client"
import React, { Suspense, useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Play, ShieldAlert, Target, KeyRound, Zap, Layers, Radar,
  AlertTriangle, Terminal, Globe, Braces, Loader2, ChevronDown,
  Copy, Check, ShieldCheck, ShieldX, ExternalLink, Crosshair,
  FlaskConical, Radio, Code2, ListChecks, Boxes,
} from "lucide-react"
import { apiFetch } from "@/lib/api"

// ─── Types ──────────────────────────────────────────────────────────────────
interface ScanResult {
  test_type: string
  vulnerable: boolean
  severity: string
  description: string
  response_status: number
  response_body: string
  proof: string
  out_of_band?: boolean
  similarity_score?: number
  created_at?: string
}

interface ScanJobResponse {
  job_id: string
  status: "queued" | "running" | "completed" | "failed" | "cancelled" | "timed_out"
  inventory_id: string
  test_type: string
  error?: string
  results_count?: number
}

interface SuiteTriggerResponse {
  suite_id: string
  suite?: string
  job_count: number
  test_types: string[]
  skipped?: string[]
  jobs: ScanJobResponse[]
}

interface SuiteStatusResponse {
  suite_id: string
  inventory_id?: string
  job_count: number
  status_counts: Record<string, number>
  total_findings: number
  completed: boolean
  jobs: ScanJobResponse[]
}

interface ApiInventory {
  ID: string
  Method: string
  BaseURL: string
  PathPattern: string
  RiskLevel?: string
}

interface EndpointDetails extends ApiInventory {
  SampleHeaders?: Record<string, string[]>
  SampleReqBody?: string
}

interface TestCase {
  id: string
  label: string
  fullLabel: string
  desc: string
  category: string
  requiresAttackerToken?: boolean
}

interface TestTypeMeta {
  test_type: string
  category: string
  severity: string
  description: string
  requires_attacker_auth: boolean
}

interface SuitePreset {
  id: string
  name: string
  description: string
  test_types: string[] | null
}

// Complete built-in list. Offline fallback + source of rich display labels; the
// live registry (/scan/test-types) is merged on top so community/new templates
// appear automatically.
const STATIC_TEST_CASES: TestCase[] = [
  { id: "BOLA", label: "BOLA", fullLabel: "Broken Object Level Authorization", desc: "Check if User B can access User A's data via token swap.", category: "Authorization", requiresAttackerToken: true },
  { id: "BFLA", label: "BFLA", fullLabel: "Broken Function Level Authorization", desc: "Check if a standard user can perform privileged actions via method swap.", category: "Authorization" },
  { id: "BROKEN_USER_AUTH", label: "Broken Auth", fullLabel: "Broken User Authentication", desc: "Check if endpoint allows anonymous access.", category: "Authentication" },
  { id: "BOLA_PARAMETER_POLLUTION", label: "Param Pollution", fullLabel: "BOLA Parameter Pollution", desc: "Send duplicate IDs to confuse auth middleware.", category: "Authorization", requiresAttackerToken: true },
  { id: "BOLA_CHAINED_ENUMERATION", label: "BOLA Chained", fullLabel: "BOLA via Chained Object-ID Enumeration", desc: "Extract an object ID from a listing, then read it directly with attacker creds.", category: "Authorization", requiresAttackerToken: true },
  { id: "SWAGGER_CHECK", label: "Swagger", fullLabel: "Swagger/OpenAPI Exposure", desc: "Find hidden API documentation endpoints.", category: "Information" },
  { id: "JWT_NONE_ALGO", label: "JWT None", fullLabel: "JWT None Algorithm Attack", desc: "Check if server accepts unsigned JWT (alg: none).", category: "Authentication" },
  { id: "JWT_INVALID_SIGNATURE", label: "JWT Sig", fullLabel: "JWT Invalid Signature", desc: "Check if server verifies cryptographic signature.", category: "Authentication" },
  { id: "OPEN_REDIRECT", label: "Redirect", fullLabel: "Open Redirect", desc: "Check if URL params can redirect to malicious sites.", category: "Injection" },
  { id: "REFLECTED_XSS", label: "Reflected XSS", fullLabel: "Reflected Cross-Site Scripting", desc: "Inject a script marker and check for unescaped reflection.", category: "Injection" },
  { id: "SQL_INJECTION", label: "SQL Injection", fullLabel: "Error-Based SQL Injection", desc: "Inject SQL metacharacters and detect leaked database errors.", category: "Injection" },
  { id: "COMMAND_INJECTION", label: "Command Injection", fullLabel: "OS Command Injection", desc: "Inject shell metacharacters and detect reflected command output.", category: "Injection" },
  { id: "SSRF", label: "SSRF", fullLabel: "Server-Side Request Forgery (Direct)", desc: "Inject internal/cloud-metadata URLs and detect reflected fetched content.", category: "Injection" },
  { id: "SSRF_BLIND_OOB", label: "SSRF (Blind)", fullLabel: "Blind SSRF (Out-of-Band)", desc: "Detect blind SSRF via an out-of-band callback (requires OOB enabled).", category: "Injection" },
  { id: "CORS_MISCONFIGURATION", label: "CORS", fullLabel: "CORS Misconfiguration", desc: "Check if the server reflects an attacker Origin with credentials.", category: "Misconfiguration" },
  { id: "MASS_ASSIGNMENT", label: "Mass Assignment", fullLabel: "Mass Assignment / Privilege Escalation", desc: "Inject privileged fields into a write request and check acceptance.", category: "Authorization" },
  { id: "DEFAULT_CREDENTIALS", label: "Default Creds", fullLabel: "Default / Weak Credentials", desc: "Submit common default credential pairs to the auth endpoint.", category: "Authentication" },
  { id: "EXPOSED_METRICS", label: "Metrics", fullLabel: "Exposed Metrics/Debug", desc: "Find internal DevOps monitoring endpoints.", category: "Information" },
]

const CATEGORY_LABELS: Record<string, string> = {
  access_control: "Authorization",
  authentication: "Authentication",
  discovery: "Information",
  exposure: "Information",
  redirect: "Injection",
  injection: "Injection",
  misconfiguration: "Misconfiguration",
  community: "Community",
}

const ACRONYMS = new Set(["XSS", "SQL", "SSRF", "BOLA", "BFLA", "JWT", "CORS", "OOB", "API", "URL", "IDOR"])

function humanizeTestType(id: string): string {
  return id.split("_").map((token) => {
    const upper = token.toUpperCase()
    if (ACRONYMS.has(upper)) return upper
    return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase()
  }).join(" ")
}

const STATIC_META = new Map(STATIC_TEST_CASES.map((tc) => [tc.id, tc]))

function mergeTestTypes(metas: TestTypeMeta[]): TestCase[] {
  return metas.map((meta) => {
    const known = STATIC_META.get(meta.test_type)
    const humanized = humanizeTestType(meta.test_type)
    return {
      id: meta.test_type,
      label: known?.label ?? humanized,
      fullLabel: known?.fullLabel ?? humanized,
      desc: meta.description || known?.desc || "",
      category: known?.category ?? CATEGORY_LABELS[meta.category] ?? "Other",
      requiresAttackerToken: meta.requires_attacker_auth,
    }
  })
}

const STATIC_PRESETS: SuitePreset[] = [
  { id: "OWASP_API_TOP_10", name: "OWASP API Security Top 10", description: "Broad coverage across the OWASP API Security Top 10 risk categories.", test_types: [] },
  { id: "ACCESS_CONTROL", name: "Broken Access Control", description: "Object- and function-level authorization (OWASP API1/API3/API5).", test_types: [] },
  { id: "AUTHENTICATION", name: "Broken Authentication", description: "Anonymous access, JWT flaws and default credentials (OWASP API2).", test_types: [] },
  { id: "INJECTION", name: "Injection", description: "Reflected XSS, SQL injection, command injection and open redirect.", test_types: [] },
  { id: "SSRF", name: "Server-Side Request Forgery", description: "In-band and blind out-of-band SSRF (OWASP API7).", test_types: [] },
  { id: "MISCONFIGURATION", name: "Security Misconfiguration", description: "CORS, exposed metrics/docs and inventory exposure (OWASP API8/API9).", test_types: [] },
  { id: "FULL", name: "Full Scan", description: "Every test type applicable to the endpoint, including community templates.", test_types: null },
]

const SELECT_ENDPOINT_DEFAULT = "__SELECT_ENDPOINT__"
const SELECT_TEST_CASE_DEFAULT = "__SELECT_TEST_CASE__"

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled", "timed_out"])

// ─── UI helpers ─────────────────────────────────────────────────────────────
const getSeverityColor = (sev: string) => {
  switch (sev?.toLowerCase()) {
    case "critical": return "bg-rose-500/15 text-rose-400 border-rose-500/30"
    case "high":     return "bg-orange-500/15 text-orange-400 border-orange-500/30"
    case "medium":   return "bg-amber-500/15 text-amber-400 border-amber-500/30"
    case "low":      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    default:         return "bg-slate-500/15 text-slate-400 border-slate-500/30"
  }
}
const getMethodColor = (method: string) => {
  switch (method?.toUpperCase()) {
    case "GET": return "text-blue-400 bg-blue-500/10 border-blue-500/20"
    case "POST": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    case "PUT": return "text-amber-400 bg-amber-500/10 border-amber-500/20"
    case "DELETE": return "text-rose-400 bg-rose-500/10 border-rose-500/20"
    case "PATCH": return "text-purple-400 bg-purple-500/10 border-purple-500/20"
    default: return "text-slate-400 bg-slate-500/10 border-slate-500/20"
  }
}
const formatJSON = (str: string) => {
  if (!str) return ""
  try { return JSON.stringify(JSON.parse(str), null, 2) } catch { return str }
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="glass-page min-h-full" />}>
      <ScanPageContent />
    </Suspense>
  )
}

function ScanPageContent() {
  const searchParams = useSearchParams()

  // Shared data
  const [endpoints, setEndpoints] = useState<ApiInventory[]>([])
  const [selectedEndpointDetails, setSelectedEndpointDetails] = useState<EndpointDetails | null>(null)
  const [testCases, setTestCases] = useState<TestCase[]>(STATIC_TEST_CASES)
  const [suitePresets, setSuitePresets] = useState<SuitePreset[]>(STATIC_PRESETS)

  // Shared form
  const [mode, setMode] = useState<"suite" | "single">("suite")
  const [inventoryId, setInventoryId] = useState("")
  const [attackerToken, setAttackerToken] = useState("")
  const [victimToken, setVictimToken] = useState("")
  const [attackMethod, setAttackMethod] = useState("DELETE")

  // Single-test form
  const [testType, setTestType] = useState("")

  // Suite form
  const [suitePreset, setSuitePreset] = useState("OWASP_API_TOP_10")

  // Run state (shared)
  const [isScanning, setIsScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [scanResults, setScanResults] = useState<ScanResult[] | null>(null)

  // Single-test run
  const [scanJobId, setScanJobId] = useState<string | null>(null)
  const [scanStatus, setScanStatus] = useState<ScanJobResponse["status"] | null>(null)

  // Suite run
  const [suiteTrigger, setSuiteTrigger] = useState<SuiteTriggerResponse | null>(null)
  const [suiteStatus, setSuiteStatus] = useState<SuiteStatusResponse | null>(null)

  useEffect(() => {
    const fetchEndpoints = async () => {
      try {
        const data = await apiFetch<{ data: ApiInventory[] }>("/inventory?limit=500")
        setEndpoints(data.data || [])
      } catch (err) { console.error("Failed to fetch endpoints", err) }
    }
    const fetchTestTypes = async () => {
      try {
        const data = await apiFetch<{ data: TestTypeMeta[] }>("/scan/test-types")
        if (data.data?.length) setTestCases(mergeTestTypes(data.data))
      } catch (err) { console.error("Failed to fetch test types; using built-in list", err) }
    }
    const fetchPresets = async () => {
      try {
        const data = await apiFetch<{ data: SuitePreset[] }>("/scan/suite-presets")
        if (data.data?.length) setSuitePresets(data.data)
      } catch (err) { console.error("Failed to fetch suite presets; using built-in list", err) }
    }
    fetchEndpoints(); fetchTestTypes(); fetchPresets()
    const idFromUrl = searchParams.get("id")
    if (idFromUrl) setInventoryId(idFromUrl)
  }, [searchParams])

  useEffect(() => {
    if (!inventoryId) { setSelectedEndpointDetails(null); return }
    const fetchDetails = async () => {
      try {
        const data = await apiFetch<EndpointDetails>(`/inventory/${inventoryId}`)
        setSelectedEndpointDetails(data)
      } catch (err) { console.error("Failed to fetch endpoint details", err) }
    }
    fetchDetails()
  }, [inventoryId])

  const selectedTestCase = useMemo(() => testCases.find(t => t.id === testType), [testCases, testType])
  const selectedPreset = useMemo(() => suitePresets.find(p => p.id === suitePreset), [suitePresets, suitePreset])
  const needsAttackerToken = mode === "single"
    ? (selectedTestCase?.requiresAttackerToken ?? false)
    : true // suites may include BOLA-family; attacker token is optional but surfaced
  const needsAttackMethod = mode === "single" && testType === "BFLA"

  const buildAuthContexts = useCallback(() => {
    const ctx: Record<string, string> = {}
    if (attackerToken.trim()) ctx.attacker = attackerToken.trim()
    if (victimToken.trim()) ctx.victim = victimToken.trim()
    return Object.keys(ctx).length ? ctx : undefined
  }, [attackerToken, victimToken])

  const resetRun = () => {
    setScanResults(null); setScanError(null)
    setScanJobId(null); setScanStatus(null)
    setSuiteTrigger(null); setSuiteStatus(null)
  }

  // ─── Single-test flow ───────────────────────────────────────────────────
  const pollScanJob = async (jobId: string): Promise<ScanResult[]> => {
    for (let attempt = 0; attempt < 90; attempt++) {
      await new Promise(r => setTimeout(r, 2000))
      const job = await apiFetch<ScanJobResponse>(`/scan-jobs/${jobId}`)
      setScanStatus(job.status)
      if (job.status === "failed") throw new Error(job.error || "Scanner worker failed the scan job.")
      if (TERMINAL_STATUSES.has(job.status)) {
        const payload = await apiFetch<{ data: ScanResult[] }>(`/scan-results?job_id=${jobId}&limit=100`)
        return payload.data || []
      }
    }
    throw new Error("Scan job timed out while waiting for scanner-worker.")
  }

  const handleStartSingle = async () => {
    if (!inventoryId || !testType) return
    setIsScanning(true); resetRun()
    try {
      const job = await apiFetch<ScanJobResponse>("/scan", {
        method: "POST",
        body: JSON.stringify({
          inventory_id: inventoryId,
          test_type: testType,
          attack_method: needsAttackMethod ? attackMethod : "",
          attacker_token: needsAttackerToken ? attackerToken : "",
        }),
      })
      setScanJobId(job.job_id); setScanStatus(job.status)
      setScanResults(await pollScanJob(job.job_id))
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "An error occurred during the scan.")
    } finally { setIsScanning(false) }
  }

  // ─── Suite flow ─────────────────────────────────────────────────────────
  const pollSuite = async (suiteId: string): Promise<void> => {
    for (let attempt = 0; attempt < 150; attempt++) {
      await new Promise(r => setTimeout(r, 2000))
      const status = await apiFetch<SuiteStatusResponse>(`/scan/suites/${suiteId}`)
      setSuiteStatus(status)
      if (status.completed) {
        const payload = await apiFetch<{ data: ScanResult[] }>(`/scan-results?suite_id=${suiteId}&limit=200`)
        setScanResults(payload.data || [])
        return
      }
    }
    throw new Error("Suite timed out while waiting for scanner-worker.")
  }

  const handleStartSuite = async () => {
    if (!inventoryId || !suitePreset) return
    setIsScanning(true); resetRun()
    try {
      const trigger = await apiFetch<SuiteTriggerResponse>("/scan/suite", {
        method: "POST",
        body: JSON.stringify({
          inventory_id: inventoryId,
          suite: suitePreset,
          auth_contexts: buildAuthContexts(),
          attack_method: attackMethod,
          timeout_seconds: 60,
        }),
      })
      setSuiteTrigger(trigger)
      await pollSuite(trigger.suite_id)
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "An error occurred launching the suite.")
    } finally { setIsScanning(false) }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === "suite") handleStartSuite(); else handleStartSingle()
  }

  const canLaunch = mode === "suite" ? !!(inventoryId && suitePreset) : !!(inventoryId && testType)

  const [copiedId, setCopiedId] = useState<string | null>(null)
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text); setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const findingsCount = scanResults?.length ?? 0
  const severityTally = useMemo(() => {
    const t: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 }
    for (const r of scanResults || []) {
      const s = r.severity?.toLowerCase()
      if (s in t) t[s]++
    }
    return t
  }, [scanResults])

  return (
    <div className="glass-page min-h-full">
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex w-full items-center gap-3 px-4">
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
              <BreadcrumbItem><BreadcrumbPage>Active Scanner</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 p-5 pt-0">
        <div className="grid gap-5 xl:grid-cols-3">
          {/* ── Configuration ── */}
          <Card className="glass-panel border-white/10 xl:col-span-2">
            <CardHeader className="pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <Crosshair className="size-5 text-rose-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Configure Scan</CardTitle>
                  <CardDescription>Run an OWASP-mapped suite or a single targeted test</CardDescription>
                </div>
              </div>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6 pt-5">
                {/* Mode toggle */}
                <Tabs value={mode} onValueChange={(v) => { setMode(v as "suite" | "single"); resetRun() }}>
                  <TabsList className="grid w-full grid-cols-2 bg-black/30 border border-white/10">
                    <TabsTrigger value="suite" className="data-[state=active]:bg-rose-500/15 data-[state=active]:text-rose-300">
                      <Layers className="size-4 mr-2" /> Suite Scan
                    </TabsTrigger>
                    <TabsTrigger value="single" className="data-[state=active]:bg-purple-500/15 data-[state=active]:text-purple-300">
                      <FlaskConical className="size-4 mr-2" /> Single Test
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Target endpoint */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-sm font-medium text-slate-200">
                    <Target className="size-4 text-emerald-400" /> Target Endpoint
                  </Label>
                  <Select
                    value={inventoryId || SELECT_ENDPOINT_DEFAULT}
                    onValueChange={(v) => setInventoryId(v === SELECT_ENDPOINT_DEFAULT ? "" : v)}
                    required
                  >
                    <SelectTrigger className="h-11 bg-black/30 border-white/10 text-slate-200">
                      <SelectValue placeholder="Select an endpoint to scan" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-slate-200 max-h-80">
                      <SelectItem value={SELECT_ENDPOINT_DEFAULT} className="text-muted-foreground">Select endpoint...</SelectItem>
                      {endpoints.map(ep => (
                        <SelectItem key={ep.ID} value={ep.ID} className="py-2.5">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-xs font-mono ${getMethodColor(ep.Method)}`}>{ep.Method}</Badge>
                            <span className="font-mono text-sm">{ep.PathPattern}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedEndpointDetails && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-black/20 px-3 py-2 rounded-lg border border-white/5">
                      <Globe className="size-3" />
                      <span className="text-slate-400">{selectedEndpointDetails.BaseURL}</span>
                    </div>
                  )}
                </div>

                {/* Mode-specific selectors */}
                {mode === "suite" ? (
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2 text-sm font-medium text-slate-200">
                      <Boxes className="size-4 text-rose-400" /> Test Suite
                    </Label>
                    <Select value={suitePreset} onValueChange={setSuitePreset} required>
                      <SelectTrigger className="h-11 bg-black/30 border-white/10 text-slate-200">
                        <SelectValue placeholder="Select a suite" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                        {suitePresets.map(p => (
                          <SelectItem key={p.id} value={p.id} className="py-2.5">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs bg-rose-500/10 text-rose-400 border-rose-500/20">
                                {p.test_types === null ? "ALL" : `${(p.test_types || []).length || "•"}`}
                              </Badge>
                              <span>{p.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedPreset && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-rose-500/5 border border-rose-500/10">
                        <ListChecks className="size-4 text-rose-400 mt-0.5 shrink-0" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-rose-300">{selectedPreset.name}</p>
                          <p className="text-xs text-muted-foreground">{selectedPreset.description}</p>
                          <p className="text-[11px] text-muted-foreground/70">
                            Only tests applicable to the selected endpoint are run — the rest are skipped automatically.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2 text-sm font-medium text-slate-200">
                      <FlaskConical className="size-4 text-purple-400" /> Vulnerability Test Case
                    </Label>
                    <Select
                      value={testType || SELECT_TEST_CASE_DEFAULT}
                      onValueChange={(v) => setTestType(v === SELECT_TEST_CASE_DEFAULT ? "" : v)}
                      required
                    >
                      <SelectTrigger className="h-11 bg-black/30 border-white/10 text-slate-200">
                        <SelectValue placeholder="Select test case" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10 text-slate-200 max-h-80">
                        <SelectItem value={SELECT_TEST_CASE_DEFAULT} className="text-muted-foreground">Select test case...</SelectItem>
                        {testCases.map(tc => (
                          <SelectItem key={tc.id} value={tc.id} className="py-2.5">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/20">{tc.category}</Badge>
                              <span>{tc.fullLabel}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedTestCase && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                        <Zap className="size-4 text-purple-400 mt-0.5 shrink-0" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-purple-300">{selectedTestCase.fullLabel}</p>
                          <p className="text-xs text-muted-foreground">{selectedTestCase.desc}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Auth / advanced */}
                <Collapsible defaultOpen={mode === "suite" || needsAttackerToken}>
                  <CollapsibleTrigger asChild>
                    <button type="button" className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors">
                      <span className="flex items-center gap-2"><KeyRound className="size-3.5" /> Auth Context {mode === "suite" ? "(optional)" : ""}</span>
                      <ChevronDown className="size-4" />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-400">Attacker Token{mode === "single" && needsAttackerToken ? " (required)" : ""}</Label>
                      <Textarea
                        required={mode === "single" && needsAttackerToken}
                        value={attackerToken}
                        onChange={(e) => setAttackerToken(e.target.value)}
                        placeholder="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        className="h-16 resize-none bg-black/30 border-white/10 text-slate-200 font-mono text-xs placeholder:text-muted-foreground/50"
                      />
                    </div>
                    {mode === "suite" && (
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-400">Victim Token (optional)</Label>
                        <Textarea
                          value={victimToken}
                          onChange={(e) => setVictimToken(e.target.value)}
                          placeholder="Token of the target user (for object-level tests)"
                          className="h-16 resize-none bg-black/30 border-white/10 text-slate-200 font-mono text-xs placeholder:text-muted-foreground/50"
                        />
                      </div>
                    )}
                    {(needsAttackMethod || mode === "suite") && (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-xs text-slate-400"><Code2 className="size-3.5 text-amber-400" /> Attack Method (BFLA)</Label>
                        <Select value={attackMethod} onValueChange={setAttackMethod}>
                          <SelectTrigger className="h-10 bg-black/30 border-white/10 text-slate-200"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                            <SelectItem value="DELETE">DELETE</SelectItem>
                            <SelectItem value="PUT">PUT</SelectItem>
                            <SelectItem value="PATCH">PATCH</SelectItem>
                            <SelectItem value="POST">POST</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isScanning || !canLaunch}
                    className="h-11 px-6 bg-linear-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white border-0 font-semibold shadow-lg shadow-rose-500/20 disabled:opacity-50 disabled:shadow-none"
                  >
                    {isScanning ? (
                      <><Loader2 className="size-4 mr-2 animate-spin" /> {mode === "suite" ? "Running Suite..." : "Executing Scan..."}</>
                    ) : (
                      <><Play className="size-4 mr-2" /> {mode === "suite" ? "Launch Suite" : "Launch Scanner"}</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>

          {/* ── Status sidebar ── */}
          <div className="space-y-5">
            <Card className="glass-panel border-white/10">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className={`flex size-12 items-center justify-center rounded-xl border ${
                    isScanning ? "bg-amber-500/10 border-amber-500/20" :
                    findingsCount > 0 ? "bg-rose-500/10 border-rose-500/20" :
                    scanResults ? "bg-emerald-500/10 border-emerald-500/20" : "bg-slate-500/10 border-white/10"
                  }`}>
                    {isScanning ? <Radio className="size-5 text-amber-400 animate-pulse" /> :
                     findingsCount > 0 ? <ShieldX className="size-5 text-rose-400" /> :
                     scanResults ? <ShieldCheck className="size-5 text-emerald-400" /> :
                     <ShieldAlert className="size-5 text-slate-400" />}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Scanner Status</p>
                    <p className={`text-lg font-semibold ${
                      isScanning ? "text-amber-400" :
                      findingsCount > 0 ? "text-rose-400" :
                      scanResults ? "text-emerald-400" : "text-slate-300"
                    }`}>
                      {isScanning ? "Scanning..." :
                       findingsCount > 0 ? `${findingsCount} Finding${findingsCount > 1 ? "s" : ""}` :
                       scanResults ? "Secure" : "Ready"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Suite progress */}
            {mode === "suite" && suiteTrigger && (
              <Card className="glass-panel border-white/10">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Radar className={`size-4 text-rose-400 ${isScanning ? "animate-spin" : ""}`} />
                      <p className="text-sm font-medium text-slate-200">Suite Progress</p>
                    </div>
                    <Badge variant="outline" className="text-xs bg-black/30 text-slate-400 border-white/10">
                      {suiteStatus ? terminalCount(suiteStatus) : 0}/{suiteTrigger.job_count} jobs
                    </Badge>
                  </div>
                  <SuiteProgressBar total={suiteTrigger.job_count} counts={suiteStatus?.status_counts} />
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(suiteStatus?.status_counts || {}).map(([st, n]) => (
                      <Badge key={st} variant="outline" className="text-[11px] bg-black/30 border-white/10 text-slate-400">
                        {st.replace(/_/g, " ")}: {n}
                      </Badge>
                    ))}
                  </div>
                  {suiteTrigger.skipped && suiteTrigger.skipped.length > 0 && (
                    <p className="text-[11px] text-muted-foreground/70">
                      Skipped (not applicable): {suiteTrigger.skipped.map(humanizeTestType).join(", ")}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Severity tally */}
            {scanResults && findingsCount > 0 && (
              <Card className="glass-panel border-white/10">
                <CardContent className="p-5 space-y-3">
                  <p className="text-sm font-medium text-slate-200">Findings by Severity</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["critical", "high", "medium", "low"] as const).map(sev => (
                      <div key={sev} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${getSeverityColor(sev)}`}>
                        <span className="text-xs capitalize">{sev}</span>
                        <span className="text-sm font-semibold">{severityTally[sev]}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {inventoryId && (
              <Button variant="outline" size="sm" asChild className="w-full glass-chip border-white/10 text-slate-300 hover:text-white">
                <Link href={suiteTrigger?.suite_id
                  ? `/dashboard/results?suite_id=${suiteTrigger.suite_id}`
                  : `/dashboard/results?inventory_id=${inventoryId}`}>
                  View in Results <ExternalLink className="ml-2 size-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* ── Output ── */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Target analysis */}
          <Card className="glass-panel border-white/10 flex flex-col min-h-96">
            <CardHeader className="pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <Globe className="size-5 text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Target Analysis</CardTitle>
                  <CardDescription>Original captured traffic details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              {selectedEndpointDetails ? (
                <ScrollArea className="h-full">
                  <div className="p-5 space-y-5">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Endpoint</p>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-black/30 border border-white/5">
                        <Badge variant="outline" className={`font-mono ${getMethodColor(selectedEndpointDetails.Method)}`}>{selectedEndpointDetails.Method}</Badge>
                        <code className="text-sm text-slate-200 break-all">{selectedEndpointDetails.BaseURL}{selectedEndpointDetails.PathPattern}</code>
                      </div>
                    </div>
                    {selectedEndpointDetails.SampleHeaders && Object.keys(selectedEndpointDetails.SampleHeaders).length > 0 && (
                      <Collapsible defaultOpen>
                        <CollapsibleTrigger asChild>
                          <button className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300">
                            <span>Request Headers</span><ChevronDown className="size-4" />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="p-4 rounded-lg bg-black/30 border border-white/5 font-mono text-xs space-y-1 max-h-48 overflow-auto">
                            {Object.entries(selectedEndpointDetails.SampleHeaders || {}).map(([key, vals]) => (
                              <div key={key} className="break-all">
                                <span className="text-blue-400">{key}:</span> <span className="text-slate-300">{vals.join(", ")}</span>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                    {selectedEndpointDetails.SampleReqBody && (
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <button className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300">
                            <span>Request Body</span><ChevronDown className="size-4" />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="p-4 rounded-lg bg-black/30 border border-white/5 max-h-48 overflow-auto">
                            <pre className="font-mono text-xs text-amber-400 whitespace-pre-wrap break-all">{formatJSON(selectedEndpointDetails.SampleReqBody)}</pre>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                  <Globe className="size-12 text-white/5 mb-4" />
                  <p className="text-sm">Select an endpoint to view captured traffic</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scanner output */}
          <Card className="glass-panel border-white/10 flex flex-col min-h-96 relative overflow-hidden">
            {isScanning && (
              <div className="absolute top-0 left-0 w-full h-1 bg-black/20 overflow-hidden z-10">
                <div className="h-full bg-linear-to-r from-rose-500 to-amber-500 w-1/3 animate-progress-indeterminate" />
              </div>
            )}
            <CardHeader className="pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className={`flex size-10 items-center justify-center rounded-xl border ${
                  isScanning ? "bg-amber-500/10 border-amber-500/20" :
                  findingsCount > 0 ? "bg-rose-500/10 border-rose-500/20" : "bg-emerald-500/10 border-emerald-500/20"
                }`}>
                  <Terminal className={`size-5 ${isScanning ? "text-amber-400" : findingsCount > 0 ? "text-rose-400" : "text-emerald-400"}`} />
                </div>
                <div>
                  <CardTitle className="text-lg">Scanner Output</CardTitle>
                  <CardDescription>{isScanning ? "Executing security tests..." : "Findings will appear here"}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-5">
                  {scanError && (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20">
                      <AlertTriangle className="size-5 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-rose-400">Scan Failed</p>
                        <p className="text-xs text-rose-300/80 mt-1">{scanError}</p>
                      </div>
                    </div>
                  )}

                  {!isScanning && !scanResults && !scanError && (
                    <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-center">
                      <Braces className="size-16 text-white/5 mb-4" />
                      <p className="text-sm font-medium text-slate-400">Ready to Launch</p>
                      <p className="text-xs mt-1">{mode === "suite" ? "Pick an endpoint and a suite, then launch" : "Configure the scan and click Launch Scanner"}</p>
                    </div>
                  )}

                  {isScanning && (
                    <div className="h-64 flex flex-col items-center justify-center text-center">
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping" />
                        <Loader2 className="size-12 text-rose-400 animate-spin relative" />
                      </div>
                      <p className="text-sm font-medium text-slate-300 mt-6">Executing Nuclei Engine</p>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        {mode === "suite"
                          ? (suiteTrigger ? `Suite ${suiteTrigger.suite_id.slice(-6)} · ${suiteStatus ? terminalCount(suiteStatus) : 0}/${suiteTrigger.job_count} jobs` : "Fanning out jobs...")
                          : (scanJobId ? `Job ${scanJobId.slice(-6)} is ${scanStatus || "queued"}` : "Creating scan job...")}
                      </p>
                    </div>
                  )}

                  {!isScanning && scanResults && findingsCount === 0 && (
                    <div className="flex flex-col items-center justify-center text-center py-8">
                      <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                        <ShieldCheck className="size-8 text-emerald-400" />
                      </div>
                      <p className="text-lg font-semibold text-emerald-400">No Vulnerabilities Found</p>
                      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                        {mode === "suite" ? "The suite completed with no findings on this endpoint." : "No vulnerabilities were detected for the selected test case."}
                      </p>
                    </div>
                  )}

                  {!isScanning && scanResults && findingsCount > 0 && (
                    <div className="space-y-4">
                      {scanResults.map((result, idx) => {
                        const resultKey = `result-${idx}`
                        return (
                          <Card key={idx} className={`border-l-4 bg-black/30 border-white/5 ${
                            result.severity?.toLowerCase() === "critical" ? "border-l-rose-500" :
                            result.severity?.toLowerCase() === "high" ? "border-l-orange-500" :
                            result.severity?.toLowerCase() === "medium" ? "border-l-amber-500" : "border-l-emerald-500"
                          }`}>
                            <CardContent className="p-4 space-y-4">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className={`${getSeverityColor(result.severity)} text-xs`}>{result.severity?.toUpperCase()}</Badge>
                                  <span className="font-semibold text-sm text-slate-200">{result.test_type?.replace(/_/g, " ")}</span>
                                  {result.out_of_band && (
                                    <Badge variant="outline" className="text-[11px] bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20">OOB</Badge>
                                  )}
                                </div>
                                <Badge variant="outline" className="text-xs bg-black/30 text-muted-foreground border-white/10">Status: {result.response_status}</Badge>
                              </div>
                              <p className="text-sm text-slate-300">{result.description}</p>
                              {result.proof && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">cURL Proof</p>
                                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.proof, `proof-${resultKey}`)} className="h-6 px-2 text-xs text-muted-foreground hover:text-slate-200">
                                      {copiedId === `proof-${resultKey}` ? <><Check className="mr-1 size-3 text-emerald-400" /> Copied</> : <><Copy className="mr-1 size-3" /> Copy</>}
                                    </Button>
                                  </div>
                                  <div className="p-3 rounded-lg bg-black/40 border border-white/5 overflow-auto max-h-32">
                                    <pre className="font-mono text-xs text-blue-300 whitespace-pre-wrap break-all">{result.proof}</pre>
                                  </div>
                                </div>
                              )}
                              {result.response_body && (
                                <Collapsible>
                                  <CollapsibleTrigger asChild>
                                    <button className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300">
                                      <ChevronDown className="size-3" /> Response Body
                                    </button>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="mt-2">
                                    <div className="p-3 rounded-lg bg-black/40 border border-white/5 overflow-auto max-h-40">
                                      <pre className="font-mono text-xs text-emerald-400 whitespace-pre-wrap break-all">{result.response_body}</pre>
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes progress-indeterminate { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
        .animate-progress-indeterminate { animation: progress-indeterminate 1.5s infinite linear; }
      `}} />
    </div>
  )
}

function terminalCount(status: SuiteStatusResponse): number {
  let n = 0
  for (const [st, count] of Object.entries(status.status_counts || {})) {
    if (TERMINAL_STATUSES.has(st)) n += count
  }
  return n
}

function SuiteProgressBar({ total, counts }: { total: number; counts?: Record<string, number> }) {
  const c = counts || {}
  const seg = (st: string) => (total > 0 ? ((c[st] || 0) / total) * 100 : 0)
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-black/40">
      <div className="bg-emerald-500" style={{ width: `${seg("completed")}%` }} />
      <div className="bg-rose-500" style={{ width: `${seg("failed")}%` }} />
      <div className="bg-orange-500" style={{ width: `${seg("timed_out")}%` }} />
      <div className="bg-slate-500" style={{ width: `${seg("cancelled")}%` }} />
      <div className="bg-amber-400 animate-pulse" style={{ width: `${seg("running")}%` }} />
    </div>
  )
}
