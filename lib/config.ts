// Backend base URL resolution.
//
// The dashboard is distributed as a prebuilt image, so the API URL cannot be
// baked in at `next build` time — each operator runs it on a different host.
// Instead it is resolved at RUNTIME, in this priority order:
//
//   1. window.__KARAXYS_CONFIG__.apiBaseUrl   ← injected by /config.js (see
//      app/config.js/route.ts), which reads the container's env at request time.
//   2. NEXT_PUBLIC_API_BASE_URL               ← build-time fallback for local dev.
//   3. http://localhost:8081                  ← last-resort default.
//
// Always call getApiBaseUrl() (not a captured constant) so the value is read
// after /config.js has run, regardless of module evaluation order.

declare global {
  interface Window {
    __KARAXYS_CONFIG__?: { apiBaseUrl?: string }
  }
}

function normalizeBaseUrl(raw: string | undefined | null): string {
  const value = (raw || "").trim()
  return value.replace(/\/+$/, "")
}

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const runtime = normalizeBaseUrl(window.__KARAXYS_CONFIG__?.apiBaseUrl)
    if (runtime) return runtime
  }
  return normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL) || "http://localhost:8081"
}

// Backwards-compatible eager export. Prefer getApiBaseUrl() at call sites so the
// runtime value is always current.
export const API_BASE_URL = getApiBaseUrl()
