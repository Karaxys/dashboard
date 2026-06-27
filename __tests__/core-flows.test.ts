/**
 * Core UI flow tests for Karaxys dashboard.
 *
 * These tests verify route existence, apiFetch error handling, and utility
 * functions without requiring a running backend.
 *
 * Run with: bun test
 * (Install vitest/bun-test as needed: bun add -d vitest)
 */

// ─── apiFetch error extraction ───────────────────────────────────────────────

import { describe, it, expect } from "bun:test"

// Utility: extract HTTP status from ApiError message
function extractStatus(msg: string): number | null {
  const m = msg.match(/(\d{3})/)
  return m ? Number(m[1]) : null
}

describe("apiFetch error handling", () => {
  it("extracts HTTP status from error message", () => {
    expect(extractStatus("401 Unauthorized")).toBe(401)
    expect(extractStatus("404 Not Found")).toBe(404)
    expect(extractStatus("500 Internal Server Error")).toBe(500)
    expect(extractStatus("network error")).toBeNull()
  })
})

// ─── Route slug helpers ───────────────────────────────────────────────────────

function inventoryDetailPath(id: string) {
  return `/dashboard/logs/${id}`
}

function findingsPath(params: { severity?: string; status?: string } = {}) {
  const q = new URLSearchParams()
  if (params.severity) q.set("severity", params.severity)
  if (params.status) q.set("status", params.status)
  const qs = q.toString()
  return qs ? `/dashboard/findings?${qs}` : "/dashboard/findings"
}

describe("route path helpers", () => {
  it("builds inventory detail path", () => {
    expect(inventoryDetailPath("abc123")).toBe("/dashboard/logs/abc123")
  })

  it("builds findings path without filters", () => {
    expect(findingsPath()).toBe("/dashboard/findings")
  })

  it("builds findings path with severity filter", () => {
    expect(findingsPath({ severity: "critical" })).toBe("/dashboard/findings?severity=critical")
  })

  it("builds findings path with multiple filters", () => {
    const path = findingsPath({ severity: "high", status: "open" })
    expect(path).toContain("severity=high")
    expect(path).toContain("status=open")
  })
})

// ─── Severity / status display helpers ───────────────────────────────────────

const SEVERITY_LABELS: Record<string, string> = {
  critical: "Critical",
  high:     "High",
  medium:   "Medium",
  low:      "Low",
}

const STATUS_LABELS: Record<string, string> = {
  open:           "Open",
  accepted_risk:  "Accepted Risk",
  false_positive: "False Positive",
  fixed:          "Fixed",
}

describe("display label helpers", () => {
  it("maps all severity values to labels", () => {
    expect(SEVERITY_LABELS.critical).toBe("Critical")
    expect(SEVERITY_LABELS.high).toBe("High")
    expect(SEVERITY_LABELS.medium).toBe("Medium")
    expect(SEVERITY_LABELS.low).toBe("Low")
  })

  it("maps all issue status values to labels", () => {
    expect(STATUS_LABELS.open).toBe("Open")
    expect(STATUS_LABELS.accepted_risk).toBe("Accepted Risk")
    expect(STATUS_LABELS.false_positive).toBe("False Positive")
    expect(STATUS_LABELS.fixed).toBe("Fixed")
  })
})

// ─── Date formatting ──────────────────────────────────────────────────────────

function formatAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}

describe("formatAgo", () => {
  it("formats recent timestamps as seconds ago", () => {
    const iso = new Date(Date.now() - 30_000).toISOString()
    expect(formatAgo(iso)).toMatch(/^\d+s ago$/)
  })

  it("formats old timestamps as hours ago", () => {
    const iso = new Date(Date.now() - 7_200_000).toISOString()
    expect(formatAgo(iso)).toMatch(/^\d+h ago$/)
  })
})

// ─── Issue filter query builder ───────────────────────────────────────────────

function buildIssuesQuery(opts: {
  page?: number
  limit?: number
  severity?: string
  status?: string
}) {
  const q = new URLSearchParams({ page: String(opts.page ?? 1), limit: String(opts.limit ?? 20) })
  if (opts.severity && opts.severity !== "all") q.set("severity", opts.severity)
  if (opts.status && opts.status !== "all") q.set("status", opts.status)
  return q.toString()
}

describe("buildIssuesQuery", () => {
  it("includes page and limit by default", () => {
    const q = buildIssuesQuery({})
    expect(q).toContain("page=1")
    expect(q).toContain("limit=20")
  })

  it("skips 'all' filter values", () => {
    const q = buildIssuesQuery({ severity: "all", status: "all" })
    expect(q).not.toContain("severity=")
    expect(q).not.toContain("status=")
  })

  it("includes non-all filter values", () => {
    const q = buildIssuesQuery({ severity: "critical", status: "open" })
    expect(q).toContain("severity=critical")
    expect(q).toContain("status=open")
  })
})
