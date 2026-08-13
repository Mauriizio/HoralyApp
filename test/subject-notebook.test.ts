import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { EMPTY_APP_DATA } from "../lib/types.ts"
import { migrateData, validateImportedData } from "../lib/storage.ts"
import { appDataToSupabaseRows, supabaseRowsToAppData } from "../lib/repositories/supabase-mappers.ts"

const semester = { id: "semester", name: "Semestre", status: "active" as const, createdAt: 1 }
const subject = { id: "subject", semesterId: "semester", name: "Física", color: "#2563eb", difficulty: 3 as const, createdAt: 1, commandKey: "FISICA" }
const note = { id: "note", semesterId: "semester", subjectId: "subject", title: "Leyes de Newton", unit: "Unidad 1", content: "<script>alert(1)</script>\nTexto largo", createdAt: 2, updatedAt: 3 }

test("migración legacy a v6 conserva datos y añade documento estructurado idempotentemente", () => {
  const legacy = { ...EMPTY_APP_DATA, version: 4, subjects: [subject], semesters: [semester], activeSemesterId: "semester" }
  delete (legacy as Partial<typeof legacy>).subjectNotes
  const migrated = migrateData(legacy as unknown as Partial<typeof EMPTY_APP_DATA> & Record<string, unknown>)
  assert.equal(migrated.version, 6)
  assert.deepEqual(migrated.subjectNotes, [])
  assert.deepEqual(migrateData(migrated as unknown as Partial<typeof EMPTY_APP_DATA> & Record<string, unknown>), migrated)
  assert.equal(migrated.subjects[0].name, "Física")
})

test("import/export valida relaciones y preserva contenido como texto", () => {
  const data = { ...EMPTY_APP_DATA, subjects: [subject], semesters: [semester], activeSemesterId: "semester", subjectNotes: [note] }
  const valid = validateImportedData(JSON.parse(JSON.stringify(data)))
  assert.equal(valid.ok, true)
  assert.equal(valid.data?.subjectNotes[0].content, note.content)
  const invalid = validateImportedData({ ...data, subjectNotes: [{ ...note, subjectId: "other" }] })
  assert.equal(invalid.ok, false)
})

test("mappers Supabase conservan apuntes y propietario", () => {
  const data = { ...EMPTY_APP_DATA, subjects: [subject], semesters: [semester], activeSemesterId: "semester", subjectNotes: [note] }
  const rows = appDataToSupabaseRows(data, "user-a")
  assert.equal(rows.subject_notes[0].user_id, "user-a")
  assert.equal(rows.subject_notes[0].content, note.content)
  const restored = supabaseRowsToAppData({ subject_notes: rows.subject_notes, subjects: rows.subjects, semesters: rows.semesters, user_settings: rows.user_settings })
  assert.deepEqual(restored.subjectNotes[0], note)
})

test("migración SQL crea RLS CRUD, FKs e índices focalizados", async () => {
  const sql = await readFile("supabase/migrations/202607290001_subject_notes.sql", "utf8")
  assert.match(sql, /create table if not exists public\.subject_notes/)
  assert.match(sql, /references public\.subjects\(id, user_id\) on delete cascade/)
  assert.match(sql, /enable row level security/)
  for (const operation of ["select", "insert", "update", "delete"]) assert.match(sql, new RegExp(`for ${operation}`))
  assert.ok((sql.match(/auth\.uid\(\) = user_id/g) ?? []).length >= 4)
  assert.match(sql, /revoke all on public\.subject_notes from anon/)
})

test("UI de Cuaderno usa documento estructurado, autosave y barrera de identidad", async () => {
  const ui = await readFile("components/notebook/notebook-view.tsx", "utf8")
  const store = await readFile("hooks/use-schedule-store.ts", "utf8")
  assert.match(ui, /Cuaderno de estudio/)
  assert.match(ui, /window\.setTimeout/)
  assert.match(ui, /StructuredNoteEditor/)
  assert.doesNotMatch(ui, /<Textarea/)
  assert.match(ui, /expectedAuthGeneration/)
  assert.doesNotMatch(ui, /dangerouslySetInnerHTML/)
  assert.match(store, /subjectNote\.saveConfirmed/)
  assert.match(store, /subjectNotes: d\.subjectNotes\.filter/)
})
