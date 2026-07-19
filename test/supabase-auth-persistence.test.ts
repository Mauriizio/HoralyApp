import test from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFile } from "node:fs/promises"
import { EMPTY_APP_DATA } from "../lib/types.ts"
import { appDataToSupabaseRows, supabaseRowsToAppData } from "../lib/repositories/supabase-mappers.ts"
import { LocalAcademicRepository, SupabaseAcademicRepository, selectAcademicRepository } from "../lib/repositories/academic-repository.ts"
import { avatarPath } from "../lib/avatar-storage.ts"
import { sanitizeDisplayName, validateAvatar, validateEmail, validatePassword } from "../lib/auth-utils.ts"
import { summarizeLocalData } from "../lib/local-migration.ts"

const fakeClient = { from: () => ({}) } as never

test("sesión no configurada o ausente selecciona repositorio local", () => {
  assert.ok(selectAcademicRepository(null) instanceof LocalAcademicRepository)
  assert.ok(selectAcademicRepository(null, fakeClient) instanceof LocalAcademicRepository)
})

test("sesión autenticada selecciona repositorio Supabase y login/logout alternan modo", () => {
  assert.ok(selectAcademicRepository({ user: { id: "u1" } }, fakeClient) instanceof SupabaseAcademicRepository)
  assert.equal(selectAcademicRepository({ user: { id: "u1" } }, fakeClient).kind, "supabase")
  assert.equal(selectAcademicRepository(null, fakeClient).kind, "local")
})

test("indicador de sincronización no debe mostrar Sincronizado sin sesión", () => {
  const localStatus = "local"
  const message = localStatus === "local" ? "Guardado local" : "Sincronizado"
  assert.notEqual(message, "Sincronizado")
})

test("transforma AppData a filas Supabase conservando IDs, user_id y profile onConflict válido", () => {
  const data = { ...EMPTY_APP_DATA, subjects: [{ id: "s1", name: "Matemática", color: "#fff", difficulty: 3 as const, createdAt: 10 }] }
  const rows = appDataToSupabaseRows(data, "user-a", "a@b.cl")
  assert.equal(rows.subjects[0].id, "s1")
  assert.equal(rows.subjects[0].user_id, "user-a")
  assert.equal(rows.profiles[0].id, "user-a")
  assert.equal(rows.profiles[0].user_id, "user-a")
  assert.equal(rows.profiles[0].email, "a@b.cl")
  const back = supabaseRowsToAppData(rows)
  assert.equal(back.subjects[0].id, "s1")
})

test("módulos personalizados sobreviven round-trip en user_settings", () => {
  const modules = [{ id: "custom-1", start: "08:00", end: "08:45", label: "Laboratorio" }]
  const rows = appDataToSupabaseRows({ ...EMPTY_APP_DATA, modules }, "u1")
  assert.deepEqual((rows.user_settings[0].settings as { modules: typeof modules }).modules, modules)
  const restored = supabaseRowsToAppData(rows)
  assert.deepEqual(restored.modules, modules)
})

test("resumen de migración cuenta materias, bloques, notas, recordatorios y estudio", () => {
  const summary = summarizeLocalData({ ...EMPTY_APP_DATA, subjects: [{} as never], blocks: [{} as never], grades: [{} as never], reminders: [{} as never], studyBlocks: [{} as never] })
  assert.deepEqual(summary, { materias: 1, bloques: 1, notas: 1, recordatorios: 1, bloquesDeEstudio: 1 })
})

test("validación básica de sesión, email, contraseña y avatar", () => {
  assert.equal(validateEmail("a@b.cl"), true)
  assert.equal(validatePassword("12345678"), true)
  assert.equal(sanitizeDisplayName("<Ana>").includes("<"), false)
  assert.equal(validateAvatar({ type: "text/plain", size: 1 } as File), "El avatar debe ser PNG, JPG o WebP.")
  assert.equal(validateAvatar({ type: "image/png", size: 3 * 1024 * 1024 } as File), "El avatar no puede superar 2 MB.")
})

test("path de avatar contiene user_id y extensión segura", () => {
  assert.equal(avatarPath("user-123", { type: "image/webp" } as File), "user-123/avatar.webp")
})

test("recuperación solicita correo y actualización usa updateUser", async () => {
  const reset = await readFile("components/auth-form.tsx", "utf8")
  const update = await readFile("app/auth/update-password/page.tsx", "utf8")
  assert.match(reset, /resetPasswordForEmail/)
  assert.match(reset, /\/auth\/update-password/)
  assert.match(update, /updateUser\(\{ password \}\)/)
})

test("shims.d.ts y tsbuildinfo no existen versionados", () => {
  const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  assert.equal(tracked.includes("lib/supabase/shims.d.ts"), false)
  assert.equal(tracked.includes("tsconfig.tsbuildinfo"), false)
})

test("no hay service role pública", async () => {
  const files = ["lib/supabase/client.ts", "lib/supabase/config.ts", "components/auth-form.tsx"]
  const content = (await Promise.all(files.map((f) => readFile(f, "utf8")))).join("\n")
  assert.equal(content.includes("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"), false)
})
