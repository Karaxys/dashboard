import { getApiBaseUrl } from "./config"

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

// Access token lives in memory only (never localStorage) to limit XSS exposure.
let accessToken: string | null = null
// Set by the auth layer so a 401 can trigger one silent refresh + retry.
let refreshHandler: (() => Promise<string | null>) | null = null
let refreshing: Promise<string | null> | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

export function setRefreshHandler(handler: (() => Promise<string | null>) | null) {
  refreshHandler = handler
}

function buildUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path
  return `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`
}

async function readError(res: Response): Promise<string> {
  const text = (await res.text().catch(() => "")).trim()
  if (!text) return res.statusText || `Request failed (${res.status})`
  try {
    const parsed = JSON.parse(text)
    return parsed.error || parsed.message || text
  } catch {
    return text
  }
}

async function runRefresh(): Promise<string | null> {
  if (!refreshHandler) return null
  // Coalesce concurrent 401s into a single refresh call.
  if (!refreshing) {
    refreshing = refreshHandler().finally(() => {
      refreshing = null
    })
  }
  return refreshing
}

interface RawOptions extends RequestInit {
  retryOn401?: boolean
}

async function rawFetch(path: string, options: RawOptions = {}): Promise<Response> {
  const { retryOn401 = true, headers, ...rest } = options
  const finalHeaders = new Headers(headers)
  if (accessToken) finalHeaders.set("Authorization", `Bearer ${accessToken}`)

  const res = await fetch(buildUrl(path), {
    ...rest,
    headers: finalHeaders,
    credentials: "include",
  })

  if (res.status === 401 && retryOn401 && refreshHandler) {
    const next = await runRefresh()
    if (next) return rawFetch(path, { ...options, retryOn401: false })
  }
  return res
}

// JSON-typed request helper used by all backend calls.
export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  const res = await rawFetch(path, { ...options, headers })
  if (!res.ok) throw new ApiError(res.status, await readError(res))
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}
