export type LocalDateAndTime = { date: string; time: string }

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/

function parts(date: Date, timezone: string): LocalDateAndTime {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date).map((part) => [part.type, part.value]))
  return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}` }
}

export function browserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
}

export function isoToLocalDateAndTime(iso: string, timezone = browserTimezone()): LocalDateAndTime {
  const value = new Date(iso)
  if (Number.isNaN(value.getTime())) throw new Error("Fecha persistida inválida.")
  return parts(value, timezone)
}

export function localDateAndTimeToIso(date: string, time: string, timezone = browserTimezone()) {
  const dateMatch = DATE.exec(date)
  const timeMatch = TIME.exec(time)
  if (!dateMatch || !timeMatch) throw new Error("Fecha u hora inválida.")
  const [year, month, day] = dateMatch.slice(1).map(Number)
  const check = new Date(Date.UTC(year, month - 1, day))
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) throw new Error("Fecha inválida.")

  const desired = `${date}T${time}`
  const center = Date.UTC(year, month - 1, day, Number(timeMatch[1]), Number(timeMatch[2]))
  // Searching around the UTC-shaped value handles offsets, DST gaps and repeated hours deterministically.
  for (let delta = -14 * 60; delta <= 14 * 60; delta += 15) {
    const candidate = new Date(center + delta * 60_000)
    const local = parts(candidate, timezone)
    if (`${local.date}T${local.time}` === desired) return candidate.toISOString()
  }
  throw new Error("La fecha u hora no existe en la zona horaria seleccionada.")
}

export function defaultLocalDateAndTime(timezone = browserTimezone()): LocalDateAndTime {
  const next = new Date(Date.now() + 60 * 60_000)
  next.setMinutes(0, 0, 0)
  return parts(next, timezone)
}

export function validateReminderDateTimes(input: {
  eventDate: string; eventTime: string; customDate?: string; customTime?: string; timezone?: string
}): { ok: true; targetDateTime: string; customDateTime?: string } | { ok: false; error: string } {
  try {
    const targetDateTime = localDateAndTimeToIso(input.eventDate, input.eventTime, input.timezone)
    if (input.customDate === undefined && input.customTime === undefined) return { ok: true, targetDateTime }
    const customDateTime = localDateAndTimeToIso(input.customDate ?? "", input.customTime ?? "", input.timezone)
    if (new Date(customDateTime) >= new Date(targetDateTime)) return { ok: false, error: "El aviso personalizado debe ser anterior al evento." }
    return { ok: true, targetDateTime, customDateTime }
  } catch {
    return { ok: false, error: "Ingresa una fecha y hora válidas." }
  }
}
