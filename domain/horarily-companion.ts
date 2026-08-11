import type { DayKey } from "../lib/types.ts"

export type HorarilyCompanionMessage = {
  kind: "overdue" | "current-class" | "next-class" | "reminder" | "assessment" | "attention" | "day-summary" | "empty"
  message: string
  action?: "horario" | "recordatorios" | "notas" | "materias"
}

export type HorarilyCompanionData = {
  reminders: Array<{ title: string; targetDateTime: string }>
  assessments: Array<{ title: string; date: string; score?: number | null; status?: string }>
  subjects: Array<{ name: string; requiresAttention?: boolean }>
  classes: Array<{ subjectName: string; day: DayKey; start: string; end: string }>
}

const DAYS: DayKey[] = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"]
const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

function atTime(now: Date, value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const result = new Date(now)
  result.setHours(Number(match[1]), Number(match[2]), 0, 0)
  return Number.isNaN(result.getTime()) ? null : result
}

function assessmentDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const result = new Date(`${value}T12:00:00`)
  return Number.isNaN(result.getTime()) ? null : result
}

export function getHorarilyCompanionMessage(data: HorarilyCompanionData, now: Date): HorarilyCompanionMessage {
  const validReminders = data.reminders
    .map((item) => ({ item, date: new Date(item.targetDateTime) }))
    .filter(({ date }) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
  const overdue = validReminders.find(({ date }) => date.getTime() < now.getTime())
  if (overdue) return { kind: "overdue", message: `Tienes pendiente: ${overdue.item.title}.`, action: "recordatorios" }

  const today = DAYS[now.getDay()]
  const todayClasses = data.classes
    .filter((item) => item.day === today)
    .map((item) => ({ item, start: atTime(now, item.start), end: atTime(now, item.end) }))
    .filter((item): item is typeof item & { start: Date; end: Date } => Boolean(item.start && item.end))
    .sort((a, b) => a.start.getTime() - b.start.getTime())
  const current = todayClasses.find(({ start, end }) => start <= now && now < end)
  if (current) return { kind: "current-class", message: `Estás en ${current.item.subjectName} hasta las ${current.item.end}.`, action: "horario" }
  const next = todayClasses.find(({ start }) => start > now)
  if (next) {
    const minutes = Math.max(1, Math.round((next.start.getTime() - now.getTime()) / MINUTE))
    return { kind: "next-class", message: `Tu próxima clase es ${next.item.subjectName} a las ${next.item.start}. Faltan ${minutes} minutos.`, action: "horario" }
  }

  const reminder = validReminders.find(({ date }) => date.getTime() >= now.getTime() && date.getTime() - now.getTime() <= DAY)
  if (reminder) return { kind: "reminder", message: `Tienes ${reminder.item.title} pendiente para hoy.`, action: "recordatorios" }

  const assessment = data.assessments
    .filter((item) => item.score == null && item.status !== "graded")
    .map((item) => ({ item, date: assessmentDate(item.date) }))
    .filter((item): item is typeof item & { date: Date } => Boolean(item.date && item.date >= now))
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0]
  if (assessment && assessment.date.getTime() - now.getTime() <= 2 * DAY) {
    const isTomorrow = assessment.date.toDateString() !== now.toDateString()
    return { kind: "assessment", message: `Tienes ${assessment.item.title} ${isTomorrow ? "mañana" : "hoy"}.`, action: "notas" }
  }

  const attention = data.subjects.find((subject) => subject.requiresAttention)
  if (attention) return { kind: "attention", message: `${attention.name} necesita un poco de atención.`, action: "materias" }
  if (todayClasses.length > 0) return { kind: "day-summary", message: `Hoy tienes ${todayClasses.length} clases. La primera comienza a las ${todayClasses[0].item.start}.`, action: "horario" }
  return { kind: "empty", message: "Agrega tu horario para que pueda avisarte cuál es tu próxima clase.", action: "horario" }
}
