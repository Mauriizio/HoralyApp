import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import {
  getHorarilyCompanionMessages,
  getUpcomingReminderAssessments,
} from "../domain/horarily-companion.ts"
import { getHorarilyDailyMotivation } from "../domain/horarily-motivation.ts"
import { ACADEMIC_TICKER_SPEED } from "../domain/academic-ticker-scroll.ts"

const empty = { assessments: [], subjects: [], classes: [] }

test("regresión: evaluación a 19 días sigue siendo la prioridad académica", () => {
  const now = new Date("2026-08-20T09:00:00.000Z")
  const messages = getHorarilyCompanionMessages({
    ...empty,
    timezone: "America/Santiago",
    reminders: [{ id: "exam", kind: "assessment", title: "Taller Grupal N°1", subjectName: "ÁLGEBRA Y TRIGONOMETRÍA", targetDateTime: "2026-09-08T08:00:00.000Z" }],
  }, now)
  assert.equal(messages[0].key, "reminder-assessments:2026-09-08")
  assert.match(messages[0].message, /Taller Grupal N°1.*ÁLGEBRA Y TRIGONOMETRÍA.*8 de septiembre.*05:00/)
})

test("getUpcomingReminderAssessments filtra, normaliza y ordena evaluaciones futuras", () => {
  const now = new Date("2026-08-20T09:00:00.000Z")
  const result = getUpcomingReminderAssessments([
    { id: "general", kind: "general", title: "Otro", targetDateTime: "2026-08-21T09:00:00.000Z" },
    { id: "past", kind: "assessment", title: "Pasada", targetDateTime: "2026-08-19T09:00:00.000Z" },
    { id: "later", kind: "assessment", title: "Segunda", targetDateTime: "2026-09-08T08:00:00.000Z" },
    { id: "first", kind: "assessment", title: "Primera", targetDateTime: "2026-09-01T08:00:00.000Z" },
  ], now, "America/Santiago")
  assert.deepEqual(result.map((item) => item.id), ["first", "later"])
  assert.equal(result[0].localDate, "2026-09-01")
})

test("copy usa una semana exactamente a siete días", () => {
  const messages = getHorarilyCompanionMessages({
    ...empty,
    timezone: "America/Santiago",
    reminders: [{ id: "exam", kind: "assessment", title: "Taller Grupal N°1", subjectName: "Álgebra", targetDateTime: "2026-09-08T08:00:00.000Z" }],
  }, new Date("2026-09-01T08:00:00.000Z"))
  assert.match(messages[0].message, /^En una semana tienes Taller Grupal N°1 de Álgebra a las 05:00\.$/)
  assert.doesNotMatch(messages[0].message, /7 días/)
})

test("agrupa dos evaluaciones de la misma fecha local", () => {
  const messages = getHorarilyCompanionMessages({
    ...empty,
    timezone: "America/Santiago",
    reminders: [
      { id: "math", kind: "assessment", title: "Examen de Álgebra", subjectName: "Álgebra", targetDateTime: "2026-09-08T12:00:00.000Z" },
      { id: "physics", kind: "assessment", title: "Examen de Física", subjectName: "Física", targetDateTime: "2026-09-08T17:00:00.000Z" },
    ],
  }, new Date("2026-09-01T08:00:00.000Z"))
  const grouped = messages[0]
  assert.match(grouped.message, /2 evaluaciones.*Álgebra.*09:00.*Física.*14:00/)
  assert.match(grouped.tickerMessage!, /Álgebra 09:00 \+ Física 14:00.*8 sep/)
  assert.equal(grouped.tickerLabel, "EVALUACIONES")
  assert.equal(grouped.action, "recordatorios")
  assert.equal(grouped.actionLabel, "Ver evaluaciones")
})

test("tres evaluaciones se enumeran y cuatro se resumen", () => {
  const now = new Date("2026-09-01T08:00:00.000Z")
  const make = (count: number) => getHorarilyCompanionMessages({
    ...empty, timezone: "America/Santiago",
    reminders: ["Álgebra", "Física", "Electrotecnia", "Programación"].slice(0, count).map((subjectName, index) => ({ id: `${count}-${index}`, kind: "assessment" as const, title: `Control ${index + 1}`, subjectName, targetDateTime: `2026-09-02T${String(12 + index * 3).padStart(2, "0")}:00:00.000Z` })),
  }, now)[0]
  assert.match(make(3).message, /3 evaluaciones:.*Álgebra.*Física.*y Electrotecnia/)
  assert.match(make(4).message, /4 evaluaciones\. La primera es Álgebra/)
})

test("Reminder assessment deduplica el Grade equivalente y conserva Recordatorios", () => {
  const messages = getHorarilyCompanionMessages({
    timezone: "America/Santiago", subjects: [], classes: [],
    reminders: [{ id: "reminder", kind: "assessment", title: "Examen de Física", subjectName: "Física", targetDateTime: "2026-09-08T12:00:00.000Z" }],
    assessments: [{ id: "grade", title: "Examen de Física", subjectName: "Física", date: "2026-09-08" }],
  }, new Date("2026-09-01T08:00:00.000Z"))
  assert.equal(messages.filter((item) => item.kind === "assessment").length, 1)
  assert.equal(messages[0].action, "recordatorios")
})

test("evaluación lejana ordena antes de próxima clase, entrega y resumen", () => {
  const now = new Date(2026, 7, 20, 10, 0, 0, 0)
  const messages = getHorarilyCompanionMessages({
    ...empty,
    reminders: [
      { id: "exam", kind: "assessment", title: "Prueba", subjectName: "Física", targetDateTime: new Date(2026, 8, 8, 5).toISOString() },
      { id: "work", kind: "assignment", title: "Informe", targetDateTime: new Date(2026, 7, 23, 18).toISOString() },
    ],
    classes: Array.from({ length: 5 }, (_, index) => ({ id: `c${index}`, subjectName: `Clase ${index + 1}`, day: "jueves" as const, start: `${13 + index}:00`, end: `${13 + index}:45` })),
  }, now)
  assert.equal(messages[0].kind, "assessment")
  assert.equal(messages[1].kind, "next-class")
  assert.ok(messages.findIndex((item) => item.kind === "assignment") > 1)
})

test("sin evaluaciones no inventa placeholders", () => {
  const messages = getHorarilyCompanionMessages({ ...empty, reminders: [], classes: [{ subjectName: "Física", day: "jueves", start: "13:00", end: "14:00" }] }, new Date(2026, 7, 20, 10))
  assert.ok(messages.every((item) => item.kind !== "assessment"))
  assert.ok(messages.every((item) => !/sin evaluaciones|no tienes evaluaciones|todo al día/i.test(item.message)))
})

test("motivación es estable por día, cambia otro día y no tiene acción", () => {
  const first = getHorarilyDailyMotivation(new Date("2026-08-20T01:00:00.000Z"))
  const sameDay = getHorarilyDailyMotivation(new Date("2026-08-20T22:00:00.000Z"))
  const nextDay = getHorarilyDailyMotivation(new Date("2026-08-21T12:00:00.000Z"))
  assert.deepEqual(first, sameDay)
  assert.notEqual(first.message, nextDay.message)
  assert.equal(first.kind, "motivation")
  assert.equal(first.action, undefined)
})

test("page envía motivación solo al Companion y conserva assessment primero", async () => {
  const page = await readFile("app/page.tsx", "utf8")
  assert.match(page, /ticker={<AcademicTicker messages={academicMessages}/)
  assert.match(page, /HorarilyCompanion messages={companionMessages}/)
  assert.match(page, /\[\.\.\.academicMessages, getHorarilyDailyMotivation\(now\)\]/)
})

test("ticker V3 no tiene controles persistentes y usa interacción de banda completa", async () => {
  const ticker = await readFile("components/academic/academic-ticker.tsx", "utf8")
  assert.doesNotMatch(ticker, /ChevronLeft|ChevronRight|Pause|Play/)
  assert.doesNotMatch(ticker, /Controles de noticias académicas|isPausedByUser|moveTo/)
  assert.match(ticker, /onPointerDown/)
  assert.match(ticker, /onPointerUp/)
  assert.match(ticker, /onPointerCancel/)
  assert.match(ticker, /onTouchStart/)
  assert.match(ticker, /onTouchEnd/)
  assert.match(ticker, /isTouching\.current = false/)
  assert.equal(ACADEMIC_TICKER_SPEED, 40)
})

test("Companion declara 5s, tipografía mayor, navegación y scroll fijo", async () => {
  const companion = await readFile("components/horarily/horarily-companion.tsx", "utf8")
  assert.match(companion, /intervalMs:\s*5_000/)
  assert.match(companion, /text-\[13px\]/)
  assert.match(companion, /sm:text-sm/)
  assert.match(companion, /overflow-y-auto/)
  assert.match(companion, /ChevronLeft/)
  assert.match(companion, /ChevronRight/)
})
