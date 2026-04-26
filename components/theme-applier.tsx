"use client"

import { useEffect } from "react"
import type { AppSettings } from "@/lib/types"

// Converts a #rrggbb to an OKLCH-ish CSS color. We keep it simple and just set
// the raw hex on a CSS variable; shadcn tokens use oklch but the browser will
// happily accept any valid color on custom props used as colors.
function hexToRGB(hex: string) {
  const h = hex.replace("#", "")
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return { r, g, b }
}

function luminance({ r, g, b }: { r: number; g: number; b: number }) {
  const a = [r, g, b].map((v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]
}

export function ThemeApplier({ settings }: { settings: AppSettings }) {
  useEffect(() => {
    const root = document.documentElement

    // Theme mode (light/dark/system)
    const applyMode = () => {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      const isDark = settings.theme === "dark" || (settings.theme === "system" && prefersDark)
      root.classList.toggle("dark", isDark)
    }
    applyMode()
    const mql = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => settings.theme === "system" && applyMode()
    mql.addEventListener("change", onChange)

    // Accent color: override --primary and --ring.
    const rgb = hexToRGB(settings.accentColor)
    const hex = settings.accentColor
    const onDark = luminance(rgb) < 0.4
    root.style.setProperty("--primary", hex)
    root.style.setProperty("--ring", hex)
    root.style.setProperty("--sidebar-primary", hex)
    root.style.setProperty("--sidebar-ring", hex)
    root.style.setProperty("--primary-foreground", onDark ? "#ffffff" : "#0b1020")

    // Radius
    root.style.setProperty("--radius", `${settings.radius}rem`)

    // Block opacity
    root.style.setProperty("--block-opacity", String(settings.blockOpacity))

    // Font family
    root.dataset.font = settings.fontFamily
    root.style.setProperty("--font-scale", String(settings.fontScale))

    return () => mql.removeEventListener("change", onChange)
  }, [settings])

  return null
}
