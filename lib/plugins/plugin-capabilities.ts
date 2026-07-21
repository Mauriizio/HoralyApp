import type { PluginCapability, PluginPermission } from "./plugin-types"

const ALLOWED: Record<PluginCapability, PluginPermission[]> = {
  "navigation:internal": ["navigate:internal"],
  "clipboard:write": ["write:clipboard"],
  "storage:namespace": ["write:own-storage"],
  "events:anonymous": ["emit:anonymous-events"],
  "theme:read": ["read:theme"],
  "locale:read": ["read:locale"],
}

export function knownCapabilities() {
  return Object.keys(ALLOWED) as PluginCapability[]
}

export function permissionsAllowedByCapabilities(capabilities: PluginCapability[], permissions: PluginPermission[]): boolean {
  const allowed = new Set(capabilities.flatMap((capability) => ALLOWED[capability] ?? []))
  return permissions.every((permission) => allowed.has(permission))
}
