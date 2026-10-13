"use client"

import React, { useCallback, useEffect, useState } from "react"
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Check, Copy, ExternalLink, RefreshCcw, Server, Zap,
} from "lucide-react"
import { apiFetch } from "@/lib/api"
import { useQuickStart } from "./quick-start-context"

// ── Types ────────────────────────────────────────────────────────────────────

interface IngestTokenInfo {
  id: string
  token_prefix: string
  token: string
  ingest_url: string
  created_at: string
  rotated_at?: string
  last_used_at?: string
}

type ConnectorID = "ebpf_docker" | "ebpf_kubernetes" | "burp" | "postman" | "har"

interface Connector {
  id: ConnectorID
  label: string
  description: string
  badge: string
  badgeCls: string
}

// ── Connector catalogue ───────────────────────────────────────────────────────

const CONNECTORS: Connector[] = [
  {
    id: "ebpf_docker",
    label: "eBPF — Linux",
    description: "Zero-code passive capture on any Linux host. Requires Docker and root access.",
    badge: "Recommended",
    badgeCls: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  },
  {
    id: "ebpf_kubernetes",
    label: "eBPF — Kubernetes",
    description: "Node-level daemonset, no sidecar required.",
    badge: "K8s",
    badgeCls: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  },
  {
    id: "burp",
    label: "Burp Suite",
    description: "Route Burp traffic to Karaxys via the upstream proxy extension.",
    badge: "Proxy",
    badgeCls: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  },
  {
    id: "postman",
    label: "Postman",
    description: "Replay a Postman collection and stream requests to Karaxys.",
    badge: "API Client",
    badgeCls: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  {
    id: "har",
    label: "HAR File",
    description: "Import browser-captured HTTP traffic from a .har export.",
    badge: "Upload",
    badgeCls: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  },
]

// ── Install command templates ─────────────────────────────────────────────────

function buildCommand(id: ConnectorID, ingestURL: string, token: string): string {
  switch (id) {
    case "ebpf_docker":
      return [
        "# Run on any Linux host (x86-64 or arm64). Requires Docker + root.",
        "# Captures all HTTP traffic on the host and streams it to your backend.",
        "",
        "docker run --rm \\",
        "  --privileged \\",
        "  --network host \\",
        "  --pid host \\",
        "  -v /sys/fs/bpf:/sys/fs/bpf \\",
        "  -v /sys/kernel/debug:/sys/kernel/debug:ro \\",
        "  -v /sys/kernel/tracing:/sys/kernel/tracing:ro \\",
        `  -e KARAXYS_INGEST_URL="${ingestURL}" \\`,
        `  -e KARAXYS_ACCOUNT_TOKEN="${token}" \\`,
        "  ghcr.io/karaxys/capture:latest",
      ].join("\n")

    case "ebpf_kubernetes":
      return [
        "helm upgrade --install karaxys-agent karaxys/ebpf-agent \\",
        "  --namespace karaxys --create-namespace \\",
        `  --set config.ingestURL="${ingestURL}" \\`,
        `  --set config.accountToken="${token}"`,
      ].join("\n")

    case "burp":
      return [
        "# 1. Install the Karaxys Burp extension from the BApp Store.",
        "# 2. In Burp → Karaxys → Settings, set:",
        `#      Ingest URL:   ${ingestURL}`,
        `#      Account Token: ${token}`,
        "# 3. Enable 'Forward traffic' — captured requests appear in Inventory.",
      ].join("\n")

    case "postman":
      return [
        "# Run a Postman collection via Newman with the Karaxys reporter:",
        "npm install -g newman newman-reporter-karaxys",
        "newman run your-collection.json \\",
        `  --reporter-karaxys-ingestUrl "${ingestURL}" \\`,
        `  --reporter-karaxys-accountToken "${token}"`,
      ].join("\n")

    case "har":
      return [
        "# Upload a HAR file captured from your browser dev tools:",
        "curl -X POST \\",
        `  "${ingestURL}" \\`,
        `  -H "Authorization: Bearer ${token}" \\`,
        '  -H "Content-Type: application/json" \\',
        "  --data @your-traffic.har",
      ].join("\n")
  }
}

// ── Sheet component ───────────────────────────────────────────────────────────

export function QuickStartSheet() {
  const { isOpen, close } = useQuickStart()

  const [tokenInfo, setTokenInfo]   = useState<IngestTokenInfo | null>(null)
  const [loading, setLoading]       = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [rotating, setRotating]     = useState(false)

  const [selected, setSelected] = useState<ConnectorID>("ebpf_docker")
  const [copied, setCopied]     = useState(false)

  const fetchToken = useCallback(async () => {
    setLoading(true)
    setTokenError(null)
    try {
      const data = await apiFetch<IngestTokenInfo>("/account/ingest-token")
      setTokenInfo(data)
    } catch {
      setTokenError("Failed to load ingest token. Check your permissions.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen && !tokenInfo && !loading) {
      fetchToken()
    }
  }, [isOpen, tokenInfo, loading, fetchToken])

  const rotateToken = async () => {
    setRotating(true)
    try {
      const data = await apiFetch<IngestTokenInfo>("/account/ingest-token/rotate", {
        method: "POST",
      })
      setTokenInfo(data)
    } catch {
      setTokenError("Failed to rotate token.")
    } finally {
      setRotating(false)
    }
  }

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text)
    }
    // Fallback for non-HTTPS contexts (e.g. accessing via LAN IP)
    const ta = document.createElement("textarea")
    ta.value = text
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none"
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    document.execCommand("copy")
    document.body.removeChild(ta)
    return Promise.resolve()
  }

  const copyCommand = () => {
    if (!tokenInfo) return
    const cmd = buildCommand(selected, tokenInfo.ingest_url, tokenInfo.token)
    copyToClipboard(cmd)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const command = tokenInfo
    ? buildCommand(selected, tokenInfo.ingest_url, tokenInfo.token)
    : ""

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl flex flex-col gap-0 p-0 bg-slate-950 border-white/10"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-white/8">
          <div className="flex items-center gap-2">
            <div className="size-8 flex items-center justify-center rounded-lg bg-purple-500/15 border border-purple-500/25">
              <Zap className="size-4 text-purple-400" />
            </div>
            <SheetTitle className="text-slate-100">Quick Start</SheetTitle>
          </div>
          <SheetDescription className="text-slate-400 text-sm">
            Pick a connector, copy the install command, and run it. APIs appear in
            Inventory once traffic is received.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Connector selector */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Connector Type
            </p>
            <div className="space-y-2">
              {CONNECTORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={[
                    "w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-colors",
                    selected === c.id
                      ? "border-purple-500/50 bg-purple-500/10"
                      : "border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5",
                  ].join(" ")}
                >
                  <Server className={[
                    "size-4 mt-0.5 shrink-0",
                    selected === c.id ? "text-purple-400" : "text-slate-500",
                  ].join(" ")} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-200">{c.label}</span>
                      <Badge variant="outline" className={`text-xs px-1.5 py-0 ${c.badgeCls}`}>
                        {c.badge}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{c.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Install command */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Install Command
              </p>
              {tokenInfo && (
                <button
                  onClick={rotateToken}
                  disabled={rotating}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
                >
                  <RefreshCcw className={`size-3 ${rotating ? "animate-spin" : ""}`} />
                  Rotate token
                </button>
              )}
            </div>

            {loading && (
              <Skeleton className="h-32 w-full rounded-xl bg-white/5" />
            )}

            {tokenError && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-400">
                {tokenError}
              </div>
            )}

            {!loading && !tokenError && tokenInfo && (
              <div className="relative">
                <pre className="p-4 rounded-xl bg-black/50 border border-white/8 font-mono text-xs text-emerald-300 overflow-x-auto whitespace-pre leading-relaxed">
                  {command}
                </pre>
                <button
                  onClick={copyCommand}
                  className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/8 border border-white/10 text-xs text-slate-300 hover:bg-white/15 transition-colors"
                >
                  {copied
                    ? <><Check className="size-3 text-emerald-400" />Copied</>
                    : <><Copy className="size-3" />Copy</>
                  }
                </button>
              </div>
            )}
          </div>

          {/* Token info strip */}
          {tokenInfo && (
            <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Account Token
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-xs text-slate-300 truncate">
                  {tokenInfo.token}
                </code>
                <button
                  onClick={() => {
                    copyToClipboard(tokenInfo.token)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                  className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <Copy className="size-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-600">
                Token prefix: <span className="text-slate-400 font-mono">{tokenInfo.token_prefix}…</span>
                {tokenInfo.last_used_at && (
                  <> · Last used: {new Date(tokenInfo.last_used_at).toLocaleDateString()}</>
                )}
              </p>
            </div>
          )}

          {/* Docs link */}
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ExternalLink className="size-3" />
            View full integration docs
          </a>
        </div>
      </SheetContent>
    </Sheet>
  )
}
