import type { SupabaseClient } from "@supabase/supabase-js"
import type { AppData } from "@/lib/types"
import { appDataToSupabaseRows, supabaseRowsToAppData, type SupabaseDataset } from "@/lib/repositories/supabase-mappers"

export const LOCAL_STORAGE_MIGRATION_ID = "localstorage-v1"

function isMissingReminderKindColumn(error: unknown) {
  if (!error || typeof error !== "object") return false
  const value = error as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown }
  const raw = [value.code, value.message, value.details, value.hint].filter(Boolean).join(" ").toLowerCase()
  return raw.includes("reminder_kind") && (
    raw.includes("pgrst204")
    || raw.includes("column")
    || raw.includes("schema cache")
    || raw.includes("does not exist")
  )
}

function withoutReminderKind(values: Record<string, unknown>[]) {
  return values.map(({ reminder_kind: _ignored, ...legacy }) => legacy)
}

const MIGRATION_DATA_TABLES = [
  "semesters",
  "subjects",
  "schedule_blocks",
  "study_blocks",
  "reminders",
  "assessment_groups",
  "grades",
  "subject_notes",
  "subject_note_attachments",
  "user_settings",
  "profiles",
] as const satisfies readonly (keyof SupabaseDataset)[]

export function summarizeLocalData(data: AppData) {
  return {
    semestres: data.semesters.length,
    materias: data.subjects.length,
    bloques: data.blocks.length,
    notas: data.grades.length,
    grupos: data.assessmentGroups.length,
    apuntes: data.subjectNotes.length,
    adjuntos: data.subjectNoteAttachments.length,
    recordatorios: data.reminders.length,
    bloquesDeEstudio: data.studyBlocks.length,
  }
}

function ids(values: { id: string }[]) {
  return [...values.map((value) => value.id)].sort()
}

function sameIds(left: { id: string }[], right: { id: string }[]) {
  return ids(left).join("|") === ids(right).join("|")
}

function verifyMigratedData(expected: AppData, actual: AppData) {
  const structuralMatch =
    sameIds(expected.semesters, actual.semesters)
    && sameIds(expected.subjects, actual.subjects)
    && sameIds(expected.blocks, actual.blocks)
    && sameIds(expected.studyBlocks, actual.studyBlocks)
    && sameIds(expected.reminders, actual.reminders)
    && sameIds(expected.assessmentGroups, actual.assessmentGroups)
    && sameIds(expected.grades, actual.grades)
    && sameIds(expected.subjectNotes, actual.subjectNotes)
    && sameIds(expected.subjectNoteAttachments, actual.subjectNoteAttachments)

  if (!structuralMatch) return false
  if (expected.activeSemesterId && expected.activeSemesterId !== actual.activeSemesterId) return false
  if (expected.profile.displayName && expected.profile.displayName !== actual.profile.displayName) return false
  return true
}

export async function readMigrationCompleted(client: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await client
    .from("migration_status")
    .select("completed_at")
    .eq("user_id", userId)
    .eq("id", LOCAL_STORAGE_MIGRATION_ID)
    .maybeSingle()

  if (error) throw new Error("No se pudo comprobar el estado de migración de tu cuenta.")
  return Boolean(data?.completed_at)
}

export async function loadMigratedData(client: SupabaseClient, userId: string): Promise<AppData> {
  const dataset: Partial<SupabaseDataset> = {}
  for (const table of MIGRATION_DATA_TABLES) {
    const { data, error } = await client.from(table).select("*").eq("user_id", userId)
    if (error) throw new Error(`No se pudieron verificar los datos migrados (${table}).`)
    dataset[table] = data ?? []
  }
  return supabaseRowsToAppData(dataset)
}

export async function migrateLocalStorageToSupabase(client: SupabaseClient, userId: string, snapshot: AppData) {
  const summary = summarizeLocalData(snapshot)
  if (await readMigrationCompleted(client, userId)) {
    return { skipped: true, summary, data: await loadMigratedData(client, userId) }
  }

  const rows = appDataToSupabaseRows(snapshot, userId)
  const expectedPersisted = supabaseRowsToAppData(rows)
  for (const [table, values] of Object.entries(rows) as [keyof SupabaseDataset, Record<string, unknown>[]][]) {
    if (!values.length) continue
    const onConflict = table === "profiles" ? "id" : "id,user_id"
    const { error } = await client.from(table).upsert(values, { onConflict })
    if (!error) continue

    if (table === "reminders" && isMissingReminderKindColumn(error)) {
      const { error: legacyError } = await client.from(table).upsert(withoutReminderKind(values), { onConflict })
      if (!legacyError) continue
    }

    throw new Error(`Falló la migración al guardar ${table}. Tus datos locales se conservaron y puedes reintentar.`)
  }

  const migrated = await loadMigratedData(client, userId)
  if (!verifyMigratedData(expectedPersisted, migrated)) {
    throw new Error("La verificación de migración no coincide. Tus datos locales se conservaron y puedes reintentar.")
  }

  const completedAt = new Date().toISOString()
  const { error } = await client.from("migration_status").upsert(
    { id: LOCAL_STORAGE_MIGRATION_ID, user_id: userId, completed_at: completedAt, summary },
    { onConflict: "id,user_id" },
  )
  if (error) throw new Error("No se pudo marcar la migración como completada; puedes reintentar sin duplicar datos.")

  if (!(await readMigrationCompleted(client, userId))) {
    throw new Error("La migración se guardó, pero no se pudo confirmar su estado final.")
  }

  return { skipped: false, summary, data: migrated }
}
