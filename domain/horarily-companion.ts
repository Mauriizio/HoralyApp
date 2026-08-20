import type { DayKey, ReminderKind, ReminderPriority } from "../lib/types.ts"

export type HorarilyCompanionMessage = {
  key: string
  kind: "overdue" | "current-class" | "next-class" | "reminder" | "assessment" | "assignment" | "event" | "attention" | "day-summary" | "empty"
  message: string
  tickerMessage?: string
  action?: "horario" | "recordatorios" | "notas" | "materias"
  actionLabel?: string
  urgent?: boolean
}

export type HorarilyCompanionData = {
  timezone?: string
  reminders: Array<{ id?: string; title: string; subjectName?: string; targetDateTime: string; kind?: ReminderKind; priority?: ReminderPriority }>
  assessments: Array<{ id?: string; title: string; date: string; score?: number | null; status?: string }>
  subjects: Array<{ id?: string; name: string; requiresAttention?: boolean }>
  classes: Array<{ id?: string; subjectName: string; day: DayKey; start: string; end: string }>
}

export const LIVE_FEED_HORIZONS_MS: Record<ReminderKind, number> = {
  assessment: 14 * 86_400_000, assignment: 7 * 86_400_000, event: 3 * 86_400_000, general: 2 * 86_400_000,
}
const DAYS: DayKey[] = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"]
const MINUTE = 60_000
const DAY = 86_400_000

export function formatClassCountdown(totalMinutes: number) {
  const minutes = Math.max(1, Math.round(totalMinutes))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  const hoursText = `${hours} ${hours === 1 ? "hora" : "horas"}`
  return remainingMinutes === 0 ? hoursText : `${hoursText} y ${remainingMinutes} min`
}

function safeTimezone(timezone?: string) {
  const fallback = "UTC"
  if (!timezone) return fallback
  try { new Intl.DateTimeFormat("es-CL", { timeZone: timezone }).format(new Date(0)); return timezone } catch { return fallback }
}

function zonedParts(date: Date, timezone?: string) {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTimezone(timezone), year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date).map((part) => [part.type, part.value]))
  return { date: `${values.year}-${values.month}-${values.day}`, hour: values.hour, minute: values.minute }
}

function localDayNumber(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return Date.UTC(year, month - 1, day) / DAY
}

export function formatAcademicEventDate(date: Date, now: Date, timezone = "UTC") {
  const target = zonedParts(date, timezone)
  const today = zonedParts(now, timezone)
  const dayDifference = localDayNumber(target.date) - localDayNumber(today.date)
  const time = `${target.hour}:${target.minute}`
  if (dayDifference === 0) return `hoy a las ${time}`
  if (dayDifference === 1) return `mañana a las ${time}`
  const dateText = new Intl.DateTimeFormat("es-CL", { timeZone: safeTimezone(timezone), day: "numeric", month: "long" }).format(date)
  return `${dateText} a las ${time}`
}

function compactAcademicEventDate(date: Date, now: Date, timezone?: string) {
  const target = zonedParts(date, timezone)
  const today = zonedParts(now, timezone)
  const dayDifference = localDayNumber(target.date) - localDayNumber(today.date)
  const time = `${target.hour}:${target.minute}`
  if (dayDifference === 0) return `hoy · ${time}`
  if (dayDifference === 1) return `mañana · ${time}`
  const dayMonth = new Intl.DateTimeFormat("es-CL", { timeZone: safeTimezone(timezone), day: "numeric", month: "short" }).format(date).replace(".", "")
  return `${dayMonth} · ${time}`
}

function assessmentCopy(title: string, subjectName: string | undefined, date: Date, now: Date, timezone?: string) {
  const subject = subjectName ? ` de ${subjectName}` : ""
  const humanDate = formatAcademicEventDate(date, now, timezone)
  if (humanDate.startsWith("hoy a las ")) return `Evaluación hoy a las ${humanDate.slice("hoy a las ".length)}: ${title}${subject}.`
  if (humanDate.startsWith("mañana a las ")) return `Evaluación mañana: ${title}${subject} a las ${humanDate.slice("mañana a las ".length)}.`
  return `Próxima evaluación: ${title}${subject}, el ${humanDate}.`
}

function atTime(now: Date, value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const result = new Date(now); result.setHours(Number(match[1]), Number(match[2]), 0, 0)
  return Number.isNaN(result.getTime()) ? null : result
}
function humanDistance(ms: number) {
  const days = Math.ceil(ms / DAY)
  if (days <= 0) return "hoy"
  if (days === 1) return "mañana"
  return `en ${days} días`
}

export function getHorarilyCompanionMessages(data: HorarilyCompanionData, now: Date): HorarilyCompanionMessage[] {
  const ranked: Array<HorarilyCompanionMessage & { rank: number; time: number }> = []
  const seen = new Set<string>()
  const add = (item: HorarilyCompanionMessage & { rank: number; time: number }) => { if (!seen.has(item.key)) { seen.add(item.key); ranked.push(item) } }
  let nearestFutureReminderAssessmentKey: string | undefined
  let nearestFutureReminderAssessmentTime = Number.POSITIVE_INFINITY

  for (const reminder of data.reminders) {
    const date = new Date(reminder.targetDateTime)
    if (Number.isNaN(date.getTime())) continue
    const key = `reminder:${reminder.id ?? `${reminder.title}:${reminder.targetDateTime}`}`
    const distance = date.getTime() - now.getTime()
    const kind = reminder.kind ?? "general"
    if (distance < 0) {
      const overdueSubject = reminder.subjectName ? ` de ${reminder.subjectName}` : ""
      const overdueMessage = kind === "assessment"
        ? `Evaluación vencida: ${reminder.title}${overdueSubject}, el ${formatAcademicEventDate(date, now, data.timezone)}.`
        : `Tienes pendiente: ${reminder.title}.`
      add({
        key, kind: "overdue", message: overdueMessage,
        tickerMessage: kind === "assessment" ? `${reminder.subjectName ?? "EVALUACIÓN"} · ${reminder.title} · ${compactAcademicEventDate(date, now, data.timezone)}` : reminder.title,
        action: "recordatorios", actionLabel: kind === "assessment" ? "Ver evaluación" : kind === "assignment" ? "Ver entrega" : "Ver pendiente",
        urgent: true, rank: 1, time: date.getTime(),
      })
      continue
    }
    if (distance > LIVE_FEED_HORIZONS_MS[kind]) continue
    if (kind === "assessment" && date.getTime() < nearestFutureReminderAssessmentTime) {
      nearestFutureReminderAssessmentKey = key
      nearestFutureReminderAssessmentTime = date.getTime()
    }
    if (kind === "assessment") {
      add({
        key, kind, message: assessmentCopy(reminder.title, reminder.subjectName, date, now, data.timezone),
        tickerMessage: `${reminder.subjectName ?? "EVALUACIÓN"} · ${reminder.title} · ${compactAcademicEventDate(date, now, data.timezone)}`,
        action: "recordatorios", actionLabel: "Ver evaluación", urgent: distance <= DAY,
        rank: distance <= DAY ? 3 : 5, time: date.getTime(),
      })
      continue
    }
    const message = `${reminder.title} vence ${humanDistance(distance)} a las ${zonedParts(date, data.timezone).hour}:${zonedParts(date, data.timezone).minute}.`
    const rank = kind === "assignment" ? 6 : kind === "event" ? 8 : reminder.priority === "alta" ? 7 : 8
    add({ key, kind: kind === "general" ? "reminder" : kind, message, tickerMessage: `${reminder.title} · ${compactAcademicEventDate(date, now, data.timezone)}`, action: "recordatorios", actionLabel: kind === "assignment" ? "Ver entrega" : kind === "event" ? "Ver evento" : "Ver pendiente", urgent: distance <= 6 * 60 * MINUTE, rank, time: date.getTime() })
  }
  for (const assessment of data.assessments.filter((item) => item.score == null && item.status !== "graded")) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(assessment.date)) continue
    const date = new Date(`${assessment.date}T12:00:00`)
    const distance = date.getTime() - now.getTime()
    if (Number.isNaN(date.getTime()) || distance < 0 || distance > LIVE_FEED_HORIZONS_MS.assessment) continue
    add({ key: `assessment:${assessment.id ?? `${assessment.title}:${assessment.date}`}`, kind: "assessment", message: `${assessment.title} ${humanDistance(distance)}.`, tickerMessage: `${assessment.title} · ${compactAcademicEventDate(date, now, data.timezone)}`, action: "notas", actionLabel: "Ver notas", urgent: distance <= DAY, rank: distance <= DAY ? 3 : 5, time: date.getTime() })
  }
  const today = DAYS[now.getDay()]
  const classes = data.classes.filter((item) => item.day === today).map((item) => ({ item, start: atTime(now, item.start), end: atTime(now, item.end) })).filter((x): x is typeof x & { start: Date; end: Date } => Boolean(x.start && x.end)).sort((a,b) => a.start.getTime()-b.start.getTime())
  const current = classes.find(({start,end}) => start <= now && now < end)
  if (current) add({ key: `class:${current.item.id ?? `${today}:${current.item.subjectName}:${current.item.start}`}`, kind: "current-class", message: `Estás en ${current.item.subjectName} hasta las ${current.item.end}.`, tickerMessage: `${current.item.subjectName} hasta las ${current.item.end}`, action: "horario", actionLabel: "Ver horario", rank: 2, time: current.start.getTime() })
  const next = classes.find(({start}) => start > now)
  if (next) add({ key: `class:${next.item.id ?? `${today}:${next.item.subjectName}:${next.item.start}`}`, kind: "next-class", message: `${next.item.subjectName} comienza en ${formatClassCountdown((next.start.getTime()-now.getTime())/MINUTE)}.`, action: "horario", actionLabel: "Ver horario", rank: 4, time: next.start.getTime() })
  if (classes.length) add({ key: `summary:${now.toISOString().slice(0,10)}`, kind: "day-summary", message: `Hoy tienes ${classes.length} ${classes.length === 1 ? "clase" : "clases"}.`, action: "horario", actionLabel: "Ver horario", rank: 9, time: Number.MAX_SAFE_INTEGER })
  ranked.sort((a,b) => a.rank-b.rank || a.time-b.time || a.key.localeCompare(b.key))
  const limited = ranked.slice(0, 8)
  if (nearestFutureReminderAssessmentKey && !limited.some((item) => item.key === nearestFutureReminderAssessmentKey)) {
    const guaranteed = ranked.find((item) => item.key === nearestFutureReminderAssessmentKey)
    if (guaranteed) limited[limited.length - 1] = guaranteed
  }
  const result = limited.map(({rank,time,...item}) => item)
  return result.length ? result : [{ key: "empty", kind: "empty", message: "Agrega tu horario para recibir avisos académicos.", action: "horario", actionLabel: "Ver horario" }]
}

export function getHorarilyCompanionMessage(data: HorarilyCompanionData, now: Date) { return getHorarilyCompanionMessages(data, now)[0] }

export function weightUrgentCompanionMessages(messages: HorarilyCompanionMessage[]) {
  const urgent = messages.find((item) => item.urgent || item.kind === "overdue")
  if (!urgent || messages.length < 2) return messages
  const rest = messages.filter((item) => item.key !== urgent.key)
  return [urgent, ...rest.slice(0, 2), urgent, ...rest.slice(2)]
}
