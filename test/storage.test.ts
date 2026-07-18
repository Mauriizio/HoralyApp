import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { EMPTY_APP_DATA, type AppData } from "../lib/types.ts"
import {
  exportAsJson,
  importFromJson,
  loadDataResult,
  migrateData,
  normalizeSubjectForStorage,
  STORAGE_KEY,
  validateImportedData,
} from "../lib/storage.ts"

function validData(patch: Partial<AppData> = {}): AppData {
  return {
    ...EMPTY_APP_DATA,
    subjects: [{ id: "s1", name: "Física", color: "#000", difficulty: 3, createdAt: 1, commandKey: "FIS" }],
    ...patch,
  }
}

describe("storage", () => {
  it("migra materias antiguas generando commandKey estable y único", () => {
    const data = migrateData({
      ...EMPTY_APP_DATA,
      subjects: [
        { id: "1", name: "Física", color: "#000", difficulty: 3, createdAt: 1 },
        { id: "2", name: "Física", color: "#111", difficulty: 3, createdAt: 2 },
      ],
    })
    assert.deepEqual(data.subjects.map((subject) => subject.commandKey), ["FIS", "FIS2"])
  })

  it("centraliza commandKey al normalizar materias de cualquier punto de entrada", () => {
    const created = normalizeSubjectForStorage(
      { name: "Programación avanzada", color: "#000", difficulty: 4, commandKey: " prog largo ", notes: undefined, icon: undefined },
      [{ id: "1", name: "Programación", commandKey: "PROGLARG" }],
      { id: "2", createdAt: 2 },
    )
    assert.deepEqual(created.commandKey, "PROGLAR2")
  })

  it("rechaza subjects como string", () => {
    const result = validateImportedData({ ...EMPTY_APP_DATA, subjects: "no-array" })
    assert.deepEqual(result.ok, false)
    assert.match(result.errors.join("\n"), /subjects/)
  })

  it("rechaza grades como object", () => {
    const result = validateImportedData({ ...EMPTY_APP_DATA, grades: { id: "g1" } })
    assert.deepEqual(result.ok, false)
    assert.match(result.errors.join("\n"), /grades/)
  })

  it("rechaza módulos con formato incorrecto", () => {
    const result = validateImportedData(validData({ modules: [{ id: "m1", start: "99:00", end: "10:00", label: "M1" }] }))
    assert.deepEqual(result.ok, false)
    assert.match(result.errors.join("\n"), /Módulos horarios inválidos/)
  })

  it("rechaza IDs rotos", () => {
    const result = validateImportedData(validData({ subjects: [{ id: "", name: "Física", color: "#000", difficulty: 3, createdAt: 1, commandKey: "FIS" }] }))
    assert.deepEqual(result.ok, false)
  })

  it("rechaza relaciones inexistentes", () => {
    const result = validateImportedData(validData({ grades: [{ id: "g1", subjectId: "missing", title: "P1", score: 5, weight: 50, date: "2026-01-01", createdAt: 1 }] }))
    assert.deepEqual(result.ok, false)
    assert.match(result.errors.join("\n"), /materia inexistente/)
  })

  it("acepta importación válida antigua con campos ausentes migrables", () => {
    const result = validateImportedData({ subjects: [{ id: "1", name: "Lenguaje", color: "#000", difficulty: 3, createdAt: 1 }] })
    assert.deepEqual(result.ok, true)
    assert.deepEqual(result.data?.subjects[0].commandKey, "LEN")
  })

  it("preserva datos actuales si la importación falla en el caller", () => {
    const current = validData()
    assert.throws(() => importFromJson('{"subjects":"bad"}'))
    assert.deepEqual(current.subjects.length, 1)
  })

  it("un estado local inválido no se convierte en EMPTY_APP_DATA guardable automáticamente", () => {
    const originalWindow = globalThis.window
    const storage = new Map<string, string>()
    storage.set(STORAGE_KEY, '{"subjects":"bad"}')
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, value: string) => storage.set(key, value),
        },
      },
      configurable: true,
    })

    const result = loadDataResult()
    assert.deepEqual(result.ok, false)
    assert.deepEqual(storage.get(STORAGE_KEY), '{"subjects":"bad"}')

    Object.defineProperty(globalThis, "window", { value: originalWindow, configurable: true })
  })

  it("importa JSON válido migrado", () => {
    const json = exportAsJson(validData({ subjects: [{ id: "1", name: "Lenguaje", color: "#000", difficulty: 3, createdAt: 1, commandKey: "LEN" }] }))
    assert.deepEqual(importFromJson(json).subjects[0].commandKey, "LEN")
  })
})
