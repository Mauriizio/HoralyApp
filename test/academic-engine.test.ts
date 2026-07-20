import test from "node:test"
import assert from "node:assert/strict"
import { calculateRequiredGrade, calculateWeightedAverage, detectOverdueReminders, detectSubjectsAtRisk, detectSubjectsRequiringAttention, determineNextClass, estimateWeeklyLoad, suggestBasicStudyBlock } from "../domain/academic-engine/index.ts"
import { EMPTY_APP_DATA } from "../lib/types.ts"

test("motor académico calcula promedio y nota necesaria", () => {
  const avg = calculateWeightedAverage([{ id: "g1", subjectId: "s1", title: "P1", score: 4, weight: 50, date: "2026-01-01", createdAt: 1 }], { min: 1, max: 7, passing: 4 })
  assert.equal(avg.value, 4)
  assert.equal(calculateRequiredGrade(avg, { min: 1, max: 7, passing: 4 }, 50).required, 4)
})

test("motor académico detecta riesgo, vencidos, próxima clase y carga", () => {
  const data = { ...EMPTY_APP_DATA, subjects: [{ id: "s1", name: "Mate", color: "#000", difficulty: 4 as const, createdAt: 1 }], blocks: [{ id: "b1", subjectId: "s1", day: "lunes" as const, moduleIds: ["m1"] }], reminders: [{ id: "r1", subjectId: "s1", title: "Tarea", priority: "alta" as const, triggers: [], targetDateTime: "2026-01-01T00:00:00.000Z", createdAt: 1, notifiedTriggerIndexes: [] }] }
  assert.equal(detectSubjectsAtRisk(data).length, 0)
  assert.equal(detectSubjectsRequiringAttention(data, new Date("2026-01-02T00:00:00.000Z")).length, 1)
  assert.equal(detectOverdueReminders(data.reminders, new Date("2026-01-02T00:00:00.000Z")).length, 1)
  assert.equal(determineNextClass(data, new Date("2026-01-05T13:00:00.000Z"))?.subject.name, "Mate")
  assert.equal(estimateWeeklyLoad(data).totalBlocks, 1)
  assert.equal(suggestBasicStudyBlock(data).confidence, "medium")
})
