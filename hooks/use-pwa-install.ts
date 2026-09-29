"use client"

import { useCallback, useEffect, useState } from "react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

type Platform = "android" | "ios" | "desktop" | "other"

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other"
  const ua = navigator.userAgent || ""
  if (/iPad|iPhone|iPod/.test(ua) && !("MSStream" in window)) return "ios"
  if (/Android/i.test(ua)) return "android"
  if (/Macintosh|Windows|Linux/i.test(ua)) return "desktop"
  return "other"
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true
  // iOS Safari
  return Boolean((window.navigator as unknown as { standalone?: boolean }).standalone)
}

export interface PwaInstallState {
  /** Whether the app is currently running as an installed PWA. */
  installed: boolean
  /** A native install prompt is available (Chrome/Edge/Android). */
  canPrompt: boolean
  /** No native prompt but we can still guide the user (iOS, manual). */
  showInstructions: boolean
  platform: Platform
  /** Triggers the native prompt or "true" when instructions should be shown. */
  install: () => Promise<"accepted" | "dismissed" | "instructions" | "unavailable">
}

export function usePwaInstall(): PwaInstallState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState<boolean>(false)
  const [platform, setPlatform] = useState<Platform>("other")

  useEffect(() => {
    setPlatform(detectPlatform())
    setInstalled(isStandalone())

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall)
    window.addEventListener("appinstalled", onInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (deferred) {
      try {
        await deferred.prompt()
        const choice = await deferred.userChoice
        setDeferred(null)
        return choice.outcome
      } catch {
        return "unavailable"
      }
    }
    // No native prompt: fall back to instructions (iOS, etc.).
    return "instructions" as const
  }, [deferred])

  const canPrompt = !installed && deferred !== null
  const showInstructions = !installed && !canPrompt && (
    platform === "android"
    || platform === "ios"
    || platform === "desktop"
    || platform === "other"
  )

  return { installed, canPrompt, showInstructions, platform, install }
}
