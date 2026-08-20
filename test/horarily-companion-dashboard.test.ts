import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { getHorarilyCompanionMessage } from "../domain/horarily-companion.ts"

const now = new Date(2026, 7, 11, 10, 0, 0, 0)
const base = {
  reminders: [], assessments: [], subjects: [],
  classes: [],
}

test("Horarily respeta prioridades y fechas reales", () => {
  const data = {
    ...base,
    reminders: [
      { title: "Vencido", targetDateTime: "2026-08-11T09:00:00" },
      { title: "Pronto", targetDateTime: "2026-08-11T10:30:00" },
    ],
    classes: [{ subjectName: "Álgebra", start: "10:20", end: "11:20", day: "martes" as const }],
  }
  assert.equal(getHorarilyCompanionMessage(data, now).kind, "overdue")
  assert.match(getHorarilyCompanionMessage({ ...data, reminders: [] }, now).message, /Álgebra.*20 min/)
})

test("clase actual supera futura; próxima evaluación supera recordatorio neutral", () => {
  const classes = [
    { subjectName: "Física", start: "09:30", end: "10:30", day: "martes" as const },
    { subjectName: "Álgebra", start: "11:00", end: "12:00", day: "martes" as const },
  ]
  assert.equal(getHorarilyCompanionMessage({ ...base, classes }, now).kind, "current-class")
  const result = getHorarilyCompanionMessage({
    ...base,
    reminders: [{ title: "Informe", targetDateTime: "2026-08-11T16:00:00" }],
    assessments: [{ title: "Prueba", date: "2026-08-12" }],
  }, now)
  assert.equal(result.kind, "assessment")
})

test("evaluación supera neutral; vacío e inválidos son seguros y deterministas", () => {
  const assessment = getHorarilyCompanionMessage({ ...base, assessments: [{ title: "Prueba de Física", date: "2026-08-12" }] }, now)
  assert.equal(assessment.kind, "assessment")
  const invalid = { ...base, reminders: [{ title: "Rota", targetDateTime: "no-date" }], assessments: [{ title: "Rota", date: "??" }] }
  const first = getHorarilyCompanionMessage(invalid, now)
  assert.deepEqual(first, getHorarilyCompanionMessage(invalid, now))
  assert.equal(first.kind, "empty")
})

test("Dashboard mantiene Companion independiente del modo avanzado y lo suspende durante tutorial", async () => {
  const page = await readFile("app/page.tsx", "utf8")
  assert.match(page, /<HorarilyCompanion/)
  assert.match(page, /!activeTutorial\s*&&\s*<HorarilyCompanion/)
  assert.match(page, /advancedModeEnabled\s*&&[\s\S]{0,120}<HorarilySpeakingCard/)
})

test("contrato de densidad elimina controles y hero inflado del Dashboard", async () => {
  const dashboard = await readFile("components/dashboard/academic-dashboard.tsx", "utf8")
  assert.doesNotMatch(dashboard, /SemesterSwitcher/)
  assert.doesNotMatch(dashboard, /Revisa lo importante de hoy/)
  assert.doesNotMatch(dashboard, /Nueva tarea/)
  assert.doesNotMatch(dashboard, /min-h-20/)
  assert.doesNotMatch(dashboard, /min-h-32/)
  assert.match(dashboard, /grid-cols-2/)
})
