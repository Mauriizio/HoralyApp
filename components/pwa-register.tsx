"use client"

import { useEffect } from "react"

/**
 * Registers the service worker once the page is interactive. We only register
 * in production builds — during local development the dev server's HMR pipeline
 * does not play well with active service workers.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return
    if (process.env.NODE_ENV !== "production") return

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {
          // Silently ignore — the app still works without it.
        })
    }

    if (document.readyState === "complete") onLoad()
    else window.addEventListener("load", onLoad, { once: true })

    return () => window.removeEventListener("load", onLoad)
  }, [])

  return null
}
