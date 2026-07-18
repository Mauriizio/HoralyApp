import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { commandKeyForSubjectName, normalizeCommandKey } from "../lib/command-key.ts"

describe("commandKey", () => {
  it("normaliza en mayúsculas, sin espacios y máximo 8 caracteres", () => {
    assert.deepEqual(normalizeCommandKey(" física avanzada "), "FISICAAV")
  })

  it("genera variantes estables ante colisiones", () => {
    const existing = [{ id: "1", name: "Física", commandKey: "FIS" }]
    assert.deepEqual(commandKeyForSubjectName("Física", existing), "FIS2")
  })
})
