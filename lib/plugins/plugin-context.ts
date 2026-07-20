import type { AppData } from "@/lib/types"
import type { PluginManifest } from "./plugin-types"

export interface PluginContext { manifest: PluginManifest; academic: Pick<AppData, "subjects" | "grades" | "settings">; storageNamespace: string; log(error: Error): void }

export function createPluginContext(manifest: PluginManifest, data: AppData): PluginContext {
  return { manifest, academic: { subjects: data.subjects, grades: data.grades, settings: data.settings }, storageNamespace: `plugin:${manifest.id}`, log: (error) => console.error(`[plugin:${manifest.id}]`, error.message) }
}
