"use client"
import React, { useState, useEffect } from "react"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Play, ShieldAlert, Target, KeyRound, Zap,
  Info, CheckCircle2, AlertTriangle, Terminal,
  Globe, Braces, Loader2
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

interface ApiInventory {
  ID: string
  Method: string
  BaseURL: string
  PathPattern: string
  RiskLevel?: string
}

const TEST_CASES = [
  { id: "BOLA", label: "BOLA (Auth Token Swap)", desc: "Check if User B can access User A's data." },
  { id: "BFLA", label: "BFLA (Method Swapping)", desc: "Check if standard user can perform Admin actions." },
  { id: "BROKEN_USER_AUTH", label: "Broken User Auth", desc: "Check if endpoint allows anonymous access." },
  { id: "BOLA_PARAMETER_POLLUTION", label: "BOLA Parameter Pollution", desc: "Send duplicate IDs to confuse auth middleware." },
  { id: "SWAGGER_CHECK", label: "Swagger Check", desc: "Find hidden API documentation." },
  { id: "JWT_NONE_ALGO", label: "JWT None Algorithm", desc: "Check if server accepts unsigned JWT (alg: none)." },
  { id: "JWT_INVALID_SIGNATURE", label: "JWT Invalid Signature", desc: "Check if server verifies cryptographic signature." },
  { id: "OPEN_REDIRECT", label: "Open Redirect", desc: "Check if URL params can redirect to malicious sites." },
  { id: "EXPOSED_METRICS", label: "Exposed Metrics", desc: "Find internal DevOps monitoring tools." }
]

const SELECT_ENDPOINT_DEFAULT = "__SELECT_ENDPOINT__"
const SELECT_TEST_CASE_DEFAULT = "__SELECT_TEST_CASE__"

export default function ScanPage() {
  const searchParams = useSearchParams()
  // Data States
  const [endpoints, setEndpoints] = useState<ApiInventory[]>([])
  const [selectedEndpointDetails, setSelectedEndpointDetails] = useState<any>(null)
  // Form States
  const [inventoryId, setInventoryId] = useState("")
  const [testType, setTestType] = useState("")
  const [attackMethod, setAttackMethod] = useState("DELETE")
  const [attackerToken, setAttackerToken] = useState("")
  // Scan States
  const [isScanning, setIsScanning] = useState(false)
  const [scanResults, setScanResults] = useState<ScanResult[] | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)

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

      const data = await res.json()
      setScanResults(data || [])
    } catch (err: any) {
      setScanError(err.message || "An error occurred during the scan.")
    } finally {
      setIsScanning(false)
    }
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
      case "critical": return "bg-rose-500/10 text-rose-400 border-rose-500/20"
      case "high":     return "bg-orange-500/10 text-orange-400 border-orange-500/20"
      case "medium":   return "bg-amber-500/10 text-amber-400 border-amber-500/20"
      case "low":      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      default:         return "bg-slate-500/10 text-slate-400 border-slate-500/20"
    }
  }

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

      <div className="flex flex-1 flex-col gap-5 p-6 pt-2">

        {/* Instructions Alert */}
        <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-100">
          <Info className="size-4 text-blue-400" />
          <AlertTitle className="text-sm font-semibold text-blue-400 tracking-wide">Scanner Instructions</AlertTitle>
          <AlertDescription className="mt-2 text-sm text-blue-200/80 space-y-1">
            <p>1. Select the target endpoint from the dropdown (or click 'Start Scan' from the Logs page).</p>
            <p>2. Select the vulnerability Test Case you want to execute.</p>
            <p>3. Dynamic fields will appear based on the test case (e.g., <strong>BOLA</strong> requires an attacker token from another user session, <strong>BFLA</strong> requires an attack method like DELETE).</p>
            <p>4. Launch the scan and wait for the Nuclei engine to process the payloads.</p>
          </AlertDescription>
        </Alert>
        <Card className="glass-panel bg-card/50 border-white/10">
          {/* No border-b → no underline below the title */}
          <CardHeader className="pb-1.5">
            <CardTitle className="text-lg font-semibold flex items-center gap-2.5">
              <ShieldAlert className="size-5 text-rose-400" />
              Configure Active Scan
            </CardTitle>
          </CardHeader>

          <form onSubmit={handleStartScan}>
            <CardContent className="space-y-5 pt-2">
              <div className="grid gap-5 md:grid-cols-2">
                {/* Endpoint Selection */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm text-slate-300">
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
                    <SelectTrigger className="bg-black/20 border-white/10 text-sm text-slate-200">
                      <SelectValue placeholder="Select an endpoint to scan" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-slate-200 max-h-75">
                      <SelectItem value={SELECT_ENDPOINT_DEFAULT} className="text-sm text-muted-foreground">
                        Select endpoint
                      </SelectItem>
                      {endpoints.map(ep => (
                        <SelectItem key={ep.ID} value={ep.ID} className="font-mono text-xs">
                          <span className={`mr-2 font-bold ${
                            ep.Method === "GET"    ? "text-blue-400"    :
                            ep.Method === "POST"   ? "text-emerald-400" :
                            ep.Method === "DELETE" ? "text-rose-400"    : "text-amber-400"
                          }`}>{ep.Method}</span>
                          {ep.PathPattern}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Test Case Selection */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm text-slate-300">
                    <Zap className="size-4 text-purple-400" />
                    Vulnerability Test Case
                  </Label>
                  <Select
                    value={testType || SELECT_TEST_CASE_DEFAULT}
                    onValueChange={(value) =>
                      setTestType(value === SELECT_TEST_CASE_DEFAULT ? "" : value)
                    }
                    required
                  >
                    <SelectTrigger className="bg-black/20 border-white/10 text-sm text-slate-200">
                      <SelectValue placeholder="Select test case" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                      <SelectItem value={SELECT_TEST_CASE_DEFAULT} className="text-sm text-muted-foreground">
                        Select test case
                      </SelectItem>
                      {TEST_CASES.map(tc => (
                        <SelectItem key={tc.id} value={tc.id} className="text-sm">
                          {tc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {testType && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {TEST_CASES.find(t => t.id === testType)?.desc}
                    </p>
                  )}
                </div>
              </div>

              {/* Dynamic Fields */}
              <div className="grid gap-5 md:grid-cols-2">
                {needsAttackMethod && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label className="text-sm text-slate-300">Attack Method (for Method Swapping)</Label>
                    <Select value={attackMethod} onValueChange={setAttackMethod}>
                      <SelectTrigger className="bg-black/20 border-white/10 text-sm text-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                        <SelectItem value="DELETE">DELETE</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {needsAttackerToken && (
                  <div className="space-y-2 md:col-span-2 animate-in fade-in slide-in-from-top-2">
                    <Label className="flex items-center gap-2 text-sm text-slate-300">
                      <KeyRound className="size-4 text-amber-400" />
                      Attacker Auth Token
                    </Label>
                    <Textarea
                      required
                      value={attackerToken}
                      onChange={(e) => setAttackerToken(e.target.value)}
                      placeholder="Bearer eyJhbGciOiJIUzI1..."
                      className="h-20 resize-none bg-black/20 border-white/10 text-slate-200 font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      {testType === "BOLA_PARAMETER_POLLUTION"
                        ? "Paste your own authorization token"
                        : "Paste the authorization token of a secondary user to test for privilege escalation."}
                    </p>
                  </div>
                )}
              </div>
              <div className="pt-1">
                <Button
                  type="submit"
                  disabled={isScanning || !inventoryId || !testType}
                  className="w-full sm:w-auto glass-chip bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 border border-rose-500/30 text-sm font-semibold"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Executing Nuclei Scan...
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

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Left — Target Details */}
          <Card className="glass-panel bg-card/50 border-white/10 h-125 flex flex-col">
            <CardHeader className="pb-1.5">
              <CardTitle className="text-lg font-semibold flex items-center gap-2.5">
                <Globe className="size-5 text-blue-400" />
                Target Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              {selectedEndpointDetails ? (
                <ScrollArea className="h-full w-full p-4">
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Endpoint URL</h4>
                      <div className="flex items-center gap-3 bg-black/30 p-3 rounded-lg border border-white/5">
                        <Badge variant="outline" className="bg-slate-800 text-slate-300 border-white/10 text-xs">
                          {selectedEndpointDetails.Method}
                        </Badge>
                        <span className="font-mono text-sm text-slate-200 break-all">
                          {selectedEndpointDetails.BaseURL}{selectedEndpointDetails.PathPattern}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Original Request Headers</h4>
                      <div className="bg-black/30 p-4 rounded-lg border border-white/5 font-mono text-xs text-slate-300 space-y-1">
                        {Object.entries(selectedEndpointDetails.SampleHeaders || {}).map(([key, vals]: any) => (
                          <div key={key} className="break-all whitespace-pre-wrap">
                            <span className="text-blue-400 font-semibold">{key}: </span>
                            <span>{vals.join(', ')}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedEndpointDetails.SampleReqBody && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Original Request Body</h4>
                        <div className="bg-black/30 p-4 rounded-lg border border-white/5 font-mono text-xs text-amber-400 overflow-x-hidden">
                          <pre className="whitespace-pre-wrap break-all">
                            {formatJSON(selectedEndpointDetails.SampleReqBody)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm p-6 text-center">
                  Select an endpoint from the dropdown to view its original traffic capture.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right — Scan Results */}
          <Card className="glass-panel bg-card/50 border-white/10 h-125 flex flex-col relative overflow-hidden">
            {isScanning && (
              <div className="absolute top-0 left-0 w-full h-1 bg-black/20 overflow-hidden">
                <div className="h-full bg-rose-500 w-1/3 animate-progress-indeterminate" />
              </div>
            )}
            <CardHeader className="pb-1.5">
              <CardTitle className="text-lg font-semibold flex items-center gap-2.5">
                <Terminal className="size-5 text-emerald-400" />
                Scanner Output
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full w-full p-4">

                {scanError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="size-5 shrink-0 mt-0.5" />
                    <p className="text-sm">{scanError}</p>
                  </div>
                )}

                {!isScanning && !scanResults && !scanError && (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm py-20">
                    <Braces className="size-10 text-white/10 mb-4" />
                    <p>Ready to launch. Output will appear here.</p>
                  </div>
                )}

                {isScanning && (
                  <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400 space-y-4">
                    <Loader2 className="size-8 animate-spin text-rose-400" />
                    <p className="text-sm font-mono animate-pulse">Forging payload and awaiting engine response...</p>
                  </div>
                )}

                {!isScanning && scanResults && scanResults.length === 0 && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-6 rounded-lg flex flex-col items-center text-center gap-3">
                    <CheckCircle2 className="size-10" />
                    <div>
                      <p className="font-semibold text-base">Target is Secure</p>
                      <p className="text-sm opacity-80 mt-1">No vulnerabilities were detected for the executed test case.</p>
                    </div>
                    {inventoryId && (
                      <Button variant="outline" size="sm" asChild className="glass-chip border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/10">
                        <Link href={`/dashboard/results?inventory_id=${inventoryId}`}>
                          View persisted results
                        </Link>
                      </Button>
                    )}
                  </div>
                )}

                {!isScanning && scanResults && scanResults.length > 0 && (
                  <div className="space-y-4 pb-4">
                    {scanResults.map((result, idx) => (
                      <div key={idx} className="bg-black/40 border border-rose-500/30 rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`${getSeverityColor(result.severity)} text-xs`}>
                              {result.severity.toUpperCase()}
                            </Badge>
                            <span className="font-semibold text-sm text-slate-200">{result.test_type}</span>
                          </div>
                          <span className="text-xs font-mono text-muted-foreground">Status: {result.response_status}</span>
                        </div>

                        <p className="text-sm text-slate-300">{result.description}</p>

                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">CURL Proof of Concept</p>
                          <div className="bg-black/60 p-3 rounded border border-white/5 font-mono text-xs text-blue-300 break-all whitespace-pre-wrap">
                            {result.proof}
                          </div>
                        </div>

                        {result.response_body && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Response Snippet</p>
                            <div className="bg-black/60 p-3 rounded border border-white/5 font-mono text-xs text-emerald-400 max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
                              {result.response_body}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {inventoryId && (
                      <div className="flex justify-end pt-1">
                        <Button variant="outline" size="sm" asChild className="glass-chip border-white/10 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200">
                          <Link href={`/dashboard/results?inventory_id=${inventoryId}`}>
                            View persisted results
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                )}

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