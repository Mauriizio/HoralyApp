import type { PluginCapability, PluginPermission } from "./plugin-types"

const ALLOWED: Record<PluginCapability, PluginPermission[]> = {
  "academic:read": ["read:subjects", "read:grades"],
  "storage:namespace": ["write:own-storage"],
  "navigation:route": [],
}

export function permissionsAllowedByCapabilities(capabilities: PluginCapability[], permissions: PluginPermission[]): boolean {
  const allowed = new Set(capabilities.flatMap((capability) => ALLOWED[capability]))
  return permissions.every((permission) => allowed.has(permission))
}
