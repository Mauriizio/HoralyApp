import type { SupabaseClient } from "@supabase/supabase-js"
import type { AppData } from "@/lib/types"
import { appDataToSupabaseRows, supabaseRowsToAppData, type SupabaseDataset } from "@/lib/repositories/supabase-mappers"

export function summarizeLocalData(data: AppData) {
  return { materias: data.subjects.length, bloques: data.blocks.length, notas: data.grades.length, recordatorios: data.reminders.length, bloquesDeEstudio: data.studyBlocks.length }
}

function ids(values: { id: string }[]) {
  return [...values.map((value) => value.id)].sort()
}

function verifyMigratedData(expected: AppData, actual: AppData) {
  return ids(expected.subjects).join("|") === ids(actual.subjects).join("|")
    && ids(expected.blocks).join("|") === ids(actual.blocks).join("|")
    && ids(expected.studyBlocks).join("|") === ids(actual.studyBlocks).join("|")
    && ids(expected.reminders).join("|") === ids(actual.reminders).join("|")
    && ids(expected.grades).join("|") === ids(actual.grades).join("|")
}

export async function loadMigratedData(client: SupabaseClient, userId: string): Promise<AppData> {
  const dataset: Partial<SupabaseDataset> = {}
  for (const table of ["subjects", "schedule_blocks", "study_blocks", "reminders", "grades", "user_settings", "profiles"] as const) {
    const { data, error } = await client.from(table).select("*").eq("user_id", userId)
    if (error) throw new Error("No se pudieron verificar los datos migrados.")
    dataset[table] = data ?? []
  }
  return supabaseRowsToAppData(dataset)
}

export async function migrateLocalStorageToSupabase(client: SupabaseClient, userId: string, snapshot: AppData) {
  const summary = summarizeLocalData(snapshot)
  const existing = await client.from("migration_status").select("completed_at").eq("user_id", userId).eq("id", "localstorage-v1").maybeSingle()
  if (existing.data?.completed_at) return { skipped: true, summary, data: await loadMigratedData(client, userId) }
  const rows = appDataToSupabaseRows(snapshot, userId)
  for (const [table, values] of Object.entries(rows)) {
    if (!values.length) continue
    const { error } = await client.from(table).upsert(values, { onConflict: table === "profiles" ? "id" : "id,user_id" })
    if (error) throw new Error("Falló la migración. Tus datos locales se conservaron y puedes reintentar.")
  }
  const migrated = await loadMigratedData(client, userId)
  if (!verifyMigratedData(snapshot, migrated)) throw new Error("La verificación de migración no coincide. Tus datos locales se conservaron y puedes reintentar.")
  const { error } = await client.from("migration_status").upsert({ id: "localstorage-v1", user_id: userId, completed_at: new Date().toISOString(), summary }, { onConflict: "id,user_id" })
  if (error) throw new Error("No se pudo marcar la migración como completada; puedes reintentar sin duplicar datos.")
  return { skipped: false, summary, data: migrated }
}
