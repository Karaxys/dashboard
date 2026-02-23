"use client"
import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  ArrowLeft, Activity, ShieldAlert, Database, Globe, 
  Clock, Braces, KeyRound, Lock, Fingerprint, CreditCard, FileText, User
} from "lucide-react"

interface ApiInventoryDetail {
  ID?: string
  _id?: { $oid: string }
  Method: string
  BaseURL: string
  PathPattern: string
  OriginalPath: string
  RiskLevel: string
  SensitiveData: string[] | null
  SampleHeaders: Record<string, string[]> | null
  SampleReqBody: string
  SampleRespBody: string
  CreatedAt: string | { $date: string }
  UpdatedAt: string | { $date: string }
}

export default function LogDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [log, setLog] = useState<ApiInventoryDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLogDetails = async () => {
      try {
        const res = await fetch(`http://localhost:8081/inventory/${id}`)
        if (!res.ok) throw new Error("Failed to fetch endpoint details")
        const data = await res.json()
        setLog(data)
      } catch (err: any) {
        setError(err.message || "An error occurred")
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchLogDetails()
  }, [id])

  const getRiskColor = (risk: string) => {
    switch ((risk || "").toUpperCase()) {
      case "CRITICAL": return "bg-rose-500/10 text-rose-400 border-rose-500/20"
      case "HIGH": return "bg-orange-500/10 text-orange-400 border-orange-500/20"
      case "MEDIUM": return "bg-amber-500/10 text-amber-400 border-amber-500/20"
      case "LOW": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      default: return "bg-slate-500/10 text-slate-400 border-slate-500/20"
    }
  }

  const getMethodColor = (method: string) => {
    switch (method?.toUpperCase()) {
      case "GET": return "bg-blue-500/10 text-blue-400 border-blue-500/20"
      case "POST": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      case "PUT": return "bg-amber-500/10 text-amber-400 border-amber-500/20"
      case "DELETE": return "bg-rose-500/10 text-rose-400 border-rose-500/20"
      default: return "bg-slate-500/10 text-slate-400 border-slate-500/20"
    }
  }

  const parseDate = (dateObj: any) => {
    if (!dateObj) return "Unknown"
    const dateStr = typeof dateObj === 'string' ? dateObj : dateObj.$date
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(new Date(dateStr))
  }

  const formatJSON = (str: string) => {
    if (!str) return "No content"
    try {
      return JSON.stringify(JSON.parse(str), null, 2)
    } catch {
      return str
    }
  }

  const getSensitivityData = (tag: string) => {
    const t = tag.toUpperCase()
    let val = 25
    let color = "bg-slate-500"
    let Icon = Lock

    // Auth tags
    if (["PASSWORD", "AUTH_TOKEN_BEARER", "AWS_KEY"].includes(t)) { val = 100; Icon = KeyRound }
    else if (t === "JWT_TOKEN") { val = 95; Icon = KeyRound }   
    // Financial tags
    else if (["VISA_CARD", "MASTER_CARD"].includes(t)) { val = 90; Icon = CreditCard }
    else if (t === "CREDIT_CARD") { val = 85; Icon = CreditCard }
    else if (t === "IBAN_CODE") { val = 75; Icon = CreditCard }
    else if (t === "SWIFT_CODE") { val = 70; Icon = CreditCard }    
    // Identity tags
    else if (["US_SSN", "INDIAN_AADHAR"].includes(t)) { val = 90; Icon = Fingerprint }
    else if (t === "CANADIAN_SIN") { val = 85; Icon = Fingerprint }
    else if (t === "FINNISH_PIN") { val = 80; Icon = Fingerprint }
    else if (["INDIAN_PAN", "PASSPORT_NO", "GERMAN_INSURANCE_ID", "INDIAN_HEALTH_ID"].includes(t)) { val = 75; Icon = FileText }
    else if (["DRIVERS_LICENSE", "US_MEDICARE"].includes(t)) { val = 70; Icon = FileText }   
    // Contact tags
    else if (t === "DATE_OF_BIRTH") { val = 45; Icon = User }
    else if (["ADDRESS", "STREET_ADDRESS"].includes(t)) { val = 40; Icon = User }
    else if (["EMAIL", "PHONE_NUMBER"].includes(t)) { val = 35; Icon = User }
    else if (["FULL_NAME", "PERSON_NAME", "USERNAME", "USER_ID"].includes(t)) { val = 30; Icon = User }

    if (val >= 85) color = "bg-rose-500"
    else if (val >= 70) color = "bg-orange-500"
    else if (val >= 40) color = "bg-amber-500"
    else if (val >= 30) color = "bg-emerald-500"   
    return { val, color, icon: Icon }
  }

  if (loading) return <div className="p-8 text-white">Loading details...</div>
  if (error || !log) return <div className="p-8 text-rose-400">Error: {error}</div>

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
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard/logs">Logs</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-mono text-xs">{id}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
      </header>

      {/*Main*/}
      <div className="flex flex-1 flex-col gap-6 p-6 pt-0">        
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()} className="glass-chip border-white/10">
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex flex-1 items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Endpoint Analysis</h1>
              <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2">
                <Clock className="size-3" /> Captured on {parseDate(log.CreatedAt)}
              </p>
            </div>
            <Badge variant="outline" className={`px-4 py-1.5 text-base font-mono font-semibold ${getRiskColor(log.RiskLevel)}`}>
              {log.RiskLevel || "UNKNOWN"}
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass-panel p-5">
            <p className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
              <Globe className="size-4 text-blue-400" /> API Route
            </p>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={`text-base font-mono px-3 py-1 ${getMethodColor(log.Method)}`}>
                {log.Method}
              </Badge>
              <span className="font-mono text-lg truncate text-slate-200" title={log.PathPattern}>
                {log.PathPattern}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-3 truncate">Base: {log.BaseURL}</p>
          </Card>

          <Card className="glass-panel p-5">
            <p className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
              <Database className="size-4 text-emerald-400" /> Data Classification
            </p>
            <div className="text-3xl font-bold text-slate-200">
              {log.SensitiveData?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Sensitive data types detected in traffic</p>
          </Card>

          <Card className="glass-panel p-5">
            <p className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
              <Activity className="size-4 text-purple-400" /> Traffic Signatures
            </p>
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex justify-between text-base">
                <span className="text-slate-400">Headers Count</span>
                <span className="font-mono text-lg font-semibold">{Object.keys(log.SampleHeaders || {}).length}</span>
              </div>
              <div className="flex justify-between text-base">
                <span className="text-slate-400">Response Size</span>
                <span className="font-mono text-lg font-semibold">{log.SampleRespBody?.length || 0} bytes</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="glass-panel xl:col-span-1 flex flex-col">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldAlert className="size-5 text-amber-400" />
                Data Exposure Profile
              </CardTitle>
              <CardDescription>Based on exposure risk weights</CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex-1">
              {!log.SensitiveData || log.SensitiveData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                  No sensitive data detected.
                </div>
              ) : (
                <div className="space-y-5">
                  {[...log.SensitiveData]
                    .sort((a, b) => getSensitivityData(b).val - getSensitivityData(a).val)
                    .map((item, idx) => {
                    const weight = getSensitivityData(item)
                    return (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 font-medium text-slate-200">
                            <weight.icon className="size-4 text-muted-foreground" />
                            {item.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">{weight.val} Weight</span>
                        </div>
                        <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${weight.color} rounded-full transition-all duration-500`} 
                            style={{ width: `${weight.val}%` }} 
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/*TechnicalDetails*/}
          <Card className="glass-panel xl:col-span-2 flex flex-col">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Braces className="size-5 text-blue-400" />
                Raw Traffic Capture
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <Tabs defaultValue="response" className="w-full flex flex-col h-full">
                <div className="px-4 pt-4 border-b border-white/5">
                  <TabsList variant="line" className="h-auto gap-6 rounded-none border-0 bg-transparent p-0">
                    <TabsTrigger
                      value="response"
                      className="cursor-pointer rounded-none border-0 bg-transparent px-0 py-0 text-base text-white shadow-none transition-colors hover:text-amber-400 after:bg-amber-400 data-[state=active]:bg-transparent data-[state=active]:text-amber-400 data-[state=active]:shadow-none"
                    >
                      Response Body
                    </TabsTrigger>
                    <TabsTrigger
                      value="headers"
                      className="cursor-pointer rounded-none border-0 bg-transparent px-0 py-0 text-base text-white shadow-none transition-colors hover:text-amber-400 after:bg-amber-400 data-[state=active]:bg-transparent data-[state=active]:text-amber-400 data-[state=active]:shadow-none"
                    >
                      Headers
                    </TabsTrigger>
                    <TabsTrigger
                      value="request"
                      className="cursor-pointer rounded-none border-0 bg-transparent px-0 py-0 text-base text-white shadow-none transition-colors hover:text-amber-400 after:bg-amber-400 data-[state=active]:bg-transparent data-[state=active]:text-amber-400 data-[state=active]:shadow-none"
                    >
                      Request Body
                    </TabsTrigger>
                  </TabsList>
                </div>                
                <div className="p-4 flex-1">
                  <TabsContent value="response" className="m-0 h-full">
                    <ScrollArea className="h-100 w-full rounded-md border border-white/5 bg-black/40 p-4">
                      <pre className="text-sm text-emerald-400 font-mono">
                        {formatJSON(log.SampleRespBody)}
                      </pre>
                    </ScrollArea>
                  </TabsContent>                 
                  <TabsContent value="headers" className="m-0 h-full">
                    <ScrollArea className="h-100 w-full rounded-md border border-white/5 bg-black/40 p-4">
                      <div className="space-y-2 font-mono text-sm">
                        {Object.entries(log.SampleHeaders || {}).map(([key, vals]) => (
                          <div key={key} className="wrap-break-words">
                            <span className="text-blue-400 font-semibold">{key}: </span>
                            <span className="text-slate-300">{vals.join(', ')}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="request" className="m-0 h-full">
                    <ScrollArea className="h-100 w-full rounded-md border border-white/5 bg-black/40 p-4">
                      <pre className="text-sm text-amber-400 font-mono">
                        {formatJSON(log.SampleReqBody)}
                      </pre>
                    </ScrollArea>
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}