"use client"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
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

const riskTrendData = [
  { day: "Mon", critical: 4, high: 10, medium: 18 },
  { day: "Tue", critical: 3, high: 9, medium: 16 },
  { day: "Wed", critical: 5, high: 12, medium: 20 },
  { day: "Thu", critical: 4, high: 11, medium: 17 },
  { day: "Fri", critical: 2, high: 8, medium: 14 },
  { day: "Sat", critical: 2, high: 7, medium: 12 },
  { day: "Sun", critical: 1, high: 6, medium: 10 },
]

const riskTrendConfig = {
  critical: { label: "Critical", color: "var(--chart-5)" },
  high: { label: "High", color: "var(--chart-4)" },
  medium: { label: "Medium", color: "var(--chart-1)" },
} satisfies ChartConfig

const endpointRiskData = [
  { endpoint: "/api/auth/login", findings: 9 },
  { endpoint: "/api/users/{id}", findings: 8 },
  { endpoint: "/api/orders", findings: 6 },
  { endpoint: "/api/payments/init", findings: 5 },
  { endpoint: "/api/reports/export", findings: 4 },
]

const endpointRiskConfig = {
  findings: { label: "Findings", color: "var(--chart-4)" },
} satisfies ChartConfig

const dataClassData = [
  { name: "PII", value: 39, fill: "var(--color-pii)" },
  { name: "Secrets", value: 26, fill: "var(--color-secrets)" },
  { name: "Financial", value: 21, fill: "var(--color-financial)" },
  { name: "Public", value: 14, fill: "var(--color-public)" },
]

const dataClassConfig = {
  pii: { label: "PII", color: "var(--chart-1)" },
  secrets: { label: "Secrets", color: "var(--chart-5)" },
  financial: { label: "Financial", color: "var(--chart-4)" },
  public: { label: "Public", color: "var(--chart-2)" },
} satisfies ChartConfig

export function RiskTrendChart() {
  return (
    <ChartContainer config={riskTrendConfig} className="h-72 w-full">
      <AreaChart data={riskTrendData} margin={{ left: 8, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={30} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Area
          type="monotone"
          dataKey="critical"
          stackId="a"
          stroke="var(--color-critical)"
          fill="var(--color-critical)"
          fillOpacity={0.35}
        />
        <Area
          type="monotone"
          dataKey="high"
          stackId="a"
          stroke="var(--color-high)"
          fill="var(--color-high)"
          fillOpacity={0.28}
        />
        <Area
          type="monotone"
          dataKey="medium"
          stackId="a"
          stroke="var(--color-medium)"
          fill="var(--color-medium)"
          fillOpacity={0.2}
        />
      </AreaChart>
    </ChartContainer>
  )
}

export function EndpointRiskChart() {
  return (
    <ChartContainer config={endpointRiskConfig} className="h-64 w-full">
      <BarChart data={endpointRiskData} margin={{ left: 0, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="endpoint"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value: string) => value.replace("/api/", "")}
        />
        <YAxis tickLine={false} axisLine={false} width={24} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="findings" radius={[6, 6, 0, 0]} fill="var(--color-findings)" />
      </BarChart>
    </ChartContainer>
  )
}

export function DataClassChart() {
  return (
    <ChartContainer config={dataClassConfig} className="h-56 w-full">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
        <ChartLegend
          content={<ChartLegendContent nameKey="name" />}
          verticalAlign="bottom"
        />
        <Pie
          data={dataClassData}
          dataKey="value"
          nameKey="name"
          innerRadius={52}
          outerRadius={84}
          paddingAngle={4}
          strokeWidth={0}
        />
      </PieChart>
    </ChartContainer>
  )
}
