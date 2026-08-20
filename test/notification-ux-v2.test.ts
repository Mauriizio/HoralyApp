import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import {
  formatAcademicEventDate,
  getHorarilyCompanionMessages,
  weightUrgentCompanionMessages,
} from "../domain/horarily-companion.ts"
import {
  ACADEMIC_TICKER_SPEED,
  advanceAcademicTicker,
  academicTickerDragOffset,
  isAcademicTickerDrag,
} from "../domain/academic-ticker-scroll.ts"

const now = new Date("2026-09-03T12:00:00.000Z")

test("formatAcademicEventDate humaniza hoy, mañana y fecha en la zona configurada", () => {
  assert.equal(formatAcademicEventDate(new Date("2026-09-03T09:00:00.000Z"), now, "America/Santiago"), "hoy a las 05:00")
  assert.equal(formatAcademicEventDate(new Date("2026-09-04T09:30:00.000Z"), now, "America/Santiago"), "mañana a las 05:30")
  assert.equal(formatAcademicEventDate(new Date("2026-09-08T08:00:00.000Z"), now, "America/Santiago"), "8 de septiembre a las 05:00")
})

test("reminder assessment conserva título, materia, fecha, ticker y acción", () => {
  const messages = getHorarilyCompanionMessages({
    timezone: "America/Santiago",
    reminders: [{ id: "exam", kind: "assessment", title: "Taller Grupal N°1", subjectName: "ÁLGEBRA Y TRIGONOMETRÍA", targetDateTime: "2026-09-08T08:00:00.000Z" }],
    assessments: [], subjects: [], classes: [],
  }, now)
  const assessment = messages.find((item) => item.key === "reminder-assessments:2026-09-08")!
  assert.equal(assessment.kind, "assessment")
  assert.match(assessment.message, /5 días.*Taller Grupal N°1.*ÁLGEBRA Y TRIGONOMETRÍA.*05:00/)
  assert.match(assessment.tickerMessage!, /ÁLGEBRA Y TRIGONOMETRÍA.*Taller Grupal N°1.*8 sep.*05:00/)
  assert.equal(assessment.action, "recordatorios")
  assert.equal(assessment.actionLabel, "Ver evaluación")
})

test("copy de evaluación diferencia hoy y mañana sin perder hora, título ni materia", () => {
  const data = { timezone: "America/Santiago", assessments: [], subjects: [], classes: [] }
  const today = getHorarilyCompanionMessages({ ...data, reminders: [{ id: "today", kind: "assessment", title: "Control 1", subjectName: "Física", targetDateTime: "2026-09-03T15:30:00.000Z" }] }, now)[0]
  const tomorrow = getHorarilyCompanionMessages({ ...data, reminders: [{ id: "tomorrow", kind: "assessment", title: "Taller Grupal N°1", subjectName: "Álgebra", targetDateTime: "2026-09-04T09:00:00.000Z" }] }, now)[0]
  assert.equal(today.message, "Hoy tienes Control 1 de Física a las 11:30.")
  assert.equal(tomorrow.message, "Mañana tienes Taller Grupal N°1 de Álgebra a las 05:00.")
})

test("la evaluación futura más próxima no sale del límite de ocho", () => {
  const reminders: Array<{ id: string; title: string; subjectName?: string; targetDateTime: string; kind: "general" | "assessment"; priority: "alta" | "media" }> = Array.from({ length: 9 }, (_, index) => ({ id: `r${index}`, title: `Pendiente ${index}`, targetDateTime: `2026-09-04T${String(13 + index).padStart(2, "0")}:00:00.000Z`, kind: "general", priority: "alta" }))
  reminders.push({ id: "exam", title: "Taller Grupal N°1", subjectName: "ÁLGEBRA Y TRIGONOMETRÍA", targetDateTime: "2026-09-08T08:00:00.000Z", kind: "assessment", priority: "media" })
  const messages = getHorarilyCompanionMessages({ timezone: "America/Santiago", reminders, assessments: [], subjects: [], classes: [] }, now)
  assert.equal(messages.length, 8)
  assert.ok(messages.some((item) => item.key === "reminder-assessments:2026-09-08"))
})

test("una evaluación dentro de 24 horas es urgente", () => {
  const [assessment] = getHorarilyCompanionMessages({
    reminders: [{ id: "exam", title: "Prueba", subjectName: "Física", targetDateTime: "2026-09-04T11:59:00.000Z", kind: "assessment" }],
    assessments: [], subjects: [], classes: [],
  }, now)
  assert.equal(assessment.urgent, true)
})

test("una evaluación vencida conserva título, materia, fecha y acción", () => {
  const [assessment] = getHorarilyCompanionMessages({
    timezone: "America/Santiago",
    reminders: [{ id: "exam", title: "Control 1", subjectName: "Física", targetDateTime: "2026-09-02T09:00:00.000Z", kind: "assessment" }],
    assessments: [], subjects: [], classes: [],
  }, now)
  assert.equal(assessment.kind, "overdue")
  assert.match(assessment.message, /Control 1.*Física.*2 de septiembre.*05:00/)
  assert.equal(assessment.actionLabel, "Ver evaluación")
})

test("weighting limita la urgencia a dos apariciones por ciclo", () => {
  const urgent = { key: "u", kind: "overdue" as const, message: "Urgente", urgent: true }
  const rest = ["a", "b", "c", "d"].map((key) => ({ key, kind: "reminder" as const, message: key }))
  const weighted = weightUrgentCompanionMessages([urgent, ...rest])
  assert.deepEqual(weighted.map((item) => item.key), ["u", "a", "b", "u", "c", "d"])
  assert.equal(weighted.filter((item) => item.key === "u").length, 2)
})

test("modelo puro del ticker mantiene 40 px/s, loop y umbral de drag", () => {
  assert.equal(ACADEMIC_TICKER_SPEED, 40)
  assert.equal(advanceAcademicTicker(10, 1_000, 100), 50)
  assert.equal(advanceAcademicTicker(90, 1_000, 100), 30)
  assert.equal(isAcademicTickerDrag(5), false)
  assert.equal(isAcademicTickerDrag(6), true)
  assert.equal(academicTickerDragOffset(40, 10, 100), 130)
})

test("shell, ticker sin controles, companion y formulario declaran contratos vigentes", async () => {
  const [shell, ticker, companion, form] = await Promise.all([
    readFile("components/app-shell/app-shell.tsx", "utf8"),
    readFile("components/academic/academic-ticker.tsx", "utf8"),
    readFile("components/horarily/horarily-companion.tsx", "utf8"),
    readFile("components/reminder-form.tsx", "utf8"),
  ])
  assert.match(shell, /sticky top-0/)
  assert.match(ticker, /requestAnimationFrame/)
  assert.doesNotMatch(ticker, /Pausar noticias académicas|Reanudar noticias académicas/)
  assert.doesNotMatch(ticker, /ChevronLeft|ChevronRight|Pause|Play/)
  assert.match(companion, /data-testid="horarily-message-card"/)
  assert.match(companion, /overflow-y-auto/)
  assert.match(companion, /ChevronLeft/)
  assert.match(companion, /ChevronRight/)
  assert.match(form, /sm:max-w-xl/)
  assert.match(form, /min-w-0/)
  assert.match(form, /truncate/)
})
