import type { AppData } from "@/lib/types"
import { loadDataResult } from "@/lib/storage"
import { appDataToSupabaseRows } from "@/lib/repositories/supabase-mappers"

export function summarizeLocalData(data: AppData) {
  return { materias: data.subjects.length, bloques: data.blocks.length, notas: data.grades.length, recordatorios: data.reminders.length, bloquesDeEstudio: data.studyBlocks.length }
}

type SupabaseLike = { from: (table: string) => any }

export async function migrateLocalStorageToSupabase(client: SupabaseLike, userId: string) {
  const result = loadDataResult()
  if (!result.ok) throw new Error("Los datos locales no son válidos; conserva el respaldo y corrige antes de migrar.")
  const summary = summarizeLocalData(result.data)
  const existing = await client.from("migration_status").select("completed_at").eq("user_id", userId).eq("id", "localstorage-v1").maybeSingle()
  if (existing.data?.completed_at) return { skipped: true, summary }
  const rows = appDataToSupabaseRows(result.data, userId)
  for (const [table, values] of Object.entries(rows)) {
    if (!values.length) continue
    const { error } = await client.from(table).upsert(values, { onConflict: "id,user_id" })
    if (error) throw new Error("Falló la migración. Tus datos locales se conservaron y puedes reintentar.")
  }
  const { error } = await client.from("migration_status").upsert({ id: "localstorage-v1", user_id: userId, completed_at: new Date().toISOString(), summary }, { onConflict: "id,user_id" })
  if (error) throw new Error("No se pudo marcar la migración como completada; puedes reintentar sin duplicar datos.")
  return { skipped: false, summary }
}
