import type { PluginManifest } from "@/lib/plugins/plugin-types"

export const manifest: PluginManifest = {
  id: "scientific-calculator",
  name: "Calculadora científica",
  version: "1.0.0",
  description: "Evalúa expresiones matemáticas con funciones científicas sin ejecutar JavaScript.",
  enabled: true,
  category: "Matemáticas",
  icon: "Calculator",
  status: "available",
  capabilities: ["storage:namespace"],
  permissions: ["write:own-storage"],
  routes: [{ path: "herramientas/calculadora-cientifica", label: "Calculadora", description: "Teclado científico y resultado" }],
}
