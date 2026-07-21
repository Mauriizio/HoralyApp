import type { PluginManifest } from "@/lib/plugins/plugin-types"

export const manifest: PluginManifest = {
  id: "resistor-color-code",
  name: "Código de colores de resistencias",
  version: "1.0.0",
  description: "Calcula resistencias de 4, 5 y 6 bandas en ambos sentidos sin datos personales.",
  enabled: true,
  category: "Electricidad",
  icon: "Ω",
  status: "available",
  featureFlag: "NEXT_PUBLIC_RESISTOR_COLOR_CODE_ENABLED",
  capabilities: ["navigation:internal", "clipboard:write", "locale:read", "theme:read"],
  permissions: ["navigate:internal", "write:clipboard", "read:locale", "read:theme"],
  routes: [{ path: "herramientas/resistencias", label: "Resistencias", description: "Código de colores" }],
}
