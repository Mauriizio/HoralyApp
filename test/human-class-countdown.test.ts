import test from "node:test"
import assert from "node:assert/strict"
import {
  formatClassCountdown,
  getHorarilyCompanionMessages,
} from "../domain/horarily-companion.ts"

test("formatClassCountdown usa horas y minutos humanos con singular y plural", () => {
  const cases: Array<[number, string]> = [
    [1, "1 min"],
    [2, "2 min"],
    [59, "59 min"],
    [60, "1 hora"],
    [61, "1 hora y 1 min"],
    [90, "1 hora y 30 min"],
    [119, "1 hora y 59 min"],
    [120, "2 horas"],
    [121, "2 horas y 1 min"],
    [180, "3 horas"],
    [473, "7 horas y 53 min"],
  ]

  for (const [minutes, expected] of cases) {
    assert.equal(formatClassCountdown(minutes), expected)
  }
})

test("la próxima clase a +473 minutos usa tiempo humano", () => {
  const now = new Date(2026, 7, 17, 0, 0, 0, 0)
  const messages = getHorarilyCompanionMessages({
    reminders: [],
    assessments: [],
    subjects: [],
    classes: [{ id: "bases", subjectName: "BASES DE ELECTRÓNICA Y PROGRAMACIÓN", day: "lunes", start: "07:53", end: "08:53" }],
  }, now)

  const nextClass = messages.find((message) => message.kind === "next-class")
  assert.equal(nextClass?.message, "BASES DE ELECTRÓNICA Y PROGRAMACIÓN comienza en 7 horas y 53 min.")
  assert.doesNotMatch(nextClass?.message ?? "", /473 minutos/)
})

test("requiresAttention no genera mensajes automáticos", () => {
  const messages = getHorarilyCompanionMessages({
    reminders: [],
    assessments: [],
    subjects: [{ id: "algebra", name: "ÁLGEBRA Y TRIGONOMETRÍA", requiresAttention: true }],
    classes: [],
  }, new Date(2026, 7, 17, 0, 0, 0, 0))

  assert.ok(messages.every((message) => message.kind !== "attention"))
  assert.ok(messages.every((message) => !/necesita(?: un poco de)? atención/i.test(message.message)))
})
