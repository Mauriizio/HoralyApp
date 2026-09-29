import type { AppData } from "@/lib/types"
import { validateImportedData } from "@/lib/storage"

export const MIGRATION_BACKUP_KEY = "horario-escolar:migration-backup:v1"
export const cloudCacheKey = (userId: string) => `horario-escolar:cloud-cache:${userId}`
export const migrationBackupKey = (userId: string) => `${MIGRATION_BACKUP_KEY}:${userId}`
export const migrationDecisionKey = (userId: string) => `horario-escolar:migration-decision:v1:${userId}`

export type MigrationDecision = "completed" | "deferred"

export type MigrationBackup = {
  createdAt: string
  version: 1
  userId: string
  data: AppData
}

function safeParseAppData(raw: string | null): AppData | null {
  if (!raw) return null
  try {
    const parsed = validateImportedData(JSON.parse(raw))
    return parsed.ok && parsed.data ? parsed.data : null
  } catch {
    return null
  }
}

function parseMigrationBackup(raw: string | null, userId: string): MigrationBackup | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<MigrationBackup>
    if (parsed.version !== 1 || parsed.userId !== userId || !parsed.data) return null
    const valid = validateImportedData(parsed.data)
    if (!valid.ok || !valid.data) return null
    return { createdAt: String(parsed.createdAt), version: 1, userId, data: valid.data }
  } catch {
    return null
  }
}

export function saveCloudCache(userId: string, data: AppData) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(cloudCacheKey(userId), JSON.stringify(data))
}

export function loadCloudCache(userId: string): AppData | null {
  if (typeof window === "undefined") return null
  return safeParseAppData(window.localStorage.getItem(cloudCacheKey(userId)))
}

export function saveMigrationBackup(userId: string, data: AppData): MigrationBackup | null {
  if (typeof window === "undefined") return null
  const cloned = typeof structuredClone === "function"
    ? structuredClone(data)
    : JSON.parse(JSON.stringify(data)) as AppData
  const backup: MigrationBackup = { createdAt: new Date().toISOString(), version: 1, userId, data: cloned }
  window.localStorage.setItem(migrationBackupKey(userId), JSON.stringify(backup))
  return backup
}

export function loadMigrationBackup(userId: string): MigrationBackup | null {
  if (typeof window === "undefined") return null

  const scoped = parseMigrationBackup(window.localStorage.getItem(migrationBackupKey(userId)), userId)
  if (scoped) return scoped

  // Compatibilidad con el respaldo global antiguo. Si pertenece a este usuario,
  // lo migramos inmediatamente a una clave aislada para evitar colisiones A/B.
  const legacy = parseMigrationBackup(window.localStorage.getItem(MIGRATION_BACKUP_KEY), userId)
  if (!legacy) return null
  window.localStorage.setItem(migrationBackupKey(userId), JSON.stringify(legacy))
  return legacy
}

export function saveMigrationDecision(userId: string, decision: MigrationDecision) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(migrationDecisionKey(userId), decision)
}

export function loadMigrationDecision(userId: string): MigrationDecision | null {
  if (typeof window === "undefined") return null
  const value = window.localStorage.getItem(migrationDecisionKey(userId))
  return value === "completed" || value === "deferred" ? value : null
}

export function clearMigrationDecision(userId: string) {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(migrationDecisionKey(userId))
}
