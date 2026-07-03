// Runtime configuration served as JavaScript.
//
// This route is rendered on every request (never cached), so it reflects the
// container's environment at run time — no rebuild needed to point the dashboard
// at a different backend. The browser loads it via <script src="/config.js"> in
// the root layout, which sets window.__KARAXYS_CONFIG__ before the app hydrates.
//
// Operators set KARAXYS_API_BASE_URL (preferred) on the container. The build-time
// NEXT_PUBLIC_API_BASE_URL is honoured as a fallback for local development.

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export function GET(): Response {
  const apiBaseUrl = (
    process.env.KARAXYS_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    ""
  )
    .trim()
    .replace(/\/+$/, "")

  const body = `window.__KARAXYS_CONFIG__ = ${JSON.stringify({ apiBaseUrl })};`

  return new Response(body, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-store, max-age=0",
    },
  })
}
