export function getClientAuthOrigin() {
  if (typeof window !== "undefined" && window.location.origin) return window.location.origin
  return getServerSiteUrl()
}

export function getServerSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (explicit) return normalizeOrigin(explicit)
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
  if (vercel) return normalizeOrigin(vercel.startsWith("http") ? vercel : `https://${vercel}`)
  return "http://localhost:3000"
}

export function getMetadataBase() {
  return new URL(getServerSiteUrl())
}

function normalizeOrigin(value: string) {
  try { return new URL(value).origin } catch { return "http://localhost:3000" }
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
