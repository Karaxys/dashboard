"use client"
import React, { Suspense, useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Play, ShieldAlert, Target, KeyRound, Zap,
  AlertTriangle, Terminal, Globe, Braces, Loader2,
  ChevronDown, Copy, Check, ShieldCheck, ShieldX,
  FileCode2, ExternalLink, Crosshair, FlaskConical, Radio, Code2
} from "lucide-react"

// Types
interface ScanResult {
  test_type: string
  vulnerable: boolean
  severity: string
  description: string
  response_status: number
  response_body: string
  proof: string
  timestamp: string
}

interface ScanJobResponse {
  job_id: string
  status: "queued" | "running" | "completed" | "failed"
  inventory_id: string
  test_type: string
  error?: string
  results_count?: number
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

const TEST_CASES = [
  { id: "BOLA", label: "BOLA", fullLabel: "Broken Object Level Authorization", desc: "Check if User B can access User A's data via token swap.", category: "Authorization" },
  { id: "BFLA", label: "BFLA", fullLabel: "Broken Function Level Authorization", desc: "Check if standard user can perform Admin actions.", category: "Authorization" },
  { id: "BROKEN_USER_AUTH", label: "Broken Auth", fullLabel: "Broken User Authentication", desc: "Check if endpoint allows anonymous access.", category: "Authentication" },
  { id: "BOLA_PARAMETER_POLLUTION", label: "Param Pollution", fullLabel: "BOLA Parameter Pollution", desc: "Send duplicate IDs to confuse auth middleware.", category: "Authorization" },
  { id: "SWAGGER_CHECK", label: "Swagger", fullLabel: "Swagger/OpenAPI Exposure", desc: "Find hidden API documentation endpoints.", category: "Information" },
  { id: "JWT_NONE_ALGO", label: "JWT None", fullLabel: "JWT None Algorithm Attack", desc: "Check if server accepts unsigned JWT (alg: none).", category: "Authentication" },
  { id: "JWT_INVALID_SIGNATURE", label: "JWT Sig", fullLabel: "JWT Invalid Signature", desc: "Check if server verifies cryptographic signature.", category: "Authentication" },
  { id: "OPEN_REDIRECT", label: "Redirect", fullLabel: "Open Redirect", desc: "Check if URL params can redirect to malicious sites.", category: "Injection" },
  { id: "EXPOSED_METRICS", label: "Metrics", fullLabel: "Exposed Metrics/Debug", desc: "Find internal DevOps monitoring endpoints.", category: "Information" }
]

const SELECT_ENDPOINT_DEFAULT = "__SELECT_ENDPOINT__"
const SELECT_TEST_CASE_DEFAULT = "__SELECT_TEST_CASE__"

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="glass-page min-h-full" />}>
      <ScanPageContent />
    </Suspense>
  )
}

function ScanPageContent() {
  const searchParams = useSearchParams()
  // Data States
  const [endpoints, setEndpoints] = useState<ApiInventory[]>([])
  const [selectedEndpointDetails, setSelectedEndpointDetails] = useState<EndpointDetails | null>(null)
  // Form States
  const [inventoryId, setInventoryId] = useState("")
  const [testType, setTestType] = useState("")
  const [attackMethod, setAttackMethod] = useState("DELETE")
  const [attackerToken, setAttackerToken] = useState("")
  // Scan States
  const [isScanning, setIsScanning] = useState(false)
  const [scanResults, setScanResults] = useState<ScanResult[] | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [scanJobId, setScanJobId] = useState<string | null>(null)
  const [scanStatus, setScanStatus] = useState<ScanJobResponse["status"] | null>(null)

  useEffect(() => {
    const fetchEndpoints = async () => {
      try {
        const res = await fetch("http://localhost:8081/inventory?limit=500")
        if (res.ok) {
          const data = await res.json()
          setEndpoints(data.data || [])
        }
      } catch (err) {
        console.error("Failed to fetch endpoints for dropdown", err)
      }
    }
    fetchEndpoints()

    const idFromUrl = searchParams.get("id")
    if (idFromUrl) setInventoryId(idFromUrl)
  }, [searchParams])

  useEffect(() => {
    if (!inventoryId) {
      setSelectedEndpointDetails(null)
      return
    }
    const fetchDetails = async () => {
      try {
        const res = await fetch(`http://localhost:8081/inventory/${inventoryId}`)
        if (res.ok) {
          const data = await res.json()
          setSelectedEndpointDetails(data)
        }
      } catch (err) {
        console.error("Failed to fetch endpoint details", err)
      }
    }
    fetchDetails()
  }, [inventoryId])

  const needsAttackerToken = testType === "BOLA" || testType === "BOLA_PARAMETER_POLLUTION"
  const needsAttackMethod = testType === "BFLA"

  useEffect(() => {
    if (!needsAttackerToken && attackerToken) {
      setAttackerToken("")
    }
  }, [needsAttackerToken, attackerToken])

  const handleStartScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inventoryId || !testType) return

    setIsScanning(true)
    setScanResults(null)
    setScanError(null)
    setScanJobId(null)
    setScanStatus(null)

    const scanPayload = {
      inventory_id: inventoryId,
      test_type: testType,
      attack_method: needsAttackMethod ? attackMethod : "",
      attacker_token: needsAttackerToken ? attackerToken : "",
    }

    try {
      const res = await fetch("http://localhost:8081/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scanPayload),
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText || "Failed to initialize scan.")
      }

      const job: ScanJobResponse = await res.json()
      setScanJobId(job.job_id)
      setScanStatus(job.status)
      const results = await pollScanJob(job.job_id)
      setScanResults(results)
    } catch (err: unknown) {
      setScanError(err instanceof Error ? err.message : "An error occurred during the scan.")
    } finally {
      setIsScanning(false)
    }
  }

  const pollScanJob = async (jobId: string): Promise<ScanResult[]> => {
    for (let attempt = 0; attempt < 90; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2000))

      const jobRes = await fetch(`http://localhost:8081/scan-jobs/${jobId}`)
      if (!jobRes.ok) {
        const errorText = await jobRes.text()
        throw new Error(errorText || "Failed to fetch scan job status.")
      }

      const job: ScanJobResponse = await jobRes.json()
      setScanStatus(job.status)

      if (job.status === "failed") {
        throw new Error(job.error || "Scanner worker failed the scan job.")
      }
      if (job.status === "completed") {
        const resultsRes = await fetch(`http://localhost:8081/scan-results?job_id=${jobId}&limit=100`)
        if (!resultsRes.ok) {
          const errorText = await resultsRes.text()
          throw new Error(errorText || "Failed to fetch scan results.")
        }
        const resultsPayload = await resultsRes.json()
        return resultsPayload.data || []
      }
    }

    throw new Error("Scan job timed out while waiting for scanner-worker.")
  }

  const formatJSON = (str: string) => {
    if (!str) return ""
    try {
      return JSON.stringify(JSON.parse(str), null, 2)
    } catch {
      return str
    }
  }

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

  const [copiedId, setCopiedId] = useState<string | null>(null)
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const selectedTestCase = TEST_CASES.find(t => t.id === testType)

  return (
    <div className="glass-page min-h-full">
      {/* Header */}
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
                  <BreadcrumbLink href="/dashboard/scan">Vulnerabilities</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Active Scanner</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 p-5 pt-0">
        {/* Top Section - Scanner Config */}
        <div className="grid gap-5 xl:grid-cols-3">
          {/* Left - Configuration Form */}
          <Card className="glass-panel border-white/10 xl:col-span-2">
            <CardHeader className="pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <Crosshair className="size-5 text-rose-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Configure Scan</CardTitle>
                  <CardDescription>Select target endpoint and vulnerability test</CardDescription>
                </div>
              </div>
            </CardHeader>

            <form onSubmit={handleStartScan}>
              <CardContent className="space-y-6 pt-5">
                {/* Target Selection */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-sm font-medium text-slate-200">
                    <Target className="size-4 text-emerald-400" />
                    Target Endpoint
                  </Label>
                  <Select
                    value={inventoryId || SELECT_ENDPOINT_DEFAULT}
                    onValueChange={(value) =>
                      setInventoryId(value === SELECT_ENDPOINT_DEFAULT ? "" : value)
                    }
                    required
                  >
                    <SelectTrigger className="h-11 bg-black/30 border-white/10 text-slate-200">
                      <SelectValue placeholder="Select an endpoint to scan" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-slate-200 max-h-80">
                      <SelectItem value={SELECT_ENDPOINT_DEFAULT} className="text-muted-foreground">
                        Select endpoint...
                      </SelectItem>
                      {endpoints.map(ep => (
                        <SelectItem key={ep.ID} value={ep.ID} className="py-2.5">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-xs font-mono ${getMethodColor(ep.Method)}`}>
                              {ep.Method}
                            </Badge>
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

                {/* Test Case Selection */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-sm font-medium text-slate-200">
                    <FlaskConical className="size-4 text-purple-400" />
                    Vulnerability Test Case
                  </Label>
                  <Select
                    value={testType || SELECT_TEST_CASE_DEFAULT}
                    onValueChange={(value) =>
                      setTestType(value === SELECT_TEST_CASE_DEFAULT ? "" : value)
                    }
                    required
                  >
                    <SelectTrigger className="h-11 bg-black/30 border-white/10 text-slate-200">
                      <SelectValue placeholder="Select test case" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                      <SelectItem value={SELECT_TEST_CASE_DEFAULT} className="text-muted-foreground">
                        Select test case...
                      </SelectItem>
                      {TEST_CASES.map(tc => (
                        <SelectItem key={tc.id} value={tc.id} className="py-2.5">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/20">
                              {tc.category}
                            </Badge>
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

                {/* Dynamic Fields */}
                {needsAttackMethod && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Label className="flex items-center gap-2 text-sm font-medium text-slate-200">
                      <Code2 className="size-4 text-amber-400" />
                      Attack Method
                    </Label>
                    <Select value={attackMethod} onValueChange={setAttackMethod}>
                      <SelectTrigger className="h-11 bg-black/30 border-white/10 text-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                        <SelectItem value="DELETE">DELETE</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      HTTP method to use for the privilege escalation test
                    </p>
                  </div>
                )}

                {needsAttackerToken && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Label className="flex items-center gap-2 text-sm font-medium text-slate-200">
                      <KeyRound className="size-4 text-amber-400" />
                      Attacker Auth Token
                    </Label>
                    <Textarea
                      required
                      value={attackerToken}
                      onChange={(e) => setAttackerToken(e.target.value)}
                      placeholder="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="h-24 resize-none bg-black/30 border-white/10 text-slate-200 font-mono text-xs placeholder:text-muted-foreground/50"
                    />
                    <p className="text-xs text-muted-foreground">
                      {testType === "BOLA_PARAMETER_POLLUTION"
                        ? "Paste your own authorization token for the parameter pollution test"
                        : "Paste the authorization token of another user to test for privilege escalation"}
                    </p>
                  </div>
                )}

                {/* Launch Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isScanning || !inventoryId || !testType}
                    className="h-11 px-6 bg-linear-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white border-0 font-semibold shadow-lg shadow-rose-500/20 disabled:opacity-50 disabled:shadow-none"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        {scanStatus === "queued" ? "Queued..." : "Executing Scan..."}
                      </>
                    ) : (
                      <>
                        <Play className="size-4 mr-2" />
                        Launch Scanner
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>

          {/* Right - Quick Stats / Status */}
          <div className="space-y-5">
            <Card className="glass-panel border-white/10">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className={`flex size-12 items-center justify-center rounded-xl border ${
                    isScanning ? "bg-amber-500/10 border-amber-500/20" : 
                    scanResults && scanResults.length > 0 ? "bg-rose-500/10 border-rose-500/20" :
                    scanResults && scanResults.length === 0 ? "bg-emerald-500/10 border-emerald-500/20" :
                    "bg-slate-500/10 border-white/10"
                  }`}>
                    {isScanning ? <Radio className="size-5 text-amber-400 animate-pulse" /> :
                     scanResults && scanResults.length > 0 ? <ShieldX className="size-5 text-rose-400" /> :
                     scanResults && scanResults.length === 0 ? <ShieldCheck className="size-5 text-emerald-400" /> :
                     <ShieldAlert className="size-5 text-slate-400" />}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Scanner Status</p>
                    <p className={`text-lg font-semibold ${
                      isScanning ? "text-amber-400" :
                      scanResults && scanResults.length > 0 ? "text-rose-400" :
                      scanResults && scanResults.length === 0 ? "text-emerald-400" :
                      "text-slate-300"
                    }`}>
                      {isScanning ? (scanStatus === "queued" ? "Queued" : "Scanning...") :
                       scanResults && scanResults.length > 0 ? `${scanResults.length} Finding${scanResults.length > 1 ? "s" : ""}` :
                       scanResults && scanResults.length === 0 ? "Secure" :
                       "Ready"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel border-white/10">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <FileCode2 className="size-5 text-blue-400" />
                  <p className="text-sm font-medium text-slate-200">Quick Tips</p>
                </div>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span><strong className="text-slate-300">BOLA</strong> requires an attacker token from another user session</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span><strong className="text-slate-300">BFLA</strong> tests method swapping (e.g., GET → DELETE)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span><strong className="text-slate-300">JWT tests</strong> check for signature validation flaws</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {inventoryId && (
              <Button variant="outline" size="sm" asChild className="w-full glass-chip border-white/10 text-slate-300 hover:text-white">
                <Link href={`/dashboard/results?inventory_id=${inventoryId}`}>
                  View Past Results
                  <ExternalLink className="ml-2 size-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Bottom Section - Analysis Panels */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Target Analysis */}
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
                    {/* Endpoint URL */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Endpoint</p>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-black/30 border border-white/5">
                        <Badge variant="outline" className={`font-mono ${getMethodColor(selectedEndpointDetails.Method)}`}>
                          {selectedEndpointDetails.Method}
                        </Badge>
                        <code className="text-sm text-slate-200 break-all">
                          {selectedEndpointDetails.BaseURL}{selectedEndpointDetails.PathPattern}
                        </code>
                      </div>
                    </div>

                    {/* Headers */}
                    {selectedEndpointDetails.SampleHeaders && Object.keys(selectedEndpointDetails.SampleHeaders).length > 0 && (
                      <Collapsible defaultOpen>
                        <CollapsibleTrigger asChild>
                          <button className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors">
                            <span>Request Headers</span>
                            <ChevronDown className="size-4" />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="p-4 rounded-lg bg-black/30 border border-white/5 font-mono text-xs space-y-1 max-h-48 overflow-auto">
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

                    {/* Request Body */}
                    {selectedEndpointDetails.SampleReqBody && (
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <button className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors">
                            <span>Request Body</span>
                            <ChevronDown className="size-4" />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="p-4 rounded-lg bg-black/30 border border-white/5 max-h-48 overflow-auto">
                            <pre className="font-mono text-xs text-amber-400 whitespace-pre-wrap break-all">
                              {formatJSON(selectedEndpointDetails.SampleReqBody)}
                            </pre>
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

          {/* Scanner Output */}
          <Card className="glass-panel border-white/10 flex flex-col min-h-96 relative overflow-hidden">
            {/* Progress indicator */}
            {isScanning && (
              <div className="absolute top-0 left-0 w-full h-1 bg-black/20 overflow-hidden z-10">
                <div className="h-full bg-linear-to-r from-rose-500 to-amber-500 w-1/3 animate-progress-indeterminate" />
              </div>
            )}

            <CardHeader className="pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className={`flex size-10 items-center justify-center rounded-xl border ${
                  isScanning ? "bg-amber-500/10 border-amber-500/20" :
                  scanResults && scanResults.length > 0 ? "bg-rose-500/10 border-rose-500/20" :
                  "bg-emerald-500/10 border-emerald-500/20"
                }`}>
                  <Terminal className={`size-5 ${
                    isScanning ? "text-amber-400" :
                    scanResults && scanResults.length > 0 ? "text-rose-400" :
                    "text-emerald-400"
                  }`} />
                </div>
                <div>
                  <CardTitle className="text-lg">Scanner Output</CardTitle>
                  <CardDescription>
                    {isScanning ? "Executing vulnerability tests..." : "Results will appear here"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-5">
                  {/* Error State */}
                  {scanError && (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20">
                      <AlertTriangle className="size-5 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-rose-400">Scan Failed</p>
                        <p className="text-xs text-rose-300/80 mt-1">{scanError}</p>
                      </div>
                    </div>
                  )}

                  {/* Ready State */}
                  {!isScanning && !scanResults && !scanError && (
                    <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-center">
                      <Braces className="size-16 text-white/5 mb-4" />
                      <p className="text-sm font-medium text-slate-400">Ready to Launch</p>
                      <p className="text-xs mt-1">Configure the scan and click Launch Scanner</p>
                    </div>
                  )}

                  {/* Scanning State */}
                  {isScanning && (
                    <div className="h-64 flex flex-col items-center justify-center text-center">
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping" />
                        <Loader2 className="size-12 text-rose-400 animate-spin relative" />
                      </div>
                      <p className="text-sm font-medium text-slate-300 mt-6">Executing Nuclei Engine</p>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        {scanJobId ? `Job ${scanJobId} is ${scanStatus || "queued"}` : "Creating scan job..."}
                      </p>
                    </div>
                  )}

                  {/* Success - No Vulnerabilities */}
                  {!isScanning && scanResults && scanResults.length === 0 && (
                    <div className="flex flex-col items-center justify-center text-center py-8">
                      <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                        <ShieldCheck className="size-8 text-emerald-400" />
                      </div>
                      <p className="text-lg font-semibold text-emerald-400">Target is Secure</p>
                      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                        No vulnerabilities were detected for the selected test case
                      </p>
                      {inventoryId && (
                        <Button variant="outline" size="sm" asChild className="mt-4 glass-chip border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/10">
                          <Link href={`/dashboard/results?inventory_id=${inventoryId}`}>
                            View All Results
                            <ExternalLink className="ml-2 size-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Vulnerabilities Found */}
                  {!isScanning && scanResults && scanResults.length > 0 && (
                    <div className="space-y-4">
                      {scanResults.map((result, idx) => {
                        const resultKey = `result-${idx}`
                        return (
                          <Card
                            key={idx}
                            className={`border-l-4 bg-black/30 border-white/5 ${
                              result.severity?.toLowerCase() === "critical" ? "border-l-rose-500" :
                              result.severity?.toLowerCase() === "high" ? "border-l-orange-500" :
                              result.severity?.toLowerCase() === "medium" ? "border-l-amber-500" :
                              "border-l-emerald-500"
                            }`}
                          >
                            <CardContent className="p-4 space-y-4">
                              {/* Header */}
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className={`${getSeverityColor(result.severity)} text-xs`}>
                                    {result.severity?.toUpperCase()}
                                  </Badge>
                                  <span className="font-semibold text-sm text-slate-200">{result.test_type.replace(/_/g, " ")}</span>
                                </div>
                                <Badge variant="outline" className="text-xs bg-black/30 text-muted-foreground border-white/10">
                                  Status: {result.response_status}
                                </Badge>
                              </div>

                              {/* Description */}
                              <p className="text-sm text-slate-300">{result.description}</p>

                              {/* Proof */}
                              {result.proof && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">cURL Proof</p>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyToClipboard(result.proof, `proof-${resultKey}`)}
                                      className="h-6 px-2 text-xs text-muted-foreground hover:text-slate-200"
                                    >
                                      {copiedId === `proof-${resultKey}` ? (
                                        <><Check className="mr-1 size-3 text-emerald-400" /> Copied</>
                                      ) : (
                                        <><Copy className="mr-1 size-3" /> Copy</>
                                      )}
                                    </Button>
                                  </div>
                                  <div className="p-3 rounded-lg bg-black/40 border border-white/5 overflow-auto max-h-32">
                                    <pre className="font-mono text-xs text-blue-300 whitespace-pre-wrap break-all">
                                      {result.proof}
                                    </pre>
                                  </div>
                                </div>
                              )}

                              {/* Response */}
                              {result.response_body && (
                                <Collapsible>
                                  <CollapsibleTrigger asChild>
                                    <button className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors">
                                      <ChevronDown className="size-3" />
                                      Response Body
                                    </button>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="mt-2">
                                    <div className="p-3 rounded-lg bg-black/40 border border-white/5 overflow-auto max-h-40">
                                      <pre className="font-mono text-xs text-emerald-400 whitespace-pre-wrap break-all">
                                        {result.response_body}
                                      </pre>
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })}

                      {inventoryId && (
                        <div className="flex justify-end pt-2">
                          <Button variant="outline" size="sm" asChild className="glass-chip border-white/10 text-amber-300 hover:bg-amber-500/10">
                            <Link href={`/dashboard/results?inventory_id=${inventoryId}`}>
                              View All Persisted Results
                              <ExternalLink className="ml-2 size-4" />
                            </Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes progress-indeterminate {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(300%);  }
        }
        .animate-progress-indeterminate {
          animation: progress-indeterminate 1.5s infinite linear;
        }
      `}} />
    </div>
  )
}
