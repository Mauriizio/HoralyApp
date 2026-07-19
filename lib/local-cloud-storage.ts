import type { AppData } from "@/lib/types"
import { validateImportedData } from "@/lib/storage"

export const MIGRATION_BACKUP_KEY = "horario-escolar:migration-backup:v1"
export const cloudCacheKey = (userId: string) => `horario-escolar:cloud-cache:${userId}`

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
  const backup: MigrationBackup = { createdAt: new Date().toISOString(), version: 1, userId, data: structuredClone(data) }
  window.localStorage.setItem(MIGRATION_BACKUP_KEY, JSON.stringify(backup))
  return backup
}

export function loadMigrationBackup(userId: string): MigrationBackup | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(MIGRATION_BACKUP_KEY)
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
