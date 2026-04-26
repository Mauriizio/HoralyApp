// Minimal service worker so the app is installable as a PWA.
// We do not aggressively cache anything — the app is mostly client-rendered
// and uses localStorage for data, so a passive network-first fetch handler
// is enough to satisfy install criteria without breaking dev flows.

const CACHE_NAME = "horario-shell-v1"
const SHELL_URLS = ["/", "/manifest.webmanifest", "/icon-512.jpg", "/icon.svg"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS).catch(() => undefined)),
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k)),
      ),
    ),
  )
  self.clients.claim()
})

// Network-first for navigation, falling back to cached shell when offline.
self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.method !== "GET") return

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => undefined)
          return res
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match("/")),
        ),
    )
    return
  }

  // For other requests, try cache first then network — fully passive.
  event.respondWith(caches.match(req).then((cached) => cached || fetch(req)))
})
