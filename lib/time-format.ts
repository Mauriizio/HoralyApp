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
