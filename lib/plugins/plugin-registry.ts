import { permissionsAllowedByCapabilities } from "./plugin-capabilities"
import type { PluginCategory, PluginManifest, PluginRegistry } from "./plugin-types"

export const TOOL_CATEGORIES: PluginCategory[] = ["Electricidad", "Electrónica", "Automatización", "Matemáticas", "Utilidades"]

export const resistorColorCodePlugin: PluginManifest = {
  id: "resistor-color-code",
  name: "Código de colores de resistencias",
  version: "1.0.0",
  description: "Calcula resistencias de 4, 5 y 6 bandas en ambos sentidos sin datos personales.",
  enabled: true,
  category: "Electricidad",
  icon: "Ω",
  status: "available",
  featureFlag: "NEXT_PUBLIC_RESISTOR_COLOR_CODE_ENABLED",
  capabilities: ["navigation:route"],
  permissions: [],
  routes: [{ path: "herramientas/resistencias", label: "Resistencias", description: "Código de colores" }],
}

export const resistorCalculatorPlugin = resistorColorCodePlugin

export function createPluginRegistry(plugins: PluginManifest[] = [resistorColorCodePlugin]): PluginRegistry {
  const ids = new Set<string>()
  const safe = plugins.filter((plugin) => {
    if (ids.has(plugin.id)) return false
    ids.add(plugin.id)
    const flagEnabled = plugin.featureFlag ? process.env[plugin.featureFlag] !== "false" : true
    return plugin.enabled && flagEnabled && permissionsAllowedByCapabilities(plugin.capabilities, plugin.permissions)
  })
  return { list: () => [...safe], get: (id) => safe.find((plugin) => plugin.id === id) }
}
