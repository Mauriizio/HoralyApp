import test from "node:test"
import assert from "node:assert/strict"
import { EMPTY_APP_DATA } from "../lib/types.ts"
import { appDataToSupabaseRows, supabaseRowsToAppData } from "../lib/repositories/supabase-mappers.ts"
import { LocalAcademicRepository, SupabaseAcademicRepository, selectAcademicRepository } from "../lib/repositories/academic-repository.ts"
import { sanitizeDisplayName, validateAvatar, validateEmail, validatePassword } from "../lib/auth-utils.ts"
import { summarizeLocalData } from "../lib/local-migration.ts"

test("selecciona repositorio local para invitados y Supabase para sesión autenticada", () => {
  assert.ok(selectAcademicRepository(null) instanceof LocalAcademicRepository)
  assert.ok(selectAcademicRepository({ user: { id: "u1" } }, { from: () => ({}) }) instanceof SupabaseAcademicRepository)
})

test("transforma AppData a filas Supabase conservando IDs y user_id", () => {
  const data = { ...EMPTY_APP_DATA, subjects: [{ id: "s1", name: "Matemática", color: "#fff", difficulty: 3 as const, createdAt: 10 }] }
  const rows = appDataToSupabaseRows(data, "user-a")
  assert.equal(rows.subjects[0].id, "s1")
  assert.equal(rows.subjects[0].user_id, "user-a")
  const back = supabaseRowsToAppData(rows)
  assert.equal(back.subjects[0].id, "s1")
})

test("resumen de migración cuenta materias, bloques, notas, recordatorios y estudio", () => {
  const summary = summarizeLocalData({ ...EMPTY_APP_DATA, subjects: [{} as any], blocks: [{} as any], grades: [{} as any], reminders: [{} as any], studyBlocks: [{} as any] })
  assert.deepEqual(summary, { materias: 1, bloques: 1, notas: 1, recordatorios: 1, bloquesDeEstudio: 1 })
})

test("validación básica de sesión, email, contraseña y avatar", () => {
  assert.equal(validateEmail("a@b.cl"), true)
  assert.equal(validatePassword("12345678"), true)
  assert.equal(sanitizeDisplayName("<Ana>").includes("<"), false)
  assert.equal(validateAvatar({ type: "text/plain", size: 1 } as File), "El avatar debe ser PNG, JPG o WebP.")
})

test("no hay service role declarado en configuración pública", async () => {
  const fs = await import("node:fs/promises")
  const files = ["lib/supabase/client.ts", "lib/supabase/config.ts", "components/auth-form.tsx"]
  const content = (await Promise.all(files.map((f) => fs.readFile(f, "utf8")))).join("\n")
  assert.equal(content.includes("SUPABASE_SERVICE_ROLE_KEY"), true)
  assert.equal(content.includes("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"), false)
})
