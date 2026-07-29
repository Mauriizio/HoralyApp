export function parseTime(value: string): { hour: number; minute: number } | null {
  const trimmed = value.trim()
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*([AaPp][Mm]))?$/)
  if (!match) return null

  const [, hRaw, mRaw, ampm] = match
  let hour = Number(hRaw)
  const minute = Number(mRaw)
  if (Number.isNaN(hour) || Number.isNaN(minute) || minute < 0 || minute > 59) return null

  if (ampm) {
    const isPM = ampm.toUpperCase() === "PM"
    hour = hour % 12
    if (isPM) hour += 12
  }
  if (hour < 0 || hour > 23) return null

  return { hour, minute }
}

export function formatTime(value: string, format: "12h" | "24h") {
  const parsed = parseTime(value)
  if (!parsed) return value

  if (format === "24h") {
    return `${String(parsed.hour).padStart(2, "0")}:${String(parsed.minute).padStart(2, "0")}`
  }

  const suffix = parsed.hour >= 12 ? "PM" : "AM"
  const normalized = parsed.hour % 12 || 12
  return `${normalized}:${String(parsed.minute).padStart(2, "0")} ${suffix}`
}

export function formatRelativeDuration(totalMinutes: number, locale: string = "es"): string {
  const minutes = Math.max(0, Math.floor(Number.isFinite(totalMinutes) ? totalMinutes : 0))
  if (minutes === 0) return locale.toLowerCase().startsWith("es") ? "ahora" : "now"

  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const remainingMinutes = minutes % 60
  const spanish = locale.toLowerCase().startsWith("es")
  const units = [
    days > 0 ? `${days} ${spanish ? (days === 1 ? "día" : "días") : (days === 1 ? "day" : "days")}` : "",
    hours > 0 ? `${hours} ${spanish ? (hours === 1 ? "hora" : "horas") : (hours === 1 ? "hour" : "hours")}` : "",
    remainingMinutes > 0
      ? `${remainingMinutes} ${spanish ? (remainingMinutes === 1 ? "minuto" : "minutos") : (remainingMinutes === 1 ? "minute" : "minutes")}`
      : "",
  ].filter(Boolean)

  if (units.length === 1) return units[0]
  const last = units.pop()
  return `${units.join(", ")} ${spanish ? "y" : "and"} ${last}`
}
