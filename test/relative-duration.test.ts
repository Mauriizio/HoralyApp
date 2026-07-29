import test from "node:test"
import assert from "node:assert/strict"
import { formatRelativeDuration } from "../lib/time-format.ts"

const cases: Array<[number, string]> = [
  [0, "ahora"],
  [1, "1 minuto"],
  [59, "59 minutos"],
  [60, "1 hora"],
  [61, "1 hora y 1 minuto"],
  [90, "1 hora y 30 minutos"],
  [120, "2 horas"],
  [478, "7 horas y 58 minutos"],
  [1440, "1 día"],
  [1501, "1 día, 1 hora y 1 minuto"],
]

test("formatea duraciones relativas en español sin unidades vacías", () => {
  for (const [minutes, expected] of cases) {
    assert.equal(formatRelativeDuration(minutes, "es"), expected)
  }
})

test("normaliza minutos negativos y fraccionarios", () => {
  assert.equal(formatRelativeDuration(-4, "es-CL"), "ahora")
  assert.equal(formatRelativeDuration(61.8, "es-CL"), "1 hora y 1 minuto")
})
