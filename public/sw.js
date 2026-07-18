// Service worker conservador para instalación PWA, shell básico offline y assets reales.

const CACHE_NAME = "horaly-shell-v2"
const SHELL_URLS = [
  "/",
  "/manifest.webmanifest",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
  "/icon-512.png",
  "/icon-512-maskable.png",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const results = await Promise.allSettled(SHELL_URLS.map((url) => cache.add(url)))
      const failures = results.filter((result) => result.status === "rejected")
      if (failures.length > 0) {
        console.warn("[Horaly] Algunos assets PWA no pudieron precargarse.", failures)
      }
    }),
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.method !== "GET") return

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch((error) => {
            console.warn("[Horaly] No se pudo actualizar la caché de navegación.", error)
          })
          return res
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("/"))),
    )
    return
  }

  event.respondWith(caches.match(req).then((cached) => cached || fetch(req)))
})
