import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

test("migración carga y verifica todas las colecciones persistidas", async () => {
  const source = await readFile("lib/local-migration.ts", "utf8")
  for (const table of [
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
  ]) {
    assert.match(source, new RegExp(`"${table}"`))
  }
  assert.match(source, /readMigrationCompleted/)
  assert.match(source, /expectedPersisted/)
})

test("modal de migración no vuelve a reemplazar cloud con un dataset parcial y recuerda decisiones", async () => {
  const source = await readFile("components/migration-modal.tsx", "utf8")
  assert.doesNotMatch(source, /store\.replaceAll\(result\.data\)/)
  assert.match(source, /saveMigrationDecision\(userId, "completed"\)/)
  assert.match(source, /saveMigrationDecision\(userId, "deferred"\)/)
  assert.match(source, /await store\.refreshFromCloud\(\)/)
  assert.match(source, /horarily:open-migration/)
})

test("replaceAll de cuenta espera Supabase, relee y confirma antes de publicar éxito", async () => {
  const source = await readFile("hooks/use-schedule-store.ts", "utf8")
  assert.match(source, /const replaceAll = useCallback\(async/)
  assert.match(source, /await repository\.replaceAll\(next\)/)
  assert.match(source, /confirmed = await repository\.loadData\(\)/)
  assert.match(source, /throwOnError: true/)
  assert.match(source, /const refreshFromCloud = useCallback\(async/)
  assert.match(source, /window\.addEventListener\("focus", refreshIfStale\)/)
})

test("importación espera confirmación cloud y exportación usa descarga compatible", async () => {
  const settings = await readFile("components/settings-view.tsx", "utf8")
  const storage = await readFile("lib/storage.ts", "utf8")
  assert.match(settings, /await replaceAll\(next\)/)
  assert.match(settings, /await refreshFromCloud\(\)/)
  assert.match(settings, /horarily:open-migration/)
  assert.match(storage, /document\.body\.appendChild\(anchor\)/)
  assert.match(storage, /setTimeout\(\(\) => URL\.revokeObjectURL\(url\), 1_000\)/)
})

test("PWA invalida el shell anterior para recibir la reparación", async () => {
  const sw = await readFile("public/sw.js", "utf8")
  assert.match(sw, /horaly-shell-v5/)
  assert.match(sw, /isNextStaticAsset/)
  assert.match(sw, /networkFirstAndCache/)
})

test("sincronización tolera temporalmente una DB productiva sin reminder_kind", async () => {
  const repository = await readFile("lib/repositories/academic-repository.ts", "utf8")
  const migration = await readFile("lib/local-migration.ts", "utf8")
  assert.match(repository, /isMissingReminderKindColumn/)
  assert.match(repository, /delete legacy\.reminder_kind/)
  assert.match(repository, /table === "reminders"/)
  assert.match(migration, /isMissingReminderKindColumn/)
  assert.match(migration, /delete legacy\.reminder_kind/)
})
