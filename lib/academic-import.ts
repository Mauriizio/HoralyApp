import type { AppData } from "@/lib/types"
import { migrateData, prepareSharedAcademicImport, validateImportedData } from "@/lib/storage"

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input)
}

/**
 * Lenient cross-account importer for schedule sharing.
 *
 * Older Horarily exports could contain attachment metadata from semesters that
 * were not included in the same JSON. A strict full-restore correctly rejects
 * those broken relations, but a classmate only needs portable academic setup.
 * We therefore migrate first, remove personal/non-portable records, and only
 * then run the normal strict validator on the recipient-safe result.
 */
export function importSharedAcademicJson(json: string, current: AppData): AppData {
  const parsed = JSON.parse(json) as unknown
  if (!isRecord(parsed)) throw new Error("El archivo debe contener un objeto JSON.")
  const migrated = migrateData(parsed as Partial<AppData> & Record<string, unknown>)
  const shared = prepareSharedAcademicImport(migrated, current)
  const validation = validateImportedData(shared)
  if (!validation.ok || !validation.data) throw new Error(validation.errors.join("\n"))
  return validation.data
}
