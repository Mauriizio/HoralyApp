import type { ComponentType } from "react"

export type PluginCapability = "navigation:internal" | "clipboard:write" | "storage:namespace" | "events:anonymous" | "theme:read" | "locale:read"
export type PluginPermission = "navigate:internal" | "write:clipboard" | "write:own-storage" | "emit:anonymous-events" | "read:theme" | "read:locale"
export type PluginCategory = "Electricidad" | "Electrónica" | "Automatización" | "Matemáticas" | "Utilidades"
export type PluginStatus = "available" | "coming-soon"

export interface PluginRoute { path: string; label: string; description?: string }

export interface PluginManifest {
  id: string
  name: string
  version: string
  description: string
  enabled: boolean
  category: PluginCategory
  icon: string
  status: PluginStatus
  featureFlag?: string
  capabilities: PluginCapability[]
  permissions: PluginPermission[]
  routes: PluginRoute[]
}

export interface ToolPluginProps {
  locale: "es" | "en"
  theme: "light" | "dark" | "system"
  navigateInternal: (path: string) => void
  copyText: (text: string) => Promise<boolean>
  emitEvent: (name: string, metadata?: Record<string, string | number | boolean>) => void
  createNamespacedStorage: (namespace: string) => Pick<Storage, "getItem" | "setItem" | "removeItem">
  log: (error: Error) => void
}

export interface ToolPluginModule {
  manifest: PluginManifest
  load?: () => Promise<{ default: ComponentType<ToolPluginProps> }>
  isEnabled?: () => boolean
}

export interface PluginDiagnostic { pluginId: string; code: string; message: string }
export interface PluginRegistryValidation { ok: boolean; diagnostics: PluginDiagnostic[] }
export interface PluginRegistry extends PluginRegistryValidation {
  categories: PluginCategory[]
  list(): PluginManifest[]
  get(id: string): PluginManifest | undefined
  load(id: string): Promise<{ default: ComponentType<ToolPluginProps> }>
}
