const PUBLIC_PRODUCTION_ORIGIN = "https://horaly-app.vercel.app"

export function getClientAuthOrigin() {
  if (process.env.NODE_ENV === "development" && typeof window !== "undefined" && isLocalOrigin(window.location.origin)) {
    return window.location.origin
  }
  return getServerSiteUrl()
}

export function getServerSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (explicit) return normalizeOrigin(explicit)
  if (process.env.NODE_ENV === "development") return "http://localhost:3000"
  return PUBLIC_PRODUCTION_ORIGIN
}

export function getMetadataBase() {
  return new URL(getServerSiteUrl())
}

function normalizeOrigin(value: string) {
  try { return new URL(value).origin } catch { return PUBLIC_PRODUCTION_ORIGIN }
}

function isLocalOrigin(origin: string) {
  try {
    const hostname = new URL(origin).hostname
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
  } catch {
    return false
  }
}

export function getPublicAuthOrigin() {
  const explicitAuth = process.env.NEXT_PUBLIC_AUTH_SITE_URL?.trim()
  if (explicitAuth) return normalizeOrigin(explicitAuth)
  const explicitSite = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (explicitSite) return normalizeOrigin(explicitSite)
  if (process.env.NODE_ENV === "development" && typeof window !== "undefined" && isLocalOrigin(window.location.origin)) {
    return window.location.origin
  }
  return PUBLIC_PRODUCTION_ORIGIN
}

export function getPublicAuthCallbackUrl(search = "") {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
  if (params.has("next")) params.set("next", safeInternalRedirect(params.get("next"), "/"))
  const callback = new URL("/auth/callback", getPublicAuthOrigin())
  callback.search = params.toString()
  return callback.toString()
}

export function buildClientAuthRedirectUrl(path: string, origin = getClientAuthOrigin()) {
  const safePath = safeInternalRedirect(path, "/")
  return new URL(safePath, origin).toString()
}

export function buildAuthRedirectUrl(path: string, origin = getServerSiteUrl()) {
  const safePath = safeInternalRedirect(path, "/")
  return new URL(safePath, origin).toString()
}

export function safeInternalRedirect(value: string | null | undefined, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback
  try {
    const parsed = new URL(value, "http://internal.local")
    return parsed.origin === "http://internal.local" ? `${parsed.pathname}${parsed.search}${parsed.hash}` : fallback
  } catch { return fallback }
}
