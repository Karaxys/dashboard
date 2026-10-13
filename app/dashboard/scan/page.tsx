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
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Play, ShieldAlert, Target, KeyRound, Layers, Radar,
  AlertTriangle, Globe, Loader2, ChevronDown,
  ShieldCheck, ExternalLink, Crosshair,
  FlaskConical, Code2, ListChecks, Info, CheckCircle2, Radio,
} from "lucide-react"
import { apiFetch } from "@/lib/api"
import { FindingCard } from "@/components/findings/finding-card"

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
  captured_auth_available?: boolean
}

interface TestCase {
  id: string
  label: string
  fullLabel: string
  desc: string
  category: string
  requiresAttackerToken?: boolean
  requiresVictimToken?: boolean
}

interface TestTypeMeta {
  test_type: string
  category: string
  severity: string
  description: string
  requires_attacker_auth: boolean
  requires_victim_auth?: boolean
  requires_distinct_principals?: boolean
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
  { id: "BOLA", label: "BOLA", fullLabel: "Broken Object Level Authorization", desc: "Check if User B can access User A's data via token swap.", category: "Authorization", requiresAttackerToken: true, requiresVictimToken: true },
  { id: "BFLA", label: "BFLA", fullLabel: "Broken Function Level Authorization", desc: "Check if a standard user can perform privileged actions via method swap.", category: "Authorization", requiresAttackerToken: true, requiresVictimToken: true },
  { id: "BROKEN_USER_AUTH", label: "Broken Auth", fullLabel: "Broken User Authentication", desc: "Check if endpoint allows anonymous access.", category: "Authentication" },
  { id: "BOLA_PARAMETER_POLLUTION", label: "Param Pollution", fullLabel: "BOLA Parameter Pollution", desc: "Send duplicate IDs to confuse auth middleware.", category: "Authorization", requiresAttackerToken: true, requiresVictimToken: true },
  { id: "BOLA_CHAINED_ENUMERATION", label: "BOLA Chained", fullLabel: "BOLA via Chained Object-ID Enumeration", desc: "Extract an object ID from a listing, then read it directly with attacker creds.", category: "Authorization", requiresAttackerToken: true, requiresVictimToken: true },
  { id: "SWAGGER_CHECK", label: "Swagger", fullLabel: "Swagger/OpenAPI Exposure", desc: "Find hidden API documentation endpoints.", category: "Information" },
  { id: "JWT_NONE_ALGO", label: "JWT None", fullLabel: "JWT None Algorithm Attack", desc: "Check if server accepts unsigned JWT (alg: none).", category: "Authentication", requiresVictimToken: true },
  { id: "JWT_INVALID_SIGNATURE", label: "JWT Sig", fullLabel: "JWT Invalid Signature", desc: "Check if server verifies cryptographic signature.", category: "Authentication", requiresVictimToken: true },
  { id: "OPEN_REDIRECT", label: "Redirect", fullLabel: "Open Redirect", desc: "Check if URL params can redirect to malicious sites.", category: "Injection" },
  { id: "REFLECTED_XSS", label: "Reflected XSS", fullLabel: "Reflected Cross-Site Scripting", desc: "Inject a script marker and check for unescaped reflection.", category: "Injection" },
  { id: "STORED_XSS", label: "Stored XSS", fullLabel: "Stored Cross-Site Scripting", desc: "Write a script marker and re-read the resource to confirm it persisted.", category: "Injection" },
  { id: "SQL_INJECTION", label: "SQL Injection", fullLabel: "Error-Based SQL Injection", desc: "Inject SQL metacharacters and detect leaked database errors.", category: "Injection" },
  { id: "COMMAND_INJECTION", label: "Command Injection", fullLabel: "OS Command Injection", desc: "Inject shell metacharacters and detect reflected command output.", category: "Injection" },
  { id: "SSRF", label: "SSRF", fullLabel: "Server-Side Request Forgery (Direct)", desc: "Inject internal/cloud-metadata URLs and detect reflected fetched content.", category: "Injection" },
  { id: "SSRF_BLIND_OOB", label: "SSRF (Blind)", fullLabel: "Blind SSRF (Out-of-Band)", desc: "Detect blind SSRF via an out-of-band callback (requires OOB enabled).", category: "Injection" },
  { id: "CORS_MISCONFIGURATION", label: "CORS", fullLabel: "CORS Misconfiguration", desc: "Check if the server reflects an attacker Origin with credentials.", category: "Misconfiguration" },
  { id: "MASS_ASSIGNMENT", label: "Mass Assignment", fullLabel: "Mass Assignment / Privilege Escalation", desc: "Inject privileged fields into a write request and check acceptance.", category: "Authorization" },
  { id: "DEFAULT_CREDENTIALS", label: "Default Creds", fullLabel: "Default / Weak Credentials", desc: "Submit common default credential pairs to the auth endpoint.", category: "Authentication" },
  { id: "WEAK_CREDENTIALS_REUSE", label: "Weak Creds", fullLabel: "Weak Credentials on Captured Account", desc: "Retry the account seen in the captured login with common weak passwords.", category: "Authentication" },
  { id: "EXPOSED_METRICS", label: "Metrics", fullLabel: "Exposed Metrics/Debug", desc: "Find internal DevOps monitoring endpoints.", category: "Information" },
  { id: "EXPOSED_SENSITIVE_PATHS", label: "Exposed Paths", fullLabel: "Exposed Files & Directories", desc: "Find public directory listings, backups, logs and config files.", category: "Information" },
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
      requiresAttackerToken: meta.requires_attacker_auth || known?.requiresAttackerToken,
      requiresVictimToken: meta.requires_victim_auth || known?.requiresVictimToken,
    }
  })
}

const STATIC_PRESETS: SuitePreset[] = [
  { id: "OWASP_API_TOP_10", name: "OWASP API Security Top 10", description: "Broad coverage across the OWASP API Security Top 10 risk categories.", test_types: [] },
  { id: "ACCESS_CONTROL", name: "Broken Access Control", description: "Object- and function-level authorization (OWASP API1/API3/API5).", test_types: [] },
  { id: "AUTHENTICATION", name: "Broken Authentication", description: "Anonymous access, JWT flaws, default and weak credentials (OWASP API2).", test_types: [] },
  { id: "INJECTION", name: "Injection", description: "Reflected and stored XSS, SQL injection, command injection and open redirect.", test_types: [] },
  { id: "SSRF", name: "Server-Side Request Forgery", description: "In-band and blind out-of-band SSRF (OWASP API7).", test_types: [] },
  { id: "MISCONFIGURATION", name: "Security Misconfiguration", description: "CORS, exposed metrics/docs and public files/directory listings.", test_types: [] },
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
const formatTimestamp = (value?: string) => {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}

/** Numbered step header used by the configuration card. */
function StepHeader({ step, icon: Icon, title, hint }: {
  step: number
  icon: React.ElementType
  title: string
  hint?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/40 text-xs font-semibold text-slate-300">
        {step}
      </span>
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Icon className="size-4 text-rose-400" />
          {title}
        </p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  )
}

/** Collapsible full-width panel: title row with an icon, chevron and optional badge. */
function CollapsiblePanel({ icon: Icon, tone, title, subtitle, defaultOpen, badge, children }: {
  icon: React.ElementType
  tone: "rose" | "blue"
  title: string
  subtitle: string
  defaultOpen?: boolean
  badge?: React.ReactNode
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen ?? true)
  const toneCls = tone === "rose"
    ? "border-rose-500/20 bg-rose-500/10 text-rose-400"
    : "border-blue-500/20 bg-blue-500/10 text-blue-400"
  return (
    <Card className="glass-panel overflow-hidden border-white/10">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex w-full items-center justify-between gap-3 p-5 text-left transition-colors hover:bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className={`flex size-10 items-center justify-center rounded-xl border ${toneCls}`}>
                <Icon className="size-5" />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-100">{title}</p>
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {badge}
              <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-white/5">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
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

  // Catalogs
  const [endpoints, setEndpoints] = useState<ApiInventory[]>([])
  const [endpointsLoading, setEndpointsLoading] = useState(true)
  const [selectedEndpointDetails, setSelectedEndpointDetails] = useState<EndpointDetails | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
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
      } catch (err) { console.error("Failed to fetch endpoints", err) } finally { setEndpointsLoading(false) }
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
      setDetailsLoading(true)
      try {
        const data = await apiFetch<EndpointDetails>(`/inventory/${inventoryId}`)
        setSelectedEndpointDetails(data)
      } catch (err) { console.error("Failed to fetch endpoint details", err) } finally { setDetailsLoading(false) }
    }
    fetchDetails()
  }, [inventoryId])

  const selectedTestCase = useMemo(() => testCases.find(t => t.id === testType), [testCases, testType])
  const selectedPreset = useMemo(() => suitePresets.find(p => p.id === suitePreset), [suitePresets, suitePreset])
  const needsAttackerToken = mode === "single"
    ? (selectedTestCase?.requiresAttackerToken ?? false)
    : true // suites may include BOLA-family; attacker token is optional but surfaced
  const capturedOwnerAvailable = selectedEndpointDetails?.captured_auth_available ?? false
  const requiresVictimToken = mode === "single" && (selectedTestCase?.requiresVictimToken ?? false)
  const needsVictimToken = requiresVictimToken && !capturedOwnerAvailable
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
          auth_contexts: buildAuthContexts(),
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

  const missingPrincipals =
    (mode === "single" && needsAttackerToken && !attackerToken.trim()) ||
    (mode === "single" && needsVictimToken && !victimToken.trim())
  const canLaunch = mode === "suite"
    ? !!(inventoryId && suitePreset)
    : !!(inventoryId && testType) && !missingPrincipals

  const blockedReason = !inventoryId
    ? "Select a target endpoint to continue."
    : mode === "suite"
      ? null
      : !testType
        ? "Select a test case to continue."
        : missingPrincipals
          ? "Provide the required token(s) above — comparison tests need two distinct identities."
          : null

  const findingsCount = scanResults?.length ?? 0
  const severityTally = useMemo(() => {
    const t: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 }
    for (const r of scanResults || []) {
      const s = r.severity?.toLowerCase()
      if (s in t) t[s]++
    }
    return t
  }, [scanResults])

  const terminalJobs = suiteStatus ? terminalCount(suiteStatus) : 0
  const identityState = victimToken.trim()
    ? { label: "provided", cls: "bg-slate-500/10 text-slate-300 border-slate-500/20" }
    : capturedOwnerAvailable
      ? { label: "auto-detected", cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" }
      : needsVictimToken
        ? { label: "required", cls: "bg-amber-500/10 text-amber-300 border-amber-500/20" }
        : { label: "optional", cls: "bg-slate-500/10 text-slate-400 border-slate-500/20" }

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

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 p-5 pt-0">
        {/* ── Page title ── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10">
              <Crosshair className="size-5 text-rose-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-100">Active Scanner</h1>
              <p className="text-sm text-muted-foreground">Validate captured API traffic against security checks</p>
            </div>
          </div>
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
            isScanning ? "border-amber-500/20 bg-amber-500/10 text-amber-300" :
            findingsCount > 0 ? "border-rose-500/20 bg-rose-500/10 text-rose-300" :
            scanResults ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" :
            "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
          }`}>
            {isScanning
              ? <><Loader2 className="size-3.5 animate-spin" /> Scanning…</>
              : findingsCount > 0
                ? <><ShieldAlert className="size-3.5" /> {findingsCount} finding{findingsCount > 1 ? "s" : ""}</>
                : <><ShieldCheck className="size-3.5" /> {scanResults ? "No findings" : "Ready"}</>}
          </div>
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          {/* ── Configuration ── */}
          <Card className="glass-panel border-white/10">
            <CardHeader className="border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10">
                  <Crosshair className="size-5 text-rose-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Configure Scan</CardTitle>
                  <CardDescription>Run an OWASP-mapped suite or a single targeted test</CardDescription>
                </div>
              </div>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-7 pt-6">
                {/* Step 1 — target */}
                <section className="space-y-3">
                  <StepHeader step={1} icon={Target} title="Target endpoint"
                    hint="An endpoint captured by the agent. The scan replays its captured request." />
                  {endpointsLoading ? (
                    <Skeleton className="h-11 w-full rounded-md bg-white/5" />
                  ) : (
                    <Select
                      value={inventoryId || SELECT_ENDPOINT_DEFAULT}
                      onValueChange={(v) => setInventoryId(v === SELECT_ENDPOINT_DEFAULT ? "" : v)}
                      required
                    >
                      <SelectTrigger className="h-11 border-white/10 bg-black/30 text-slate-200">
                        <SelectValue placeholder="Select an endpoint to scan" />
                      </SelectTrigger>
                      <SelectContent className="max-h-80 border-white/10 bg-slate-900 text-slate-200">
                        <SelectItem value={SELECT_ENDPOINT_DEFAULT} className="text-muted-foreground">Select endpoint...</SelectItem>
                        {endpoints.map(ep => (
                          <SelectItem key={ep.ID} value={ep.ID} className="py-2.5">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`font-mono text-xs ${getMethodColor(ep.Method)}`}>{ep.Method}</Badge>
                              <span className="font-mono text-sm">{ep.PathPattern}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {detailsLoading && <Skeleton className="h-4 w-64 bg-white/5" />}
                  {!detailsLoading && selectedEndpointDetails && (
                    <p className="flex items-center gap-2 break-all text-xs text-muted-foreground">
                      <Globe className="size-3 shrink-0" />
                      <span className="font-mono text-slate-400">{selectedEndpointDetails.BaseURL}{selectedEndpointDetails.PathPattern}</span>
                    </p>
                  )}
                  {!endpointsLoading && endpoints.length === 0 && (
                    <p className="text-xs text-amber-300/80">
                      No endpoints captured yet — run the agent against your application first.
                    </p>
                  )}
                </section>

                {/* Step 2 — what to run */}
                <section className="space-y-3 border-t border-white/5 pt-6">
                  <StepHeader step={2} icon={Layers} title="What to run"
                    hint="A suite runs every applicable test on this endpoint; a single test runs exactly one." />

                  <Tabs value={mode} onValueChange={(v) => { setMode(v as "suite" | "single"); resetRun() }}>
                    <TabsList className="grid w-full grid-cols-2 border border-white/10 bg-black/30">
                      <TabsTrigger value="suite" className="data-[state=active]:bg-rose-500/15 data-[state=active]:text-rose-300">
                        <Layers className="mr-2 size-4" /> Suite Scan
                      </TabsTrigger>
                      <TabsTrigger value="single" className="data-[state=active]:bg-purple-500/15 data-[state=active]:text-purple-300">
                        <FlaskConical className="mr-2 size-4" /> Single Test
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {mode === "suite" ? (
                    <div className="space-y-3">
                      <Label htmlFor="suite" className="text-sm text-slate-300">Suite</Label>
                      <Select value={suitePreset} onValueChange={setSuitePreset} required>
                        <SelectTrigger id="suite" className="h-11 border-white/10 bg-black/30 text-slate-200">
                          <SelectValue placeholder="Select a suite" />
                        </SelectTrigger>
                        <SelectContent className="border-white/10 bg-slate-900 text-slate-200">
                          {suitePresets.map(p => (
                            <SelectItem key={p.id} value={p.id} className="py-2.5">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="border-rose-500/20 bg-rose-500/10 text-xs text-rose-400">
                                  {p.test_types === null ? "ALL" : `${(p.test_types || []).length || "•"}`}
                                </Badge>
                                <span>{p.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedPreset && (
                        <div className="flex items-start gap-3 rounded-lg border border-rose-500/10 bg-rose-500/5 p-3">
                          <ListChecks className="mt-0.5 size-4 shrink-0 text-rose-400" />
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-rose-300">{selectedPreset.name}</p>
                            <p className="text-xs text-muted-foreground">{selectedPreset.description}</p>
                            <p className="text-[11px] text-muted-foreground/70">
                              Only tests applicable to the selected endpoint run — the rest are skipped and listed after launch.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Label htmlFor="test" className="text-sm text-slate-300">Test case</Label>
                      <Select
                        value={testType || SELECT_TEST_CASE_DEFAULT}
                        onValueChange={(v) => setTestType(v === SELECT_TEST_CASE_DEFAULT ? "" : v)}
                        required
                      >
                        <SelectTrigger id="test" className="h-11 border-white/10 bg-black/30 text-slate-200">
                          <SelectValue placeholder="Select test case" />
                        </SelectTrigger>
                        <SelectContent className="max-h-80 border-white/10 bg-slate-900 text-slate-200">
                          <SelectItem value={SELECT_TEST_CASE_DEFAULT} className="text-muted-foreground">Select test case...</SelectItem>
                          {testCases.map(tc => (
                            <SelectItem key={tc.id} value={tc.id} className="py-2.5">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="border-purple-500/20 bg-purple-500/10 text-xs text-purple-400">{tc.category}</Badge>
                                <span>{tc.fullLabel}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedTestCase && (
                        <div className="flex items-start gap-3 rounded-lg border border-purple-500/10 bg-purple-500/5 p-3">
                          <Info className="mt-0.5 size-4 shrink-0 text-purple-400" />
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-purple-300">{selectedTestCase.fullLabel}</p>
                            <p className="text-xs text-muted-foreground">{selectedTestCase.desc}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {/* Step 3 — identities */}
                <section className="space-y-3 border-t border-white/5 pt-6">
                  <StepHeader step={3} icon={KeyRound} title="Identities"
                    hint="Authorization tests compare two users. The victim is the object's owner, the attacker is the user trying to reach it." />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="attacker-token" className="text-sm text-slate-300">Attacker token</Label>
                      <Badge variant="outline" className={mode === "single" && needsAttackerToken
                        ? "border-amber-500/20 bg-amber-500/10 text-[11px] text-amber-300"
                        : "border-slate-500/20 bg-slate-500/10 text-[11px] text-slate-400"}>
                        {mode === "single" && needsAttackerToken ? "required" : "optional"}
                      </Badge>
                    </div>
                    <Textarea
                      id="attacker-token"
                      required={mode === "single" && needsAttackerToken}
                      value={attackerToken}
                      onChange={(e) => setAttackerToken(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
                      className="h-16 resize-none border-white/10 bg-black/30 font-mono text-xs text-slate-200 placeholder:text-muted-foreground/40"
                    />
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      A credential for a <span className="text-slate-300">second, lower-privileged user</span> of your application.
                      Paste the token alone or with the <span className="font-mono">Bearer </span> prefix — both work.
                    </p>
                  </div>

                  {(mode === "suite" || requiresVictimToken) && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="victim-token" className="text-sm text-slate-300">Victim token</Label>
                        <Badge variant="outline" className={`text-[11px] ${identityState.cls}`}>{identityState.label}</Badge>
                      </div>
                      <Textarea
                        id="victim-token"
                        required={needsVictimToken}
                        value={victimToken}
                        onChange={(e) => setVictimToken(e.target.value)}
                        placeholder={capturedOwnerAvailable
                          ? "Sealed from the captured request — leave empty to use it"
                          : "Token of the object owner (a different user than the attacker)"}
                        className="h-16 resize-none border-white/10 bg-black/30 font-mono text-xs text-slate-200 placeholder:text-muted-foreground/40"
                      />
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        {capturedOwnerAvailable
                          ? "The owner's credential was sealed with this endpoint's captured request, so you only need the attacker token. Paste a token above to override it."
                          : needsVictimToken && missingPrincipals
                            ? "Required for this test: replaying the owner's own request with the owner's own token always succeeds, which is how false positives were produced before."
                            : "Captured traffic stores Authorization headers redacted, so paste the owner's token here when the endpoint has no sealed credential."}
                      </p>
                    </div>
                  )}

                  {(needsAttackMethod || mode === "suite") && (
                    <div className="space-y-2">
                      <Label htmlFor="method" className="flex items-center gap-2 text-sm text-slate-300">
                        <Code2 className="size-4 text-amber-400" /> Attack method
                      </Label>
                      <Select value={attackMethod} onValueChange={setAttackMethod}>
                        <SelectTrigger id="method" className="h-10 w-40 border-white/10 bg-black/30 text-slate-200"><SelectValue /></SelectTrigger>
                        <SelectContent className="border-white/10 bg-slate-900 text-slate-200">
                          <SelectItem value="DELETE">DELETE</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                          <SelectItem value="PATCH">PATCH</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        The privileged method BFLA replays instead of the captured one. Choose one your application exposes.
                      </p>
                    </div>
                  )}
                </section>

                {/* Step 4 — run */}
                <section className="space-y-3 border-t border-white/5 pt-6">
                  <StepHeader step={4} icon={Play} title="Run"
                    hint={mode === "suite" ? "Jobs fan out per test type and run in parallel, subject to the target rate limit." : "One job: the captured request is replayed with your identity and payloads."} />
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="submit"
                      disabled={isScanning || !canLaunch}
                      className="h-11 border-0 bg-linear-to-r from-rose-600 to-rose-500 px-6 font-semibold text-white shadow-lg shadow-rose-500/20 hover:from-rose-500 hover:to-rose-400 disabled:opacity-50 disabled:shadow-none"
                    >
                      {isScanning ? (
                        <><Loader2 className="mr-2 size-4 animate-spin" /> {mode === "suite" ? "Running suite…" : "Running test…"}</>
                      ) : (
                        <><Play className="mr-2 size-4" /> {mode === "suite" ? "Launch suite" : "Launch test"}</>
                      )}
                    </Button>
                    {blockedReason && !isScanning && (
                      <p className="flex items-center gap-1.5 text-xs text-amber-300/80">
                        <AlertTriangle className="size-3.5" /> {blockedReason}
                      </p>
                    )}
                  </div>
                </section>
              </CardContent>
            </form>
          </Card>

          {/* ── Status sidebar ── */}
          <div className="space-y-5">
            <Card className="glass-panel border-white/10">
              <CardContent className="space-y-2 p-5">
                <div className="flex items-center gap-3">
                  <div className={`flex size-10 items-center justify-center rounded-xl border ${
                    isScanning ? "border-amber-500/20 bg-amber-500/10" :
                    findingsCount > 0 ? "border-rose-500/20 bg-rose-500/10" :
                    "border-emerald-500/20 bg-emerald-500/10"
                  }`}>
                    {isScanning ? <Radio className="size-5 animate-pulse text-amber-400" /> :
                     findingsCount > 0 ? <ShieldAlert className="size-5 text-rose-400" /> :
                     <ShieldCheck className="size-5 text-emerald-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">Scanner status</p>
                    <p className={`text-lg font-semibold ${
                      isScanning ? "text-amber-400" :
                      findingsCount > 0 ? "text-rose-400" : "text-emerald-400"
                    }`}>
                      {isScanning ? "Scanning…" :
                       findingsCount > 0 ? `${findingsCount} finding${findingsCount > 1 ? "s" : ""}` :
                       scanResults ? "No findings" : "Ready"}
                    </p>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {isScanning
                    ? "Tests are executing against the captured request."
                    : findingsCount > 0
                      ? "Review the findings below — each includes proof and remediation."
                      : scanResults
                        ? "The last run completed without findings on this endpoint."
                        : "Configure a scan on the left and launch when ready."}
                </p>
              </CardContent>
            </Card>

            {(isScanning || suiteTrigger) && mode === "suite" && (
              <Card className="glass-panel border-white/10">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Radar className={`size-4 text-rose-400 ${isScanning ? "animate-spin" : ""}`} />
                      <p className="text-sm font-medium text-slate-200">Suite progress</p>
                    </div>
                    <Badge variant="outline" className="border-white/10 bg-black/30 text-xs text-slate-400">
                      {terminalJobs}/{suiteTrigger?.job_count ?? 0} jobs
                    </Badge>
                  </div>
                  <SuiteProgressBar total={suiteTrigger?.job_count ?? 0} counts={suiteStatus?.status_counts} />
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(suiteStatus?.status_counts || {}).map(([st, n]) => (
                      <Badge key={st} variant="outline" className="border-white/10 bg-black/30 text-[11px] text-slate-400">
                        {st.replace(/_/g, " ")}: {n}
                      </Badge>
                    ))}
                  </div>
                  {suiteTrigger?.skipped && suiteTrigger.skipped.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Skipped (not applicable)</p>
                      <div className="flex flex-wrap gap-1.5">
                        {suiteTrigger.skipped.map(t => (
                          <Badge key={t} variant="outline" className="border-white/10 bg-black/20 text-[11px] text-muted-foreground">
                            {humanizeTestType(t)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="glass-panel border-white/10">
              <CardContent className="space-y-3 p-5">
                <p className="text-sm font-medium text-slate-200">Findings by severity</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["critical", "high", "medium", "low"] as const).map(sev => (
                    <div key={sev} className={`space-y-1 rounded-lg border p-3 ${getSeverityColor(sev)}`}>
                      <p className="text-xs capitalize opacity-90">{sev}</p>
                      <p className="text-2xl font-semibold leading-none">{severityTally[sev]}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {scanResults ? "Counts from the run shown below." : "Counts appear after the first run."}
                </p>
              </CardContent>
            </Card>

            <Card className="glass-panel border-white/10">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-2">
                  <ListChecks className="size-4 text-sky-400" />
                  <p className="text-sm font-medium text-slate-200">Scan guidance</p>
                </div>
                <ol className="space-y-3">
                  {[
                    { title: "Select a captured endpoint", body: "Choose an endpoint from your observed traffic." },
                    { title: "Pick a scan mode", body: "Run a full suite or a single targeted test." },
                    { title: "Add an attacker token (optional)", body: "Use a lower-privileged user to test authorization issues." },
                    { title: "Launch the test", body: "We replay the request and show findings with proof and remediation." },
                  ].map((step, i) => (
                    <li key={step.title} className="flex gap-3">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/40 text-[11px] font-semibold text-slate-300">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-200">{step.title}</p>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">{step.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            {inventoryId && (
              <Button variant="outline" size="sm" asChild className="w-full border-white/10 text-slate-300 hover:text-white">
                <Link href={suiteTrigger?.suite_id
                  ? `/dashboard/results?suite_id=${suiteTrigger.suite_id}`
                  : `/dashboard/results?inventory_id=${inventoryId}`}>
                  View all results <ExternalLink className="ml-2 size-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* ── Scanner output ── */}
        <CollapsiblePanel
          icon={Crosshair}
          tone="rose"
          title="Scanner output"
          subtitle={isScanning
            ? (mode === "suite" ? `Executing ${suiteTrigger?.job_count ?? ""} tests…` : "Executing the security test…")
            : "Findings, evidence and remediation will appear here after a run"}
          defaultOpen
          badge={scanResults ? (
            <Badge variant="outline" className="border-white/10 bg-black/30 text-xs text-slate-400">
              {findingsCount} finding{findingsCount === 1 ? "" : "s"}
            </Badge>
          ) : undefined}
        >
          <div className="relative p-5">
            {isScanning && (
              <div className="absolute left-0 top-0 h-1 w-full overflow-hidden bg-black/20">
                <div className="h-full w-1/3 animate-progress-indeterminate bg-linear-to-r from-rose-500 to-amber-500" />
              </div>
            )}
            {scanError && (
              <div className="flex items-start gap-3 rounded-lg border border-rose-500/20 bg-rose-500/10 p-4">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-400" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-rose-300">Scan failed</p>
                  <p className="text-xs text-rose-200/80">{scanError}</p>
                </div>
              </div>
            )}

            {!isScanning && !scanResults && !scanError && (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <Target className="mb-4 size-10 text-white/10" />
                <p className="text-sm font-medium text-slate-300">Nothing to show yet</p>
                <p className="mt-1 max-w-sm text-xs">
                  Choose an endpoint and a suite or test above, then launch. Progress and findings appear here —
                  each finding explains the impact, the proof and how to fix it.
                </p>
              </div>
            )}

            {isScanning && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Loader2 className="size-8 animate-spin text-rose-400" />
                <p className="mt-4 text-sm font-medium text-slate-300">
                  {mode === "suite" ? "Running the suite" : "Running the test"}
                </p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {mode === "suite"
                    ? suiteTrigger
                      ? `${terminalJobs}/${suiteTrigger.job_count} jobs finished · suite ${suiteTrigger.suite_id.slice(-6)}`
                      : "Creating jobs…"
                    : scanJobId ? `job ${scanJobId.slice(-6)} · ${scanStatus || "queued"}` : "Creating job…"}
                </p>
                <p className="mt-3 max-w-sm text-[11px] text-muted-foreground/70">
                  Target rate limiting can space jobs out; a suite typically takes a few minutes.
                </p>
              </div>
            )}

            {!isScanning && scanResults && findingsCount === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex size-14 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10">
                  <CheckCircle2 className="size-7 text-emerald-400" />
                </div>
                <p className="text-base font-semibold text-emerald-400">No vulnerabilities found</p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  {mode === "suite"
                    ? "Every applicable test in the suite ran and none produced a finding on this endpoint."
                    : "The test ran and the endpoint did not exhibit this weakness."}
                </p>
              </div>
            )}

            {!isScanning && scanResults && findingsCount > 0 && (
              <div className="space-y-4">
                {scanResults.map((result, idx) => (
                  <FindingCard
                    key={`${result.test_type}-${idx}`}
                    testType={result.test_type}
                    severity={result.severity}
                    description={result.description}
                    evidence={result.proof}
                    responseStatus={result.response_status}
                    responseBody={result.response_body}
                    outOfBand={result.out_of_band}
                    method={selectedEndpointDetails?.Method}
                    path={selectedEndpointDetails?.PathPattern}
                    baseUrl={selectedEndpointDetails?.BaseURL}
                    endpointHref={inventoryId ? `/dashboard/logs/${inventoryId}` : undefined}
                    timestamp={formatTimestamp(result.created_at)}
                  />
                ))}
              </div>
            )}
          </div>
        </CollapsiblePanel>

        {/* ── Captured request ── */}
        <CollapsiblePanel
          icon={Globe}
          tone="blue"
          title="Captured request"
          subtitle="What the agent observed for this endpoint — the scan replays this"
          defaultOpen={!!selectedEndpointDetails}
          badge={selectedEndpointDetails ? (
            <div className="hidden flex-wrap items-center gap-1.5 lg:flex">
              <Badge variant="outline" className={`font-mono text-[11px] ${getMethodColor(selectedEndpointDetails.Method)}`}>
                {selectedEndpointDetails.Method}
              </Badge>
              <span className="max-w-[26rem] truncate font-mono text-[11px] text-muted-foreground">
                {selectedEndpointDetails.BaseURL}{selectedEndpointDetails.PathPattern}
              </span>
              {selectedEndpointDetails.SampleHeaders && Object.keys(selectedEndpointDetails.SampleHeaders).length > 0 && (
                <Badge variant="outline" className="border-white/10 bg-black/30 text-[11px] text-muted-foreground">
                  +{Object.keys(selectedEndpointDetails.SampleHeaders).length} headers
                </Badge>
              )}
            </div>
          ) : undefined}
        >
          <div className="p-5">
            {!selectedEndpointDetails ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <Globe className="mb-3 size-8 text-white/10" />
                <p className="text-sm">Select an endpoint to view the captured traffic</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Endpoint</p>
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/5 bg-black/30 p-3">
                    <Badge variant="outline" className={`font-mono ${getMethodColor(selectedEndpointDetails.Method)}`}>
                      {selectedEndpointDetails.Method}
                    </Badge>
                    <code className="break-all text-sm text-slate-200">
                      {selectedEndpointDetails.BaseURL}{selectedEndpointDetails.PathPattern}
                    </code>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {selectedEndpointDetails.SampleHeaders && Object.keys(selectedEndpointDetails.SampleHeaders).length > 0 && (
                    <Collapsible defaultOpen>
                      <CollapsibleTrigger asChild>
                        <button className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 transition-colors hover:text-slate-300">
                          <span>Request headers</span><ChevronDown className="size-4" />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="max-h-48 space-y-1 overflow-auto rounded-lg border border-white/5 bg-black/30 p-3 font-mono text-xs">
                          {Object.entries(selectedEndpointDetails.SampleHeaders || {}).map(([key, vals]) => (
                            <div key={key} className="break-all">
                              <span className="text-blue-400">{key}:</span>{" "}
                              <span className="text-slate-300">{vals.join(", ")}</span>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {selectedEndpointDetails.SampleReqBody && (
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <button className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 transition-colors hover:text-slate-300">
                          <span>Request body</span><ChevronDown className="size-4" />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="max-h-48 overflow-auto rounded-lg border border-white/5 bg-black/30 p-3">
                          <pre className="whitespace-pre-wrap break-all font-mono text-xs text-amber-400">
                            {formatJSON(selectedEndpointDetails.SampleReqBody)}
                          </pre>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              </div>
            )}
          </div>
        </CollapsiblePanel>
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
      <div className="animate-pulse bg-amber-400" style={{ width: `${seg("running")}%` }} />
    </div>
  )
}
