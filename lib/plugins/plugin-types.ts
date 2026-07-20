export type PluginCapability = "academic:read" | "storage:namespace" | "navigation:route"
export type PluginPermission = "read:subjects" | "read:grades" | "write:own-storage"
export interface PluginRoute { path: string; label: string; description?: string }
export interface PluginManifest { id: string; name: string; version: string; description: string; enabled: boolean; capabilities: PluginCapability[]; permissions: PluginPermission[]; routes: PluginRoute[] }
export interface PluginRegistry { list(): PluginManifest[]; get(id: string): PluginManifest | undefined }
