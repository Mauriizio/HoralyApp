import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { buildAcademicAgenda, getZonedDateTimeParts, zonedTimeToDate } from "../domain/academic-agenda/index.ts"

const base = {
  semesterId: "sem-a",
  subjects: [{ id: "fis", name: "Física" }],
  reminders: [],
}

describe("fechas académicas deterministas por timezone", () => {
  it("convierte evaluaciones 08:00 en America/Santiago aunque equivalga a 12:00Z", () => {
    const instant = zonedTimeToDate("2026-06-02", "08:00", "America/Santiago")
    assert.ok(instant)
    assert.equal(instant!.toISOString(), "2026-06-02T12:00:00.000Z")
    assert.deepEqual(getZonedDateTimeParts(instant!, "America/Santiago"), { year: 2026, month: 6, day: 2, hour: 8, minute: 0, weekday: "martes" })
  })

  it("usa instantes distintos para el mismo wall-clock en Chile, Madrid y UTC", () => {
    const chile = zonedTimeToDate("2026-06-02", "08:00", "America/Santiago")!
    const madrid = zonedTimeToDate("2026-06-02", "08:00", "Europe/Madrid")!
    const utc = zonedTimeToDate("2026-06-02", "08:00", "UTC")!
    assert.equal(chile.toISOString(), "2026-06-02T12:00:00.000Z")
    assert.equal(madrid.toISOString(), "2026-06-02T06:00:00.000Z")
    assert.equal(utc.toISOString(), "2026-06-02T08:00:00.000Z")
    assert.notEqual(chile.getTime(), madrid.getTime())
    assert.notEqual(madrid.getTime(), utc.getTime())
  })

  it("respeta cambios de horario de verano y fallbacks deterministas", () => {
    assert.equal(zonedTimeToDate("2026-01-15", "08:00", "America/Santiago")!.toISOString(), "2026-01-15T11:00:00.000Z")
    assert.equal(zonedTimeToDate("2026-06-15", "08:00", "America/Santiago")!.toISOString(), "2026-06-15T12:00:00.000Z")
    assert.equal(zonedTimeToDate("2026-06-02", "08:00", "Zona/Invalida")!.toISOString(), "2026-06-02T08:00:00.000Z")
    assert.equal(zonedTimeToDate("2026-02-31", "08:00", "UTC"), null)
  })

  it("agenda usa timezone en evaluaciones, clases y estudio, y conserva ISO absoluto en recordatorios", () => {
    const reminderInstant = "2026-06-02T15:30:00.000Z"
    const agenda = buildAcademicAgenda({
      ...base,
      now: new Date("2026-06-01T12:00:00.000Z"),
      timezone: "America/Santiago",
      assessments: [{ id: "a1", semesterId: "sem-a", subjectId: "fis", groupId: "g", title: "Prueba", score: null, weightWithinGroup: 100, scheduledDate: "2026-06-02", status: "planned", createdAt: 1 }],
      classes: [{ id: "c1", semesterId: "sem-a", subjectId: "fis", day: "lunes", start: "09:00", end: "10:00", title: "Clase Física" }],
      studyBlocks: [{ id: "s1", semesterId: "sem-a", subjectId: "fis", title: "Estudio", day: "martes", start: "18:30" }],
      reminders: [{ id: "r1", semesterId: "sem-a", subjectId: "fis", title: "Recordatorio", targetDateTime: reminderInstant }],
    })
    assert.equal(agenda.next7Days.find((item) => item.id === "a1")?.startsAt.toISOString(), "2026-06-02T12:00:00.000Z")
    assert.equal(agenda.next7Days.find((item) => item.id === "c1")?.startsAt.toISOString(), "2026-06-01T13:00:00.000Z")
    assert.equal(agenda.next7Days.find((item) => item.id === "s1")?.startsAt.toISOString(), "2026-06-02T22:30:00.000Z")
    assert.equal(agenda.next7Days.find((item) => item.id === "r1")?.startsAt.toISOString(), reminderInstant)
  })
})
