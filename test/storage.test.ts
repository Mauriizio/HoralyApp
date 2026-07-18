import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { EMPTY_APP_DATA } from "../lib/types.ts"
import { exportAsJson, importFromJson, migrateData, validateImportedData } from "../lib/storage.ts"

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

  it("rechaza importaciones inválidas sin producir datos reemplazables", () => {
    const result = validateImportedData({ ...EMPTY_APP_DATA, subjects: "no-array" })
    assert.deepEqual(result.ok, false)
    assert.deepEqual(result.data, undefined)
  })

  it("preserva datos actuales si la importación falla en el caller", () => {
    const current = { ...EMPTY_APP_DATA, subjects: [{ id: "1", name: "Historia", color: "#000", difficulty: 3 as const, createdAt: 1, commandKey: "HIS" }] }
    assert.throws(() => importFromJson('{"subjects":"bad"}'))
    assert.deepEqual(current.subjects.length, 1)
  })

  it("importa JSON válido migrado", () => {
    const json = exportAsJson({
      ...EMPTY_APP_DATA,
      subjects: [{ id: "1", name: "Lenguaje", color: "#000", difficulty: 3, createdAt: 1, commandKey: "LEN" }],
    })
    assert.deepEqual(importFromJson(json).subjects[0].commandKey, "LEN")
  })
})
