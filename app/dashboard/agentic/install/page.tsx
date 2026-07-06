"use client"
import React, { useState } from "react"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, KeyRound, Copy, Check, RefreshCcw, Eye, EyeOff, ShieldCheck } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface TokenResponse {
  token: string
  token_prefix: string
  events_url: string
}

const CONNECTORS = [
  { id: "auto", label: "Auto-detect" },
  { id: "claude_code_cli", label: "Claude Code" },
  { id: "cursor", label: "Cursor" },
  { id: "gemini_cli", label: "Gemini CLI" },
  { id: "codex_cli", label: "Codex CLI" },
  { id: "vscode_copilot", label: "VS Code Copilot" },
  { id: "langchain", label: "LangChain" },
]

const REPO = "https://github.com/Karaxys/karaxys-mcp-shield.git"
const BOOTSTRAP_URL = "https://raw.githubusercontent.com/Karaxys/karaxys-mcp-shield/main/installer/bootstrap.sh"

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="outline" size="sm"
      className="glass-chip border-white/10 shrink-0"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* clipboard unavailable */ }
      }}
    >
      {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
    </Button>
  )
}

export default function InstallShieldPage() {
  const [token, setToken] = useState<TokenResponse | null>(null)
  const [reveal, setReveal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connector, setConnector] = useState("auto")

  const fetchToken = async () => {
    setLoading(true); setError(null)
    try {
      const res = await apiFetch<TokenResponse>("/v1/agentic/shield-token", { method: "POST" })
      setToken(res); setReveal(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to retrieve shield token")
    } finally { setLoading(false) }
  }

  const eventsUrl = token?.events_url || "http://localhost:8083/v1/agentic/events"
  const tokenValue = token?.token || "<shield-token>"
  const connectorFlag = connector === "auto" ? "" : ` --connector ${connector}`
  // Primary path: one line, no clone/cd — the bootstrap clones + installs + wires.
  const installCmd =
    `curl -fsSL ${BOOTSTRAP_URL} | bash -s -- \\\n` +
    `  --token ${tokenValue} \\\n` +
    `  --events-url ${eventsUrl}${connectorFlag}`
  // Fallback for users who prefer to inspect the source first.
  const manualCmd =
    `git clone ${REPO} && cd karaxys-mcp-shield && \\\n` +
    `  ./installer/install.sh${connectorFlag} --events-url ${eventsUrl} --token ${tokenValue}`
  const uninstallCmd = `curl -fsSL ${BOOTSTRAP_URL} | bash -s -- --uninstall${connectorFlag}`

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
              <BreadcrumbItem><BreadcrumbPage>Install Shield</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 p-5 pt-0 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Download className="size-6 text-emerald-400" /> Install the Agent Shield
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            The shield hooks your AI coding agents and streams their prompts and tool calls here. One install command per machine.
          </p>
        </div>

        {/* Step 1 — token */}
        <Card className="bg-black/20 border-white/10">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 text-amber-400" />
              <span className="font-semibold text-sm">1 · Shield token</span>
            </div>
            <p className="text-xs text-muted-foreground">
              The token authorizes this account. It is the same account-scoped token used for traffic ingest — reveal it once and reuse it, or rotate to invalidate old installs.
            </p>
            {token ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-sm bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-emerald-300 truncate">
                  {reveal ? token.token : `${token.token_prefix}${"•".repeat(24)}`}
                </code>
                <Button variant="outline" size="sm" className="glass-chip border-white/10 shrink-0" onClick={() => setReveal(r => !r)}>
                  {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
                <CopyButton text={token.token} />
                <Button variant="outline" size="sm" className="glass-chip border-white/10 shrink-0" onClick={fetchToken} disabled={loading}>
                  <RefreshCcw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            ) : (
              <Button onClick={fetchToken} disabled={loading} className="bg-amber-600 hover:bg-amber-500 text-white">
                <KeyRound className={`mr-2 size-4 ${loading ? "animate-pulse" : ""}`} /> Reveal shield token
              </Button>
            )}
            {error && <p className="text-xs text-rose-400">{error}</p>}
          </CardContent>
        </Card>

        {/* Step 2 — connector */}
        <Card className="bg-black/20 border-white/10">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-blue-400" />
              <span className="font-semibold text-sm">2 · Choose your agent</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {CONNECTORS.map(c => (
                <button key={c.id} onClick={() => setConnector(c.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${connector === c.id ? "bg-blue-500/15 text-blue-300 border-blue-500/30" : "glass-chip border-white/10 text-muted-foreground hover:text-slate-200"}`}>
                  {c.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Leave on <span className="text-slate-300">Auto-detect</span> — the installer finds every supported agent on the machine and wires each one automatically (Claude, Cursor, Gemini, and Codex configure themselves; LangChain and VS Code print a one-line snippet). No config files to edit by hand.
            </p>
          </CardContent>
        </Card>

        {/* Step 3 — command */}
        <Card className="bg-black/20 border-white/10">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Download className="size-4 text-emerald-400" />
              <span className="font-semibold text-sm">3 · Run on the machine with your agent</span>
              {connector !== "auto" && <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/20">{CONNECTORS.find(c => c.id === connector)?.label}</Badge>}
            </div>
            <div className="flex items-start gap-2">
              <pre className="flex-1 font-mono text-xs bg-black/40 border border-white/5 rounded-lg p-3 text-slate-200 whitespace-pre-wrap break-all overflow-x-auto">{installCmd}</pre>
              <CopyButton text={installCmd} />
            </div>
            <p className="text-xs text-muted-foreground">
              One command — it clones, installs, and wires every detected agent. Fail-open by design: if the gateway is unreachable it never blocks your agent. Enforcement is opt-in by adding <code className="text-slate-300">--sync-mode</code>.
            </p>
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-slate-300">Prefer to inspect the source first?</summary>
              <div className="flex items-start gap-2 mt-2">
                <pre className="flex-1 font-mono text-xs bg-black/40 border border-white/5 rounded-lg p-3 text-slate-300 whitespace-pre-wrap break-all overflow-x-auto">{manualCmd}</pre>
                <CopyButton text={manualCmd} />
              </div>
            </details>
            <p className="text-xs text-muted-foreground pt-1">Remove any time:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-xs bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-slate-400 truncate">{uninstallCmd}</code>
              <CopyButton text={uninstallCmd} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
