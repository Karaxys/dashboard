// Backend base URL, read from env (Next inlines NEXT_PUBLIC_*) with a local dev fallback.
function normalizeBaseUrl(raw: string | undefined): string {
  const value = (raw || "").trim() || "http://localhost:8081"
  return value.replace(/\/+$/, "")
}

export const API_BASE_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL)
