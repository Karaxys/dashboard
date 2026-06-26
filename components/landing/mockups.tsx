const severityColor: Record<string, string> = {
  CRITICAL: "text-rose-400",
  HIGH:     "text-orange-400",
  MEDIUM:   "text-amber-300",
  LOW:      "text-emerald-400",
}

const severityBadge: Record<string, string> = {
  CRITICAL: "bg-rose-500/10 text-rose-400",
  HIGH:     "bg-orange-500/10 text-orange-400",
  MEDIUM:   "bg-amber-500/10 text-amber-300",
  LOW:      "bg-emerald-500/10 text-emerald-400",
}

const findings = [
  { severity: "CRITICAL", type: "BOLA",              method: "GET",  path: "/api/v2/users/{id}",    detail: "Object ID enumerable across accounts" },
  { severity: "HIGH",     type: "Missing Auth",       method: "PUT",  path: "/internal/admin/flags", detail: "Endpoint reachable without a token" },
  { severity: "HIGH",     type: "PII Exposure",       method: "GET",  path: "/api/v2/orders/export", detail: "Email + address in response body" },
  { severity: "MEDIUM",   type: "Rate Limit Bypass",  method: "POST", path: "/api/v2/auth/login",    detail: "No throttling on failed attempts" },
  { severity: "LOW",      type: "Deprecated",         method: "GET",  path: "/api/v1/users",         detail: "Legacy version still serving traffic" },
  { severity: "HIGH",     type: "BFLA",               method: "DELETE", path: "/api/v2/projects/42", detail: "Role check missing on destructive op" },
  { severity: "MEDIUM",   type: "Mass Assignment",    method: "PATCH", path: "/api/v2/users/me",     detail: "Privileged fields writable by user" },
]

function FindingCard({ f }: { f: (typeof findings)[number] }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
      <div className="flex items-center justify-between">
        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${severityBadge[f.severity]}`}>
          {f.severity}
        </span>
        <span className="text-xs font-medium text-slate-500">{f.type}</span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-sky-400">
          {f.method}
        </span>
        <span className="min-w-0 truncate font-mono text-xs text-slate-300">{f.path}</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">{f.detail}</p>
    </div>
  )
}

export function FindingsMockup() {
  return (
    /* Auto-scrolling card column with fade masks top & bottom — no outer enclosure */
    <div
      className="marquee-y-track relative h-125 overflow-hidden"
      style={{
        maskImage:
          "linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)",
      }}
    >
      <div className="marquee-y gap-3">
        {[...findings, ...findings].map((f, i) => (
          <FindingCard key={`${f.path}-${i}`} f={f} />
        ))}
      </div>
    </div>
  )
}

const inventoryRows = [
  { method: "GET",  path: "/api/v2/users",         auth: true,  pii: true,  risk: "HIGH" },
  { method: "POST", path: "/api/v2/auth/login",     auth: true,  pii: false, risk: "MEDIUM" },
  { method: "GET",  path: "/api/v2/orders/export",  auth: true,  pii: true,  risk: "HIGH" },
  { method: "PUT",  path: "/internal/admin/flags",  auth: false, pii: false, risk: "CRITICAL" },
  { method: "GET",  path: "/api/v2/health",         auth: false, pii: false, risk: "LOW" },
]

export function InventoryMockup() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/50">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <span className="text-sm font-semibold text-slate-100">API Inventory</span>
        <span className="text-xs text-slate-500">1,284 endpoints</span>
      </div>
      <div className="p-2">
        <div className="mb-1 grid grid-cols-[48px_1fr_60px_44px_68px] gap-x-3 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-600">
          <span>Method</span>
          <span>Path</span>
          <span>Auth</span>
          <span>PII</span>
          <span className="text-right">Risk</span>
        </div>
        {inventoryRows.map((row) => (
          <div
            key={row.path}
            className="grid grid-cols-[48px_1fr_60px_44px_68px] items-center gap-x-3 rounded-lg px-3 py-2 hover:bg-slate-800/60"
          >
            <span className="font-mono text-xs font-medium text-sky-400">{row.method}</span>
            <span className="truncate font-mono text-xs text-slate-300">{row.path}</span>
            <span className={`text-xs ${row.auth ? "text-emerald-400" : "text-rose-400"}`}>
              {row.auth ? "✓ Auth" : "✗ None"}
            </span>
            <span className={`text-xs ${row.pii ? "text-amber-400" : "text-slate-600"}`}>
              {row.pii ? "PII" : "–"}
            </span>
            <span className={`text-right font-mono text-xs font-semibold ${severityColor[row.risk]}`}>
              {row.risk}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
