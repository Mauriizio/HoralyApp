import { permissionsAllowedByCapabilities } from "./plugin-capabilities"
import type { PluginManifest, PluginRegistry } from "./plugin-types"

export const resistorCalculatorPlugin: PluginManifest = {
  id: "resistor-calculator",
  name: "Calculadora de resistencias — próximamente",
  version: "0.1.0",
  description: "Herramienta interna registrada para validar contrato, permisos mínimos y navegación.",
  enabled: true,
  capabilities: ["navigation:route"],
  permissions: [],
  routes: [{ path: "herramientas/resistencias", label: "Resistencias", description: "Próximamente" }],
}

export function createPluginRegistry(plugins: PluginManifest[] = [resistorCalculatorPlugin]): PluginRegistry {
  const ids = new Set<string>()
  const safe = plugins.filter((plugin) => {
    if (ids.has(plugin.id)) return false
    ids.add(plugin.id)
    return plugin.enabled && permissionsAllowedByCapabilities(plugin.capabilities, plugin.permissions)
  })
  return { list: () => [...safe], get: (id) => safe.find((plugin) => plugin.id === id) }
}
