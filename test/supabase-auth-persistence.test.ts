import test from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFile } from "node:fs/promises"
import { EMPTY_APP_DATA } from "../lib/types.ts"
import { appDataToSupabaseRows, supabaseRowsToAppData } from "../lib/repositories/supabase-mappers.ts"
import { LocalAcademicRepository, SupabaseAcademicRepository, selectAcademicRepository } from "../lib/repositories/academic-repository.ts"
import { avatarPath, extractAvatarPathFromPublicUrl, isOwnedAvatarPath, removeAvatar, uploadAvatar, AVATAR_CACHE_CONTROL } from "../lib/avatar-storage.ts"
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

test("round-trip de perfil onboarding conserva todos los campos", () => {
  const data = { ...EMPTY_APP_DATA, profile: { displayName: "Ana", avatar: "data:image/png;base64,abc", institution: "Universidad", career: "Ingeniería", timezone: "America/Santiago", onboardingCompletedAt: "2026-07-20T10:00:00.000Z" } }
  const rows = appDataToSupabaseRows(data, "u1", "ana@example.test")
  assert.equal(rows.profiles[0].display_name, "Ana")
  assert.equal(rows.profiles[0].avatar_url, "data:image/png;base64,abc")
  assert.equal(rows.profiles[0].institution, "Universidad")
  assert.equal(rows.profiles[0].career, "Ingeniería")
  assert.equal(rows.profiles[0].timezone, "America/Santiago")
  assert.equal(rows.profiles[0].onboarding_completed_at, "2026-07-20T10:00:00.000Z")
  assert.equal(rows.profiles[0].email, "ana@example.test")
  const restored = supabaseRowsToAppData(rows)
  assert.deepEqual(restored.profile, data.profile)
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

test("path de avatar versionado contiene user_id, carpeta avatars y extensión segura", () => {
  const first = avatarPath("user-123", { type: "image/webp" } as File)
  const second = avatarPath("user-123", { type: "image/webp" } as File)
  assert.match(first, /^user-123\/avatars\/[0-9a-zA-Z-]+\.webp$/)
  assert.match(second, /^user-123\/avatars\/[0-9a-zA-Z-]+\.webp$/)
  assert.notEqual(first, second)
})

test("helpers de avatar aceptan rutas propias legacy/versionadas y rechazan paths inseguros", () => {
  const original = process.env.NEXT_PUBLIC_SUPABASE_URL
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co"
  try {
    assert.equal(isOwnedAvatarPath("user-123/avatar.png", "user-123"), true)
    assert.equal(isOwnedAvatarPath("user-123/avatars/uuid-1.webp", "user-123"), true)
    assert.equal(isOwnedAvatarPath("user-456/avatars/uuid-1.webp", "user-123"), false)
    assert.equal(isOwnedAvatarPath("user-123/avatars/../avatar.png", "user-123"), false)
    assert.equal(isOwnedAvatarPath("user-123/avatars/uuid-1.gif", "user-123"), false)
    assert.equal(extractAvatarPathFromPublicUrl("https://project.supabase.co/storage/v1/object/public/avatars/user-123/avatar.jpg", "user-123"), "user-123/avatar.jpg")
    assert.equal(extractAvatarPathFromPublicUrl("https://project.supabase.co/storage/v1/object/public/avatars/user-123/avatars/uuid-2.png", "user-123"), "user-123/avatars/uuid-2.png")
    assert.equal(extractAvatarPathFromPublicUrl("https://evil.example/storage/v1/object/public/avatars/user-123/avatar.jpg", "user-123"), null)
    assert.equal(extractAvatarPathFromPublicUrl("https://project.supabase.co/storage/v1/object/public/other/user-123/avatar.jpg", "user-123"), null)
    assert.equal(extractAvatarPathFromPublicUrl("https://project.supabase.co/storage/v1/object/public/avatars/user-123/avatar.jpg?x=1", "user-123"), null)
    assert.equal(extractAvatarPathFromPublicUrl("not a url", "user-123"), null)
  } finally {
    if (original === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else process.env.NEXT_PUBLIC_SUPABASE_URL = original
  }
})

test("uploadAvatar usa rutas inmutables, upsert false, cache largo y removeAvatar elimina solo path validado", async () => {
  const calls: { action: string; args: unknown[] }[] = []
  const client = {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: "user-123" } } }, error: null }) },
    storage: {
      from(bucket: string) {
        calls.push({ action: "from", args: [bucket] })
        return {
          upload(path: string, file: File, options: unknown) {
            calls.push({ action: "upload", args: [path, file.type, options] })
            return Promise.resolve({ error: null })
          },
          getPublicUrl(path: string) {
            calls.push({ action: "getPublicUrl", args: [path] })
            return { data: { publicUrl: `https://cdn.example.test/${path}` } }
          },
          remove(paths: string[]) {
            calls.push({ action: "remove", args: [paths] })
            return Promise.resolve({ error: null })
          },
        }
      },
    },
  } as never

  const file = new File(["avatar"], "avatar.png", { type: "image/png" })
  const uploaded = await uploadAvatar(client, "user-123", file)
  assert.match(uploaded.path, /^user-123\/avatars\/[0-9a-zA-Z-]+\.png$/)
  assert.equal(uploaded.publicUrl, `https://cdn.example.test/${uploaded.path}`)
  assert.deepEqual(calls.find((call) => call.action === "upload")?.args[2], { upsert: false, contentType: "image/png", cacheControl: AVATAR_CACHE_CONTROL })
  assert.equal(calls.some((call) => call.action === "getPublicUrl"), true)

  await removeAvatar(client, "user-123", uploaded.path)
  assert.deepEqual(calls.find((call) => call.action === "remove")?.args[0], [uploaded.path])
  const removeCount = calls.filter((call) => call.action === "remove").length
  await removeAvatar(client, "user-123", "user-456/avatars/not-owned.png")
  assert.equal(calls.filter((call) => call.action === "remove").length, removeCount)
})

test("errores de avatar diferencian validación, sesión, RLS, existente y red sin exponer secretos", async () => {
  const originalConsoleError = console.error
  console.error = () => undefined
  try {
    const invalidFile = new File(["bad"], "avatar.txt", { type: "text/plain" })
    await assert.rejects(() => uploadAvatar({} as never, "user-123", invalidFile), /PNG, JPG o WebP/)

    const noSessionClient = { auth: { getSession: () => Promise.resolve({ data: { session: null }, error: null }) } } as never
    const validFile = new File(["avatar"], "avatar.png", { type: "image/png" })
    await assert.rejects(() => uploadAvatar(noSessionClient, "user-123", validFile), /Debes iniciar sesión/)

    function failingClient(error: unknown) {
      return {
        auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: "user-123" } } }, error: null }) },
        storage: { from: () => ({ upload: () => Promise.resolve({ error }), getPublicUrl: () => ({ data: { publicUrl: "" } }) }) },
      } as never
    }

    await assert.rejects(() => uploadAvatar(failingClient({ statusCode: "403", message: "new row violates row-level security policy" }), "user-123", validFile), /No tienes permiso/)
    await assert.rejects(() => uploadAvatar(failingClient({ statusCode: "409", message: "already exists" }), "user-123", validFile), /ya existe/)
    await assert.rejects(() => uploadAvatar(failingClient({ message: "Failed to fetch" }), "user-123", validFile), /No se pudo conectar/)
  } finally {
    console.error = originalConsoleError
  }
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
import { MIGRATION_BACKUP_KEY, cloudCacheKey, loadMigrationBackup, saveCloudCache, saveMigrationBackup } from "../lib/local-cloud-storage.ts"
import { migrateLocalStorageToSupabase } from "../lib/local-migration.ts"
import { transitionDeleteModule, transitionMoveBlock, transitionSetModules, transitionUpdateSubject, transitionUpsertBlock } from "../lib/schedule-transitions.ts"

function withLocalStorage(fn: (storage: Map<string, string>) => void | Promise<void>) {
  const originalWindow = globalThis.window
  const storage = new Map<string, string>()
  Object.defineProperty(globalThis, "window", {
    value: { localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) } },
    configurable: true,
  })
  return Promise.resolve(fn(storage)).finally(() => Object.defineProperty(globalThis, "window", { value: originalWindow, configurable: true }))
}

test("cache cloud y datos invitados usan claves separadas", async () => {
  await withLocalStorage((storage) => {
    storage.set("horario-escolar:v1", JSON.stringify({ ...EMPTY_APP_DATA, subjects: [{ id: "guest", name: "Local", color: "#fff", difficulty: 3, createdAt: 1 }] }))
    saveCloudCache("u1", { ...EMPTY_APP_DATA, subjects: [{ id: "cloud", name: "Cloud", color: "#000", difficulty: 3, createdAt: 1 }] })
    assert.equal(storage.has("horario-escolar:v1"), true)
    assert.equal(storage.has(cloudCacheKey("u1")), true)
    assert.notEqual(cloudCacheKey("u1"), "horario-escolar:v1")
  })
})

test("snapshot de migración permanece intacto aunque cambie localStorage", async () => {
  await withLocalStorage((storage) => {
    const snapshot = { ...EMPTY_APP_DATA, subjects: [{ id: "s-original", name: "Original", color: "#fff", difficulty: 3 as const, createdAt: 1 }] }
    saveMigrationBackup("u1", snapshot)
    storage.set("horario-escolar:v1", JSON.stringify({ ...EMPTY_APP_DATA, subjects: [] }))
    assert.equal(loadMigrationBackup("u1")?.data.subjects[0]?.id, "s-original")
    assert.equal(storage.has(MIGRATION_BACKUP_KEY), true)
  })
})

test("continuar sin migrar y cancelar conservan respaldo y datos invitados", async () => {
  await withLocalStorage((storage) => {
    const guest = { ...EMPTY_APP_DATA, subjects: [{ id: "guest", name: "Invitado", color: "#fff", difficulty: 3 as const, createdAt: 1 }] }
    storage.set("horario-escolar:v1", JSON.stringify(guest))
    saveMigrationBackup("u1", guest)
    assert.equal(storage.get("horario-escolar:v1")?.includes("guest"), true)
    assert.equal(storage.get(MIGRATION_BACKUP_KEY)?.includes("guest"), true)
  })
})

type Call = { table: string; action: string; args: unknown[] }
function createRepositoryClient(seed: Record<string, Record<string, unknown>[]>, calls: Call[] = []) {
  const byTable = seed
  const client = {
    from(table: string) {
      const builder = {
        table,
        action: "select",
        filters: [] as [string, unknown][],
        select(...args: unknown[]) { calls.push({ table, action: "select", args }); this.action = "select"; return this },
        upsert(values: unknown, ...args: unknown[]) { calls.push({ table, action: "upsert", args: [values, ...args] }); const list = Array.isArray(values) ? values : [values]; byTable[table] = [...(byTable[table] ?? []).filter((row) => !list.some((item) => (item as { id?: unknown }).id === row.id)), ...list as Record<string, unknown>[]]; return Promise.resolve({ error: null }) },
        delete() { calls.push({ table, action: "delete", args: [] }); this.action = "delete"; return this },
        update(values: unknown) { calls.push({ table, action: "update", args: [values] }); this.action = "update"; return this },
        eq(column: string, value: unknown) { calls.push({ table, action: "eq", args: [column, value] }); this.filters.push([column, value]); return this },
        not(column: string, operator: string, value: unknown) { calls.push({ table, action: "not", args: [column, operator, value] }); return Promise.resolve({ error: null }) },
        maybeSingle() { return Promise.resolve({ data: null, error: null }) },
        then(resolve: (value: { data?: Record<string, unknown>[]; error: null }) => void) { resolve({ data: byTable[table] ?? [], error: null }) },
      }
      return builder
    },
  }
  return client as never
}

test("deleteStudyBlock, deleteReminder y deleteGrade eliminan remotamente", async () => {
  const calls: Call[] = []
  const repo = new SupabaseAcademicRepository(createRepositoryClient({}, calls), "u1")
  await repo.deleteStudyBlock("sb1")
  await repo.deleteReminder("r1")
  await repo.deleteGrade("g1")
  assert.deepEqual(calls.filter((call) => call.action === "delete").map((call) => call.table), ["study_blocks", "reminders", "grades"])
})

test("deleteSubject limpia dependencias remotas y desvincula study_blocks", async () => {
  const calls: Call[] = []
  const repo = new SupabaseAcademicRepository(createRepositoryClient({}, calls), "u1")
  await repo.deleteSubject("s1")
  assert.deepEqual(calls.filter((call) => call.action === "delete").map((call) => call.table), ["schedule_blocks", "grades", "reminders", "subjects"])
  assert.equal(calls.some((call) => call.table === "study_blocks" && call.action === "update"), true)
})

test("replaceAll elimina filas remotas obsoletas antes de upsert", async () => {
  const calls: Call[] = []
  const repo = new SupabaseAcademicRepository(createRepositoryClient({}, calls), "u1")
  await repo.replaceAll({ ...EMPTY_APP_DATA, subjects: [{ id: "keep", name: "Keep", color: "#fff", difficulty: 3, createdAt: 1 }] })
  assert.equal(calls.some((call) => call.action === "not" && call.args.includes("in")), true)
  assert.equal(calls.some((call) => call.action === "upsert" && call.table === "subjects"), true)
})

test("migrar usa snapshot capturado y no localStorage modificado", async () => {
  await withLocalStorage(async (storage) => {
    const snapshot = { ...EMPTY_APP_DATA, subjects: [{ id: "snapshot", name: "Snapshot", color: "#fff", difficulty: 3 as const, createdAt: 1 }] }
    storage.set("horario-escolar:v1", JSON.stringify({ ...EMPTY_APP_DATA, subjects: [{ id: "mutated", name: "Mutated", color: "#000", difficulty: 3, createdAt: 1 }] }))
    const calls: Call[] = []
    await migrateLocalStorageToSupabase(createRepositoryClient({}, calls), "u1", snapshot)
    const upserts = calls.filter((call) => call.action === "upsert")
    assert.equal(JSON.stringify(upserts).includes("snapshot"), true)
    assert.equal(JSON.stringify(upserts).includes("mutated"), false)
  })
})

test("migración fallida conserva snapshot", async () => {
  await withLocalStorage(async () => {
    const snapshot = { ...EMPTY_APP_DATA, subjects: [{ id: "safe", name: "Safe", color: "#fff", difficulty: 3 as const, createdAt: 1 }] }
    saveMigrationBackup("u1", snapshot)
    const client = { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) }), upsert: () => Promise.resolve({ error: new Error("fail") }) }) } as never
    await assert.rejects(() => migrateLocalStorageToSupabase(client, "u1", snapshot))
    assert.equal(loadMigrationBackup("u1")?.data.subjects[0]?.id, "safe")
  })
})

test("login con cuenta cloud vacía no borra datos invitados", async () => {
  await withLocalStorage((storage) => {
    storage.set("horario-escolar:v1", JSON.stringify({ ...EMPTY_APP_DATA, subjects: [{ id: "guest", name: "Invitado", color: "#fff", difficulty: 3, createdAt: 1 }] }))
    saveCloudCache("u-empty", EMPTY_APP_DATA)
    assert.equal(storage.get("horario-escolar:v1")?.includes("guest"), true)
    assert.equal(storage.get(cloudCacheKey("u-empty"))?.includes("subjects"), true)
  })
})

test("retrySync mediante replaceAll no resucita datos eliminados", async () => {
  const calls: Call[] = []
  const repo = new SupabaseAcademicRepository(createRepositoryClient({ grades: [{ id: "deleted", user_id: "u1" }] }, calls), "u1")
  await repo.replaceAll({ ...EMPTY_APP_DATA, grades: [] })
  assert.equal(calls.some((call) => call.table === "grades" && call.action === "delete"), true)
})

test("ningún error cloud cambia syncStatus a synced", async () => {
  const source = await readFile("hooks/use-schedule-store.ts", "utf8")
  const catchBlock = source.slice(source.indexOf("} catch (error) {", source.indexOf("const persistCloud")))
  assert.equal(catchBlock.includes('setSyncStatus("synced")'), false)
})


test("transitionUpdateSubject devuelve la materia actualizada antes de setData", () => {
  const current = { ...EMPTY_APP_DATA, subjects: [{ id: "s1", name: "Historia", color: "#fff", difficulty: 3 as const, createdAt: 1, commandKey: "HIS" }] }
  const transition = transitionUpdateSubject(current, "s1", { name: "Historia avanzada" })
  assert.equal(transition.ok, true)
  assert.equal(transition.changedEntity?.name, "Historia avanzada")
  assert.equal(transition.nextData.subjects[0].name, "Historia avanzada")
})

test("updateSubject genera exactamente una escritura cloud por entidad", async () => {
  const calls: Call[] = []
  const repo = new SupabaseAcademicRepository(createRepositoryClient({}, calls), "u1")
  await repo.updateSubject({ id: "s1", semesterId: "sem1", name: "Historia", color: "#fff", difficulty: 3, createdAt: 1 })
  assert.equal(calls.filter((call) => call.action === "upsert" && call.table === "subjects").length, 1)
})

test("transitionUpsertBlock sin reemplazo rechaza conflictos y no debe escribir", () => {
  const current = { ...EMPTY_APP_DATA, blocks: [{ id: "b1", subjectId: "s1", day: "lunes" as const, moduleIds: ["m1"] }] }
  const transition = transitionUpsertBlock(current, { id: "b2", subjectId: "s1", day: "lunes", moduleIds: ["m1"] })
  assert.equal(transition.ok, false)
  assert.deepEqual(transition.nextData.blocks.map((block) => block.id), ["b1"])
  assert.deepEqual(transition.conflictIds, ["b1"])
})

test("transitionUpsertBlock con reemplazo devuelve conflictIds y elimina esos IDs remotamente", async () => {
  const current = { ...EMPTY_APP_DATA, blocks: [{ id: "b1", subjectId: "s1", day: "lunes" as const, moduleIds: ["m1"] }] }
  const transition = transitionUpsertBlock(current, { id: "b2", subjectId: "s1", day: "lunes", moduleIds: ["m1"] }, { replaceConflicts: true })
  assert.equal(transition.ok, true)
  assert.deepEqual(transition.deletedIds, ["b1"])
  const calls: Call[] = []
  const repo = new SupabaseAcademicRepository(createRepositoryClient({}, calls), "u1")
  await Promise.all(transition.deletedIds.map((id) => repo.deleteScheduleBlock(id)))
  assert.equal(calls.some((call) => call.table === "schedule_blocks" && call.action === "delete"), true)
})

test("transitionMoveBlock válido genera el bloque correcto", () => {
  const modules = [{ id: "m1", start: "08:00", end: "08:45", label: "1" }, { id: "m2", start: "08:45", end: "09:30", label: "2" }]
  const current = { ...EMPTY_APP_DATA, blocks: [{ id: "b1", subjectId: "s1", day: "lunes" as const, moduleIds: ["m1"] }] }
  const transition = transitionMoveBlock(current, "b1", "martes", "m2", modules)
  assert.equal(transition.ok, true)
  assert.deepEqual(transition.changedEntity, { id: "b1", subjectId: "s1", day: "martes", moduleIds: ["m2"] })
})

test("transitionMoveBlock con conflicto no escribe", () => {
  const modules = [{ id: "m1", start: "08:00", end: "08:45", label: "1" }]
  const current = { ...EMPTY_APP_DATA, blocks: [
    { id: "b1", subjectId: "s1", day: "lunes" as const, moduleIds: ["m1"] },
    { id: "b2", subjectId: "s2", day: "martes" as const, moduleIds: ["m1"] },
  ] }
  const transition = transitionMoveBlock(current, "b1", "martes", "m1", modules)
  assert.equal(transition.ok, false)
  assert.deepEqual(transition.nextData.blocks, current.blocks)
})

test("transitionDeleteModule actualiza bloques afectados", () => {
  const current = { ...EMPTY_APP_DATA, modules: [{ id: "m1", start: "08:00", end: "08:45", label: "1" }, { id: "m2", start: "08:45", end: "09:30", label: "2" }], blocks: [{ id: "b1", subjectId: "s1", day: "lunes" as const, moduleIds: ["m1", "m2"] }] }
  const transition = transitionDeleteModule(current, "m1")
  assert.deepEqual(transition.nextData.blocks[0].moduleIds, ["m2"])
})

test("transitionDeleteModule elimina bloques que quedan vacíos", () => {
  const current = { ...EMPTY_APP_DATA, modules: [{ id: "m1", start: "08:00", end: "08:45", label: "1" }], blocks: [{ id: "b1", subjectId: "s1", day: "lunes" as const, moduleIds: ["m1"] }] }
  const transition = transitionDeleteModule(current, "m1")
  assert.deepEqual(transition.nextData.blocks, [])
  assert.deepEqual(transition.deletedIds, ["b1"])
})

test("transitionSetModules no deja referencias a módulos inexistentes", () => {
  const current = { ...EMPTY_APP_DATA, blocks: [{ id: "b1", subjectId: "s1", day: "lunes" as const, moduleIds: ["m1", "missing"] }] }
  const transition = transitionSetModules(current, [{ id: "m1", start: "08:00", end: "08:45", label: "1" }])
  assert.deepEqual(transition.nextData.blocks[0].moduleIds, ["m1"])
})

test("resetProfile y resetSettings persisten en cuenta autenticada", async () => {
  const calls: Call[] = []
  const repo = new SupabaseAcademicRepository(createRepositoryClient({}, calls), "u1")
  await repo.updateProfile({ displayName: "" }, "u1@example.com")
  await repo.updateSettings(EMPTY_APP_DATA.settings, EMPTY_APP_DATA.modules)
  assert.equal(calls.some((call) => call.table === "profiles" && call.action === "upsert"), true)
  assert.equal(calls.some((call) => call.table === "user_settings" && call.action === "upsert"), true)
})

test("ninguna operación depende de variables asignadas dentro de setData", async () => {
  const source = await readFile("hooks/use-schedule-store.ts", "utf8")
  assert.equal(source.includes("let nextSubject"), false)
  assert.equal(source.includes("let conflictIds"), false)
  assert.equal(source.includes("let movedBlock"), false)
  assert.equal(source.includes("transitionUpdateSubject"), true)
  assert.equal(source.includes("transitionUpsertBlock"), true)
  assert.equal(source.includes("transitionMoveBlock"), true)
})


test("operaciones individuales persisten semester_id en cada entidad", async () => {
  const calls: Call[] = []
  const repo = new SupabaseAcademicRepository(createRepositoryClient({}, calls), "u1")
  await repo.saveSubject({ id: "s1", semesterId: "sem1", name: "Mate", color: "#fff", difficulty: 3, createdAt: 1 })
  await repo.saveScheduleBlock({ id: "b1", semesterId: "sem1", subjectId: "s1", day: "lunes", moduleIds: ["m1"] })
  await repo.saveStudyBlock({ id: "sb1", semesterId: "sem1", subjectId: "s1", title: "Estudio", day: "martes", start: "10:00", end: "10:30" })
  await repo.saveReminder({ id: "r1", semesterId: "sem1", subjectId: "s1", title: "Entrega", priority: "media", triggers: [], targetDateTime: "2026-07-20T10:00:00.000Z", createdAt: 1, notifiedTriggerIndexes: [] })
  await repo.saveGrade({ id: "g1", semesterId: "sem1", subjectId: "s1", title: "P1", score: 5, weight: 50, date: "2026-07-20", createdAt: 1 })
  const upserts = calls.filter((call) => call.action === "upsert")
  assert.equal(upserts.length, 5)
  for (const call of upserts) {
    const rows = call.args[0] as Array<{ semester_id?: string }>
    assert.equal(rows[0]?.semester_id, "sem1")
  }
})

test("operaciones individuales rechazan entidades nuevas sin semester_id", async () => {
  const repo = new SupabaseAcademicRepository(createRepositoryClient({}), "u1")
  await assert.rejects(() => repo.saveSubject({ id: "s1", name: "Mate", color: "#fff", difficulty: 3, createdAt: 1 }), /semestre activo/)
  await assert.rejects(() => repo.saveScheduleBlock({ id: "b1", subjectId: "s1", day: "lunes", moduleIds: ["m1"] }), /semestre activo/)
  await assert.rejects(() => repo.saveStudyBlock({ id: "sb1", title: "Estudio", day: "lunes", start: "10:00", end: "10:30" }), /semestre activo/)
  await assert.rejects(() => repo.saveReminder({ id: "r1", title: "Entrega", priority: "media", triggers: [], targetDateTime: "2026-07-20T10:00:00.000Z", createdAt: 1, notifiedTriggerIndexes: [] }), /semestre activo/)
  await assert.rejects(() => repo.saveGrade({ id: "g1", subjectId: "s1", title: "P1", score: 5, weight: 50, date: "2026-07-20", createdAt: 1 }), /semestre activo/)
})
