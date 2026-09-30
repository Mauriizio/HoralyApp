import type { Reminder } from "../lib/types.ts"

export const EXPIRED_REMINDER_RETENTION_DAYS = 15
export const EXPIRED_REMINDER_RETENTION_MS = EXPIRED_REMINDER_RETENTION_DAYS * 24 * 60 * 60 * 1_000

export type ReminderLifecycle = "upcoming" | "expired" | "stale" | "invalid"

export function getReminderLifecycle(reminder: Pick<Reminder, "targetDateTime">, now = new Date()): ReminderLifecycle {
  const target = new Date(reminder.targetDateTime)
  if (Number.isNaN(target.getTime())) return "invalid"

  const age = now.getTime() - target.getTime()
  if (age <= 0) return "upcoming"
  if (age < EXPIRED_REMINDER_RETENTION_MS) return "expired"
  return "stale"
}

export function splitRemindersByLifecycle(reminders: Reminder[], now = new Date()) {
  const upcoming: Reminder[] = []
  const expired: Reminder[] = []
  const stale: Reminder[] = []
  const invalid: Reminder[] = []

  for (const reminder of reminders) {
    const lifecycle = getReminderLifecycle(reminder, now)
    if (lifecycle === "upcoming") upcoming.push(reminder)
    else if (lifecycle === "expired") expired.push(reminder)
    else if (lifecycle === "stale") stale.push(reminder)
    else invalid.push(reminder)
  }

  upcoming.sort((a, b) => new Date(a.targetDateTime).getTime() - new Date(b.targetDateTime).getTime())
  expired.sort((a, b) => new Date(b.targetDateTime).getTime() - new Date(a.targetDateTime).getTime())

  return { upcoming, expired, stale, invalid }
}

export function formatExpiredAge(targetDateTime: string, now = new Date()) {
  const target = new Date(targetDateTime)
  if (Number.isNaN(target.getTime())) return "Fecha inválida"
  const elapsed = Math.max(0, now.getTime() - target.getTime())
  const days = Math.max(1, Math.floor(elapsed / (24 * 60 * 60 * 1_000)))
  return days === 1 ? "Vencido hace 1 día" : `Vencido hace ${days} días`
}
