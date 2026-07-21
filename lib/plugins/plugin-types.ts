import type { ComponentType } from "react"

export type PluginCapability = "academic:read" | "storage:namespace" | "navigation:route"
export type PluginPermission = "read:subjects" | "read:grades" | "write:own-storage"
export type PluginCategory = "Electricidad" | "Electrónica" | "Automatización" | "Matemáticas" | "Utilidades"
export type PluginStatus = "available" | "coming-soon"
export interface PluginRoute { path: string; label: string; description?: string }
export interface PluginManifest { id: string; name: string; version: string; description: string; enabled: boolean; category: PluginCategory; icon: string; status: PluginStatus; featureFlag?: string; capabilities: PluginCapability[]; permissions: PluginPermission[]; routes: PluginRoute[]; Component?: ComponentType }
export interface PluginRegistry { list(): PluginManifest[]; get(id: string): PluginManifest | undefined }
