import assert from "node:assert/strict"
import test from "node:test"
import {
  calculateAcademicTickerSideCopies,
  recenterAcademicTicker,
} from "../domain/academic-ticker-scroll.ts"
import { buildAcademicClassSessions } from "../domain/academic-class-sessions.ts"
import { getHorarilyCompanionMessages } from "../domain/horarily-companion.ts"

const modules = Array.from({ length: 6 }, (_, index) => ({
  id: `m${index + 1}`,
  start: `${String(8 + index).padStart(2, "0")}:00`,
  end: `${String(9 + index).padStart(2, "0")}:00`,
  label: `M${index + 1}`,
}))
const subjects = [
  { id: "a", name: "Álgebra" },
  { id: "b", name: "Física" },
]
const block = (id: string, subjectId: string, moduleIds: string[]) => ({ id, subjectId, moduleIds, day: "viernes" as const })

test("buffer dinámico cubre viewports mayores que una vuelta corta", () => {
  assert.equal(calculateAcademicTickerSideCopies(390, 150), 5)
  assert.equal(calculateAcademicTickerSideCopies(1_440, 150), 12)
  assert.equal(calculateAcademicTickerSideCopies(100, 500), 3)
})

test("recenter conserva posición visual tras 50, 100 y 500 vueltas", () => {
  const loopWidth = 150
  const sideCopies = calculateAcademicTickerSideCopies(390, loopWidth)
  const center = sideCopies * loopWidth
  for (const loops of [50, 100, 500]) {
    assert.equal(recenterAcademicTicker(center + loops * loopWidth + 37, loopWidth, sideCopies), center + 37)
  }
})

test("cinco bloques consecutivos de dos materias forman dos sesiones", () => {
  const sessions = buildAcademicClassSessions({
    modules,
    subjects,
    blocks: [block("a1", "a", ["m1"]), block("a2", "a", ["m2"]), block("b1", "b", ["m3"]), block("b2", "b", ["m4"]), block("b3", "b", ["m5"])],
  })
  assert.equal(sessions.length, 2)
  assert.deepEqual(sessions.map(({ subjectId, firstModuleIndex, lastModuleIndex }) => ({ subjectId, firstModuleIndex, lastModuleIndex })), [
    { subjectId: "a", firstModuleIndex: 0, lastModuleIndex: 1 },
    { subjectId: "b", firstModuleIndex: 2, lastModuleIndex: 4 },
  ])
  const messages = getHorarilyCompanionMessages({ timezone: "America/Santiago", reminders: [], assessments: [], subjects: [], classes: sessions }, new Date(2026, 7, 21, 10, 30))
  assert.equal(messages.find((message) => message.kind === "day-summary")?.message, "Hoy tienes 2 clases.")
})

test("bloques multimódulo cuentan una vez y misma materia separada cuenta dos veces", () => {
  const combined = buildAcademicClassSessions({ modules, subjects, blocks: [block("a", "a", ["m1", "m2"]), block("b", "b", ["m3", "m4", "m5"])] })
  assert.equal(combined.length, 2)
  const separated = buildAcademicClassSessions({ modules, subjects, blocks: [block("a1", "a", ["m1", "m2"]), block("b", "b", ["m3", "m4"]), block("a2", "a", ["m5", "m6"])] })
  assert.deepEqual(separated.map((session) => session.subjectId), ["a", "b", "a"])
})

test("current usa fin de sesión y next omite segmentos de la misma sesión", () => {
  const sessions = buildAcademicClassSessions({ modules, subjects, blocks: [block("a1", "a", ["m1"]), block("a2", "a", ["m2"]), block("b1", "b", ["m3"]), block("b2", "b", ["m4", "m5"])] })
  const messages = getHorarilyCompanionMessages({ timezone: "America/Santiago", reminders: [], assessments: [], subjects: [], classes: sessions }, new Date(2026, 7, 21, 8, 30))
  assert.equal(messages.find((message) => message.kind === "current-class")?.message, "Estás en Álgebra hasta las 10:00.")
  assert.match(messages.find((message) => message.kind === "next-class")?.message ?? "", /^Física comienza/)
})
