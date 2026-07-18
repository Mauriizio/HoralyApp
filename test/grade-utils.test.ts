import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { computeGlobalStats, computeSubjectStats, isScoreInScale, isValidWeight } from "../lib/grade-utils.ts"
import type { Grade, Subject } from "../lib/types.ts"

const scale = { min: 1, max: 7, passing: 4 }
const subjects: Subject[] = [
  { id: "fis", name: "Física", color: "#000", difficulty: 3, createdAt: 1, commandKey: "FIS" },
  { id: "mat", name: "Matemáticas", color: "#111", difficulty: 4, createdAt: 2, commandKey: "MAT" },
]
const grades: Grade[] = [
  { id: "g1", subjectId: "fis", title: "Prueba 1", score: 5, weight: 40, date: "2026-04-01", createdAt: 1 },
  { id: "g2", subjectId: "fis", title: "Prueba 2", score: 6, weight: 60, date: "2026-05-01", createdAt: 2 },
  { id: "g3", subjectId: "mat", title: "Control", score: 3, weight: 50, date: "2026-04-10", createdAt: 3 },
]

describe("grade-utils", () => {
  it("valida notas dentro de la escala", () => {
    assert.deepEqual(isScoreInScale(4, scale), true)
    assert.deepEqual(isScoreInScale(8, scale), false)
  })

  it("valida ponderaciones entre 1 y 100", () => {
    assert.deepEqual(isValidWeight(20), true)
    assert.deepEqual(isValidWeight(0), false)
    assert.deepEqual(isValidWeight(120), false)
  })

  it("calcula promedio ponderado por materia", () => {
    const stats = computeSubjectStats("fis", grades, scale)
    assert.deepEqual(stats.weightedAverage, 5.6)
    assert.deepEqual(stats.coverage, 1)
    assert.deepEqual(stats.isPassing, true)
  })

  it("calcula promedio global y materias en riesgo", () => {
    const { global } = computeGlobalStats(subjects, grades, scale)
    assert.deepEqual(global.globalWeightedAverage, 4.3)
    assert.deepEqual(global.atRiskSubjectIds, ["mat"])
  })
})
