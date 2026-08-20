import test from "node:test"
import assert from "node:assert/strict"
import { getHorarilyCompanionMessages, weightUrgentCompanionMessages } from "../domain/horarily-companion.ts"
import { reminderToSupabaseRow, supabaseRowsToAppData } from "../lib/repositories/supabase-mappers.ts"

const now = new Date("2026-08-19T14:00:00.000Z")

test("feed único ordena, humaniza, deduplica y asigna acciones", () => {
  const messages = getHorarilyCompanionMessages({
    reminders: [
      { id: "over", title: "Informe vencido", targetDateTime: "2026-08-19T13:00:00.000Z", kind: "general", priority: "alta" },
      { id: "exam", title: "Prueba", subjectName: "Álgebra", targetDateTime: "2026-08-24T14:00:00.000Z", kind: "assessment", priority: "media" },
      { id: "work", title: "Taller Grupal N°1", targetDateTime: "2026-08-20T14:00:00.000Z", kind: "assignment", priority: "alta" },
      { id: "exam", title: "Duplicada", targetDateTime: "2026-08-24T14:00:00.000Z", kind: "assessment", priority: "media" },
    ],
    assessments: [],
    subjects: [{ id: "s1", name: "Electrotecnia II", requiresAttention: true }],
    classes: [
      { id: "current", subjectName: "Física", day: "miercoles", start: "09:30", end: "11:30" },
      { id: "next", subjectName: "Cálculo", day: "miercoles", start: "11:15", end: "12:15" },
    ],
  }, now)

  assert.equal(messages[0].kind, "overdue")
  assert.equal(new Set(messages.map((item) => item.key)).size, messages.length)
  assert.equal(messages.filter((item) => item.key === "reminder-assessments:2026-08-24").length, 1)
  assert.match(messages.find((item) => item.key === "reminder-assessments:2026-08-24")!.message, /5 días.*Prueba.*Álgebra.*14:00/)
  assert.equal(messages.find((item) => item.key === "reminder:work")!.action, "recordatorios")
  assert.ok(messages.every((item) => item.kind !== "attention"))
})

test("una urgencia reaparece entre mensajes sin congelar el repertorio", () => {
  const urgent = { key: "u", kind: "overdue" as const, message: "Urgente", urgent: true }
  const next = { key: "n", kind: "reminder" as const, message: "Siguiente" }
  const third = { key: "t", kind: "event" as const, message: "Tercero" }
  assert.deepEqual(weightUrgentCompanionMessages([urgent, next, third]).map((item) => item.key), ["u", "n", "t", "u"])
})

test("ReminderKind persiste en cloud y legacy vuelve como general", () => {
  const baseReminder = { id: "r1", semesterId: "s1", title: "Examen", priority: "media" as const, triggers: [], targetDateTime: now.toISOString(), createdAt: 1, notifiedTriggerIndexes: [] }
  assert.equal(reminderToSupabaseRow({ ...baseReminder, kind: "assessment" }, "00000000-0000-0000-0000-000000000001").reminder_kind, "assessment")
  const restored = supabaseRowsToAppData({ reminders: [{ ...reminderToSupabaseRow(baseReminder, "00000000-0000-0000-0000-000000000001"), reminder_kind: undefined }] })
  assert.equal(restored.reminders[0].kind, "general")
})

test("horizontes excluyen eventos demasiado lejanos y ticker admite máximo ocho", () => {
  const messages = getHorarilyCompanionMessages({
    reminders: [
      { id: "assessment-near", title: "Examen", targetDateTime: "2026-09-02T14:00:00.000Z", kind: "assessment" },
      { id: "assessment-far", title: "Examen lejano", targetDateTime: "2026-09-03T14:00:00.000Z", kind: "assessment" },
      { id: "event-far", title: "Seminario", targetDateTime: "2026-08-23T14:00:00.000Z", kind: "event" },
    ], assessments: [], subjects: [], classes: [],
  }, now)
  assert.ok(messages.some((item) => item.key === "reminder-assessments:2026-09-02"))
  assert.ok(!messages.some((item) => item.key === "reminder-assessments:2026-09-03"))
  assert.ok(!messages.some((item) => item.key === "reminder:event-far"))
  assert.ok(messages.length <= 8)
})
