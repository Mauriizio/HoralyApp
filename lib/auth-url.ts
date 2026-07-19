export function getPublicSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (explicit) return normalizeOrigin(explicit)
  if (typeof window !== "undefined" && window.location.origin) return window.location.origin
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
  if (vercel) return normalizeOrigin(vercel.startsWith("http") ? vercel : `https://${vercel}`)
  return "http://localhost:3000"
}

function normalizeOrigin(value: string) {
  try { return new URL(value).origin } catch { return "http://localhost:3000" }
}

export function buildAuthRedirectUrl(path: string, origin = getPublicSiteUrl()) {
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
