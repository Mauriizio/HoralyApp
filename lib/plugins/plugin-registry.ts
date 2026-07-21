import { knownCapabilities, permissionsAllowedByCapabilities } from "./plugin-capabilities"
import type { PluginCategory, PluginDiagnostic, PluginManifest, PluginRegistry, PluginStatus, ToolPluginModule } from "./plugin-types"

export const TOOL_CATEGORIES: PluginCategory[] = ["Electricidad", "Electrónica", "Automatización", "Matemáticas", "Utilidades"]
const STATUSES: PluginStatus[] = ["available", "coming-soon"]
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:[-+][0-9A-Za-z.-]+)?$/
const FEATURE_FLAG_RE = /^NEXT_PUBLIC_[A-Z0-9_]+_ENABLED$/

export function createPluginRegistry(modules: ToolPluginModule[] = []): PluginRegistry {
  const ids = new Set<string>()
  const routes = new Set<string>()
  const diagnostics: PluginDiagnostic[] = []
  const safeModules: ToolPluginModule[] = []

  for (const module of modules) {
    const manifest = module.manifest
    const pluginId = manifest?.id ?? "unknown"
    const before = diagnostics.length

    if (!SLUG_RE.test(pluginId)) push(diagnostics, pluginId, "invalid-id", "ID de herramienta inválido.")
    if (ids.has(pluginId)) push(diagnostics, pluginId, "duplicate-id", "ID de herramienta duplicado.")
    ids.add(pluginId)
    if (!SEMVER_RE.test(manifest.version)) push(diagnostics, pluginId, "invalid-version", "Versión SemVer inválida.")
    if (!TOOL_CATEGORIES.includes(manifest.category)) push(diagnostics, pluginId, "invalid-category", "Categoría desconocida.")
    if (!STATUSES.includes(manifest.status)) push(diagnostics, pluginId, "invalid-status", "Estado desconocido.")
    if (manifest.status === "available" && typeof module.load !== "function") push(diagnostics, pluginId, "missing-loader", "Loader requerido para herramienta disponible.")
    if (manifest.featureFlag && !FEATURE_FLAG_RE.test(manifest.featureFlag)) push(diagnostics, pluginId, "invalid-feature-flag", "Feature flag pública inválida.")
    if (manifest.featureFlag && typeof module.isEnabled !== "function") push(diagnostics, pluginId, "missing-feature-flag-resolver", "Resolver estático de feature flag requerido.")
    for (const capability of manifest.capabilities) {
      if (!knownCapabilities().includes(capability)) push(diagnostics, pluginId, "unknown-capability", "Capacidad desconocida.")
    }
    if (!permissionsAllowedByCapabilities(manifest.capabilities, manifest.permissions)) push(diagnostics, pluginId, "incompatible-permission", "Permisos incompatibles con capacidades declaradas.")
    for (const route of manifest.routes) {
      if (!route.path || route.path.startsWith("/") || route.path.includes("..")) push(diagnostics, pluginId, "invalid-route", "Ruta interna inválida.")
      if (routes.has(route.path)) push(diagnostics, pluginId, "duplicate-route", "Ruta de herramienta duplicada.")
      routes.add(route.path)
    }

    const flagEnabled = module.isEnabled ? module.isEnabled() : true
    if (diagnostics.length === before && manifest.enabled && flagEnabled) safeModules.push(module)
  }

  const safe = new Map(safeModules.map((module) => [module.manifest.id, module]))
  return {
    ok: diagnostics.length === 0,
    diagnostics,
    categories: [...TOOL_CATEGORIES],
    list: () => [...safe.values()].map((module) => module.manifest),
    get: (id) => safe.get(id)?.manifest,
    load: async (id) => {
      const module = safe.get(id)
      if (!module?.load) throw new Error("No se pudo cargar la herramienta.")
      try {
        return await module.load()
      } catch {
        throw new Error("No se pudo cargar la herramienta.")
      }
    },
  }
}

function push(diagnostics: PluginDiagnostic[], pluginId: string, code: string, message: string) {
  diagnostics.push({ pluginId, code, message })
}
