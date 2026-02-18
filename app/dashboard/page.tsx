import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  DataClassChart,
  EndpointRiskChart,
  RiskTrendChart,
} from "@/components/dashboard/security-charts"
import {
  AlertTriangle,
  Database,
  Radar,
  ShieldAlert,
  ShieldCheck,
  Target,
} from "lucide-react"

const topStats = [
  {
    title: "Endpoints Captured",
    value: "1,284",
    delta: "+72 / 24h",
    deltaClass: "text-emerald-400",
    icon: Radar,
  },
  {
    title: "Sensitive Data Findings",
    value: "364",
    delta: "+18 / 24h",
    deltaClass: "text-amber-300",
    icon: Database,
  },
  {
    title: "PII Exposures",
    value: "129",
    delta: "-9% vs last week",
    deltaClass: "text-emerald-400",
    icon: Target,
  },
  {
    title: "Open OWASP Risks",
    value: "43",
    delta: "12 critical",
    deltaClass: "text-rose-400",
    icon: ShieldAlert,
  },
]

export default function Page() {
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
                  <BreadcrumbLink href="#">Pages</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {topStats.map((stat) => (
            <Card key={stat.title} className="glass-panel gap-3 py-4">
              <CardContent className="flex items-center justify-between px-4">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">{stat.title}</p>
                  <p className="text-xl font-semibold tracking-tight">{stat.value}</p>
                  <p className={`text-xs font-medium ${stat.deltaClass}`}>{stat.delta}</p>
                </div>
                <div className="glass-chip flex size-10 items-center justify-center rounded-xl">
                  <stat.icon className="size-4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-12">
          <Card className="glass-panel relative overflow-hidden xl:col-span-6">
            <CardHeader className="relative space-y-1">
              <CardDescription>Scanner health</CardDescription>
              <CardTitle className="text-3xl">API Risk Command Center</CardTitle>
              <p className="text-muted-foreground text-sm">Realtime endpoint discovery and OWASP risk mapping.</p>
              <p className="text-muted-foreground text-sm">Last scan completed 4m ago across prod + staging.</p>
            </CardHeader>
            <CardContent className="relative grid gap-3 pb-5 sm:grid-cols-2">
              <div className="glass-chip rounded-xl p-3">
                <p className="text-muted-foreground text-xs">Authenticated APIs</p>
                <p className="text-xl font-semibold">872</p>
              </div>
              <div className="glass-chip rounded-xl p-3">
                <p className="text-muted-foreground text-xs">Unauthenticated APIs</p>
                <p className="text-xl font-semibold">412</p>
              </div>
              <div className="glass-chip rounded-xl p-3 sm:col-span-2">
                <p className="text-muted-foreground text-xs">Top issue class</p>
                <p className="text-lg font-semibold">Broken Object Level Authorization (BOLA)</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel xl:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Data Classification</CardTitle>
              <CardDescription>Detected across traffic</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DataClassChart />
            </CardContent>
          </Card>

          <Card className="glass-panel xl:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">OWASP Coverage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="glass-chip rounded-2xl p-4">
                <p className="text-muted-foreground text-xs">Top 10 Categories Checked</p>
                <p className="text-2xl font-semibold">10 / 10</p>
              </div>
              <div className="glass-chip rounded-2xl p-4">
                <p className="text-muted-foreground text-xs">Endpoints with Auth Gaps</p>
                <p className="text-2xl font-semibold">96</p>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
                <p className="text-muted-foreground text-sm">Security Posture Score</p>
                <p className="text-3xl font-semibold">84</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-12">
          <Card className="glass-panel xl:col-span-8">
            <CardHeader className="pb-2">
              <CardTitle>Risk Trend (Last 7 days)</CardTitle>
              <CardDescription>Critical, high, and medium findings over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="glass-chip rounded-2xl p-4">
                <RiskTrendChart />
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
                <EndpointRiskChart />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Immediate Actions</CardTitle>
              <CardDescription>Prioritized remediation queue</CardDescription>
            </div>
            <Button variant="ghost" size="icon-sm" className="glass-chip" aria-label="security-status">
              <ShieldCheck className="size-4" />
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="glass-chip rounded-xl p-4">
              <p className="text-muted-foreground text-xs">Critical APIs to fix</p>
              <p className="text-2xl font-semibold">12</p>
              <p className="text-muted-foreground mt-1 text-xs">BOLA + auth bypass combinations</p>
            </div>
            <div className="glass-chip rounded-xl p-4">
              <p className="text-muted-foreground text-xs">Secrets in response bodies</p>
              <p className="text-2xl font-semibold">27</p>
              <p className="text-muted-foreground mt-1 text-xs">API keys and internal tokens exposed</p>
            </div>
            <div className="glass-chip rounded-xl p-4">
              <p className="text-muted-foreground text-xs">PII overexposure risks</p>
              <p className="text-2xl font-semibold">41</p>
              <p className="text-muted-foreground mt-1 text-xs">Email, phone and identifiers outside required scope</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Recent Scanner Alerts</CardTitle>
            <CardDescription>Latest high-priority detections from traffic analysis</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {[
              "[HIGH] /api/users/{id} returns SSN in response payload",
              "[CRITICAL] /api/orders/{id} susceptible to IDOR for tenant switching",
              "[HIGH] /api/auth/refresh token accepted without audience validation",
              "[MEDIUM] /api/reports/export allows unbounded records download",
            ].map((alert) => (
              <div key={alert} className="glass-chip flex items-center gap-3 rounded-lg px-3 py-2 text-sm">
                <AlertTriangle className="size-4 text-amber-300" />
                <span>{alert}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}