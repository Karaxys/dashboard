"use client"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"

import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

// ─── Exported Types ────────────────────────────────────────────────────────────

export interface DailyIssueCounts {
  day: string
  critical: number
  high: number
  medium: number
  low: number
}

export interface TopEndpoint {
  inventory_id: string
  path: string
  method: string
  issue_count: number
}

export interface SensitiveDataBreakdown {
  pii: number
  financial: number
  secrets: number
  other: number
}

// ─── Risk Trend Chart — 7-day stacked area ───────────────────────────────────

const riskTrendConfig = {
  critical: { label: "Critical", color: "var(--chart-5)" },
  high:     { label: "High",     color: "var(--chart-4)" },
  medium:   { label: "Medium",   color: "var(--chart-1)" },
} satisfies ChartConfig

function labelDay(iso: string): string {
  const d = new Date(iso + "T00:00:00Z")
  return d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })
}

function buildFallbackTrend(): { day: string; critical: number; high: number; medium: number; low: number }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return { day: d.toLocaleDateString("en-US", { weekday: "short" }), critical: 0, high: 0, medium: 0, low: 0 }
  })
}

export function RiskTrendChart({ data }: { data?: DailyIssueCounts[] }) {
  const chartData = data && data.length > 0
    ? data.map(d => ({ ...d, day: labelDay(d.day) }))
    : buildFallbackTrend()
  return (
    <ChartContainer config={riskTrendConfig} className="h-72 w-full">
      <AreaChart data={chartData} margin={{ left: 8, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={30} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Area type="monotone" dataKey="critical" stackId="a" stroke="var(--color-critical)" fill="var(--color-critical)" fillOpacity={0.35} />
        <Area type="monotone" dataKey="high"     stackId="a" stroke="var(--color-high)"     fill="var(--color-high)"     fillOpacity={0.28} />
        <Area type="monotone" dataKey="medium"   stackId="a" stroke="var(--color-medium)"   fill="var(--color-medium)"   fillOpacity={0.20} />
      </AreaChart>
    </ChartContainer>
  )
}

// ─── Top Endpoints by Findings — live bar chart ──────────────────────────────

const endpointConfig = {
  issue_count: { label: "Findings", color: "var(--chart-4)" },
} satisfies ChartConfig

const FALLBACK_ENDPOINTS = [{ label: "—", issue_count: 0 }]

export function EndpointRiskChart({ data }: { data?: TopEndpoint[] }) {
  const chartData = data && data.length > 0
    ? data.map(e => ({
        label: (e.path || e.inventory_id.slice(-8)).replace(/\/api\//, "/").substring(0, 22),
        issue_count: e.issue_count,
      }))
    : FALLBACK_ENDPOINTS
  return (
    <ChartContainer config={endpointConfig} className="h-64 w-full">
      <BarChart data={chartData} margin={{ left: 0, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 10, fill: "#94a3b8" }} />
        <YAxis tickLine={false} axisLine={false} width={24} tick={{ fontSize: 11, fill: "#94a3b8" }} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="issue_count" name="Findings" radius={[6, 6, 0, 0]} fill="var(--color-issue_count)" />
      </BarChart>
    </ChartContainer>
  )
}

// ─── Data Classification Donut — live sensitive-data breakdown ────────────────

const DATA_COLORS = {
  pii:       "#f59e0b",
  financial: "#f43f5e",
  secrets:   "#8b5cf6",
  other:     "#10b981",
}

const dataClassConfig = {
  pii:       { label: "PII",       color: DATA_COLORS.pii       },
  financial: { label: "Financial", color: DATA_COLORS.financial  },
  secrets:   { label: "Secrets",   color: DATA_COLORS.secrets    },
  other:     { label: "Other",     color: DATA_COLORS.other      },
} satisfies ChartConfig

const CustomTooltip = ({ active, payload }: {
  active?: boolean
  payload?: { name: string; value: number; fill: string }[]
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs shadow-xl">
      <p style={{ color: payload[0].fill }} className="font-semibold">
        {payload[0].name}: <span className="text-slate-200">{payload[0].value} endpoints</span>
      </p>
    </div>
  )
}

export function DataClassChart({ data }: { data?: SensitiveDataBreakdown }) {
  const chartData = [
    { name: "PII",       value: data?.pii       ?? 0, fill: DATA_COLORS.pii       },
    { name: "Financial", value: data?.financial  ?? 0, fill: DATA_COLORS.financial },
    { name: "Secrets",   value: data?.secrets    ?? 0, fill: DATA_COLORS.secrets   },
    { name: "Other",     value: data?.other      ?? 0, fill: DATA_COLORS.other     },
  ]
  const hasData = chartData.some(d => d.value > 0)
  // Show demo data when empty so the chart renders meaningfully
  const displayData = hasData ? chartData : [
    { name: "PII",       value: 39, fill: DATA_COLORS.pii       },
    { name: "Financial", value: 26, fill: DATA_COLORS.financial },
    { name: "Secrets",   value: 21, fill: DATA_COLORS.secrets   },
    { name: "Other",     value: 14, fill: DATA_COLORS.other     },
  ]
  return (
    <ChartContainer config={dataClassConfig} className="h-56 w-full">
      <PieChart>
        <ChartTooltip content={<CustomTooltip />} />
        <ChartLegend content={<ChartLegendContent nameKey="name" />} verticalAlign="bottom" />
        <Pie data={displayData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={4} strokeWidth={0}>
          {displayData.map(entry => <Cell key={entry.name} fill={entry.fill} />)}
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}
