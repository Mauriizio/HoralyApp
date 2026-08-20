import test from "node:test"
import assert from "node:assert/strict"
import {
  isoToLocalDateAndTime,
  localDateAndTimeToIso,
  validateReminderDateTimes,
} from "../domain/reminder-datetime.ts"

test("roundtrip conserva 05:00 y 05:30 en America/Santiago", () => {
  for (const time of ["05:00", "05:30"]) {
    const iso = localDateAndTimeToIso("2026-09-08", time, "America/Santiago")
    assert.deepEqual(isoToLocalDateAndTime(iso, "America/Santiago"), {
      date: "2026-09-08",
      time,
    })
  }
})

test("la conversión representa el instante correcto en zonas distintas", () => {
  assert.equal(
    localDateAndTimeToIso("2026-09-08", "05:00", "America/Santiago"),
    "2026-09-08T08:00:00.000Z",
  )
  assert.equal(
    localDateAndTimeToIso("2026-09-08", "05:00", "Europe/Madrid"),
    "2026-09-08T03:00:00.000Z",
  )
})

test("DST inválido y entradas fuera de rango se rechazan", () => {
  assert.throws(() => localDateAndTimeToIso("2026-03-29", "02:30", "Europe/Madrid"))
  assert.throws(() => localDateAndTimeToIso("2026-09-08", "24:00", "America/Santiago"))
  assert.throws(() => localDateAndTimeToIso("2026-02-30", "05:00", "America/Santiago"))
})

test("el aviso personalizado debe ser anterior al evento", () => {
  assert.deepEqual(validateReminderDateTimes({
    eventDate: "2026-09-08", eventTime: "05:00",
    customDate: "2026-09-08", customTime: "05:00",
    timezone: "America/Santiago",
  }), { ok: false, error: "El aviso personalizado debe ser anterior al evento." })
})
