// Service worker conservador: shell offline sin interceptar datos privados.

const CACHE_NAME = "horaly-shell-v4"
const SHELL_URLS = [
  "/",
  "/manifest.webmanifest",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
  "/icon-512.png",
  "/icon-512-maskable.png",
]

function isSameOrigin(url) {
  return url.origin === self.location.origin
}

function isSupabaseRequest(url) {
  return url.hostname.endsWith(".supabase.co")
    || ["/auth/v1/", "/rest/v1/", "/realtime/v1/", "/storage/v1/"].some((path) => url.pathname.includes(path))
}

function isAvatarRequest(url) {
  return url.pathname.includes("/storage/v1/object/")
    || url.pathname.includes("/avatars/")
}

function isVercelFeedback(url) {
  return url.hostname === "vercel.live"
    || url.hostname.endsWith(".vercel.live")
    || url.pathname.startsWith("/_vercel/insights")
    || url.pathname.startsWith("/_vercel/speed-insights")
}

function isNextStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/")
}

function canHandle(request) {
  let url
  try {
    url = new URL(request.url)
  } catch {
    return false
  }
  if (request.method !== "GET") return false
  if (url.protocol !== "http:" && url.protocol !== "https:") return false
  if (!isSameOrigin(url)) return false
  if (isSupabaseRequest(url) || isAvatarRequest(url) || isVercelFeedback(url)) return false
  if (url.pathname.startsWith("/auth/callback") || url.pathname.startsWith("/auth/update-password")) return false
  if (url.pathname.startsWith("/_next/") && url.pathname.includes("webpack-hmr")) return false
  return true
}

function isPublicCacheable(response) {
  if (!response || !response.ok || response.type === "opaque") return false
  const cacheControl = response.headers.get("cache-control")?.toLowerCase() ?? ""
  return !cacheControl.includes("private")
    && !cacheControl.includes("no-store")
    && !response.headers.has("set-cookie")
}

async function safeFetch(request, fallback) {
  try {
    return await fetch(request)
  } catch {
    return (await fallback()) || Response.error()
  }
}

async function networkFirstAndCache(request) {
  const response = await safeFetch(request, () => caches.match(request))
  if (isPublicCacheable(response)) {
    try {
      const cache = await caches.open(CACHE_NAME)
      await cache.put(request, response.clone())
    } catch {
      // El asset de red sigue siendo utilizable aunque falle Cache Storage.
    }
  }
  return response
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const results = await Promise.allSettled(SHELL_URLS.map((url) => cache.add(url)))
      const failures = results.filter((result) => result.status === "rejected")
      if (failures.length > 0) console.warn("[Horaly] Algunos assets PWA no pudieron precargarse.")
    }),
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith("horaly-") && key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const request = event.request
  if (!canHandle(request)) return

  if (request.mode === "navigate") {
    event.respondWith(safeFetch(request, async () => (await caches.match(request)) || caches.match("/")).then(async (response) => {
      if (isPublicCacheable(response)) {
        try {
          const cache = await caches.open(CACHE_NAME)
          await cache.put(request, response.clone())
        } catch {
          // La navegación funciona aunque Cache Storage no esté disponible.
        }
      }
      return response
    }).catch(() => Response.error()))
    return
  }

  const url = new URL(request.url)
  if (isNextStaticAsset(url)) {
    event.respondWith(networkFirstAndCache(request))
    return
  }

  event.respondWith(
    caches.match(request)
      .then((cached) => cached || safeFetch(request, async () => undefined))
      .then(async (response) => {
        if (!response) return Response.error()
        if (isPublicCacheable(response)) {
          try {
            const cache = await caches.open(CACHE_NAME)
            await cache.put(request, response.clone())
          } catch {
            // No convertir un fallo de caché en un rechazo de fetch.
          }
        }
        return response
      })
      .catch(() => Response.error()),
  )
})
