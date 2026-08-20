import type { DayKey, ReminderKind, ReminderPriority } from "../lib/types.ts"

export type HorarilyCompanionMessage = {
  key: string
  kind: "overdue" | "current-class" | "next-class" | "reminder" | "assessment" | "assignment" | "event" | "attention" | "day-summary" | "motivation" | "empty"
  message: string
  tickerMessage?: string
  tickerLabel?: string
  action?: "horario" | "recordatorios" | "notas" | "materias"
  actionLabel?: string
  urgent?: boolean
}

export type HorarilyReminderInput = {
  id?: string
  title: string
  subjectName?: string
  targetDateTime: string
  kind?: ReminderKind
  priority?: ReminderPriority
}

export type UpcomingReminderAssessment = HorarilyReminderInput & {
  date: Date
  localDate: string
  localTime: string
}

export type HorarilyCompanionData = {
  timezone?: string
  reminders: HorarilyReminderInput[]
  assessments: Array<{ id?: string; title: string; date: string; subjectName?: string; score?: number | null; status?: string }>
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
  if (!timezone) return "UTC"
  try { new Intl.DateTimeFormat("es-CL", { timeZone: timezone }).format(new Date(0)); return timezone } catch { return "UTC" }
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

function localDayDifference(date: Date, now: Date, timezone?: string) {
  return localDayNumber(zonedParts(date, timezone).date) - localDayNumber(zonedParts(now, timezone).date)
}

export function formatAcademicEventDate(date: Date, now: Date, timezone = "UTC") {
  const target = zonedParts(date, timezone)
  const dayDifference = localDayDifference(date, now, timezone)
  const time = `${target.hour}:${target.minute}`
  if (dayDifference === 0) return `hoy a las ${time}`
  if (dayDifference === 1) return `mañana a las ${time}`
  const dateText = new Intl.DateTimeFormat("es-CL", { timeZone: safeTimezone(timezone), day: "numeric", month: "long" }).format(date)
  return `${dateText} a las ${time}`
}

function compactAcademicEventDate(date: Date, now: Date, timezone?: string) {
  const target = zonedParts(date, timezone)
  const dayDifference = localDayDifference(date, now, timezone)
  const time = `${target.hour}:${target.minute}`
  if (dayDifference === 0) return `hoy · ${time}`
  if (dayDifference === 1) return `mañana · ${time}`
  const dayMonth = new Intl.DateTimeFormat("es-CL", { timeZone: safeTimezone(timezone), day: "numeric", month: "short" }).format(date).replace(".", "")
  return `${dayMonth} · ${time}`
}

export function getUpcomingReminderAssessments(reminders: HorarilyReminderInput[], now: Date, timezone = "UTC"): UpcomingReminderAssessment[] {
  const result: UpcomingReminderAssessment[] = []
  const seen = new Set<string>()
  for (const reminder of reminders) {
    if (reminder.kind !== "assessment") continue
    const date = new Date(reminder.targetDateTime)
    if (Number.isNaN(date.getTime()) || date.getTime() < now.getTime()) continue
    const key = reminder.id ?? `${reminder.title}:${reminder.targetDateTime}`
    if (seen.has(key)) continue
    seen.add(key)
    const local = zonedParts(date, timezone)
    result.push({ ...reminder, date, localDate: local.date, localTime: `${local.hour}:${local.minute}` })
  }
  return result.sort((a, b) => a.date.getTime() - b.date.getTime() || (a.id ?? a.title).localeCompare(b.id ?? b.title))
}

function normalized(value?: string) {
  return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").replace(/[^a-z0-9]+/g, " ").trim()
}

function assessmentDescriptor(assessment: UpcomingReminderAssessment) {
  if (!assessment.subjectName) return assessment.title
  return normalized(assessment.title).includes(normalized(assessment.subjectName)) ? assessment.title : `${assessment.title} de ${assessment.subjectName}`
}

function singleAssessmentCopy(assessment: UpcomingReminderAssessment, now: Date, timezone?: string) {
  const dayDifference = localDayDifference(assessment.date, now, timezone)
  const descriptor = assessmentDescriptor(assessment)
  if (dayDifference === 0) return `Hoy tienes ${descriptor} a las ${assessment.localTime}.`
  if (dayDifference === 1) return `Mañana tienes ${descriptor} a las ${assessment.localTime}.`
  if (dayDifference === 7) return `En una semana tienes ${descriptor} a las ${assessment.localTime}.`
  if (dayDifference === 14) return `En 2 semanas tienes ${descriptor} a las ${assessment.localTime}.`
  if (dayDifference >= 2 && dayDifference <= 14) return `En ${dayDifference} días tienes ${descriptor} a las ${assessment.localTime}.`
  return `Tu próximo examen es ${descriptor}, el ${formatAcademicEventDate(assessment.date, now, timezone)}.`
}

function joinedAssessmentEntries(assessments: UpcomingReminderAssessment[]) {
  const entries = assessments.map((item) => `${item.subjectName ?? item.title} a las ${item.localTime}`)
  if (entries.length === 1) return entries[0]
  return `${entries.slice(0, -1).join(", ")} y ${entries.at(-1)}`
}

function groupedAssessmentCopy(assessments: UpcomingReminderAssessment[], now: Date, timezone?: string) {
  const first = assessments[0]
  const dayDifference = localDayDifference(first.date, now, timezone)
  const prefix = dayDifference === 0 ? "Hoy" : dayDifference === 1 ? "Mañana" : `El ${new Intl.DateTimeFormat("es-CL", { timeZone: safeTimezone(timezone), day: "numeric", month: "long" }).format(first.date)}`
  if (assessments.length <= 3) return `${prefix} tienes ${assessments.length} evaluaciones: ${joinedAssessmentEntries(assessments)}.`
  return `${prefix} tienes ${assessments.length} evaluaciones. La primera es ${first.subjectName ?? first.title} a las ${first.localTime}.`
}

function assessmentGroupMessage(assessments: UpcomingReminderAssessment[], now: Date, timezone?: string): HorarilyCompanionMessage & { rank: number; time: number } {
  const first = assessments[0]
  if (assessments.length === 1) return {
    key: `reminder-assessments:${first.localDate}`, kind: "assessment", message: singleAssessmentCopy(first, now, timezone),
    tickerMessage: `${first.subjectName ?? "EVALUACIÓN"} · ${first.title} · ${compactAcademicEventDate(first.date, now, timezone)}`,
    action: "recordatorios", actionLabel: "Ver evaluación", urgent: first.date.getTime() - now.getTime() <= DAY,
    rank: 1, time: first.date.getTime(),
  }
  const compactDate = new Intl.DateTimeFormat("es-CL", { timeZone: safeTimezone(timezone), day: "numeric", month: "short" }).format(first.date).replace(".", "")
  const compactEntries = assessments.slice(0, 3).map((item) => `${item.subjectName ?? item.title} ${item.localTime}`).join(" + ")
  return {
    key: `reminder-assessments:${first.localDate}`, kind: "assessment", tickerLabel: "EVALUACIONES",
    message: groupedAssessmentCopy(assessments, now, timezone),
    tickerMessage: assessments.length <= 3 ? `${compactEntries} · ${compactDate}` : `${assessments.length} evaluaciones · primera ${first.subjectName ?? first.title} ${first.localTime} · ${compactDate}`,
    action: "recordatorios", actionLabel: "Ver evaluaciones", urgent: first.date.getTime() - now.getTime() <= DAY,
    rank: 1, time: first.date.getTime(),
  }
}

function atTime(now: Date, value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const result = new Date(now); result.setHours(Number(match[1]), Number(match[2]), 0, 0)
  return Number.isNaN(result.getTime()) ? null : result
}

function reminderRelativeCopy(reminder: HorarilyReminderInput, date: Date, now: Date, timezone?: string) {
  const dayDifference = localDayDifference(date, now, timezone)
  const time = `${zonedParts(date, timezone).hour}:${zonedParts(date, timezone).minute}`
  if (reminder.kind === "assignment") {
    if (dayDifference === 0) return `Hoy debes entregar ${reminder.title} a las ${time}.`
    if (dayDifference === 1) return `Mañana debes entregar ${reminder.title} a las ${time}.`
    return `En ${dayDifference} días debes entregar ${reminder.title} a las ${time}.`
  }
  if (dayDifference === 0) return `${reminder.title} vence hoy a las ${time}.`
  if (dayDifference === 1) return `${reminder.title} vence mañana a las ${time}.`
  return `${reminder.title} vence en ${dayDifference} días a las ${time}.`
}

function sameGradeAndReminder(grade: HorarilyCompanionData["assessments"][number], reminder: UpcomingReminderAssessment) {
  if (grade.date !== reminder.localDate || !grade.subjectName || !reminder.subjectName) return false
  if (normalized(grade.subjectName) !== normalized(reminder.subjectName)) return false
  const gradeTitle = normalized(grade.title)
  const reminderTitle = normalized(reminder.title)
  return gradeTitle === reminderTitle || gradeTitle.includes(reminderTitle) || reminderTitle.includes(gradeTitle)
}

export function getHorarilyCompanionMessages(data: HorarilyCompanionData, now: Date): HorarilyCompanionMessage[] {
  const ranked: Array<HorarilyCompanionMessage & { rank: number; time: number }> = []
  const seen = new Set<string>()
  const add = (item: HorarilyCompanionMessage & { rank: number; time: number }) => { if (!seen.has(item.key)) { seen.add(item.key); ranked.push(item) } }
  const upcomingAssessments = getUpcomingReminderAssessments(data.reminders, now, data.timezone)

  for (const reminder of data.reminders) {
    const date = new Date(reminder.targetDateTime)
    if (Number.isNaN(date.getTime())) continue
    const distance = date.getTime() - now.getTime()
    const kind = reminder.kind ?? "general"
    if (distance < 0) {
      const subject = reminder.subjectName ? ` de ${reminder.subjectName}` : ""
      const message = kind === "assessment" ? `Evaluación vencida: ${reminder.title}${subject}, el ${formatAcademicEventDate(date, now, data.timezone)}.` : `Tienes pendiente: ${reminder.title}.`
      add({ key: `reminder:${reminder.id ?? `${reminder.title}:${reminder.targetDateTime}`}`, kind: "overdue", message, tickerMessage: reminder.title, action: "recordatorios", actionLabel: kind === "assessment" ? "Ver evaluación" : kind === "assignment" ? "Ver entrega" : "Ver pendiente", urgent: true, rank: 0, time: date.getTime() })
      continue
    }
    if (kind === "assessment") continue
    if (distance > LIVE_FEED_HORIZONS_MS[kind]) continue
    const rank = kind === "assignment" ? 4 : kind === "event" ? 7 : reminder.priority === "alta" ? 6 : 7
    add({
      key: `reminder:${reminder.id ?? `${reminder.title}:${reminder.targetDateTime}`}`,
      kind: kind === "general" ? "reminder" : kind,
      message: reminderRelativeCopy(reminder, date, now, data.timezone),
      tickerMessage: `${reminder.title} · ${compactAcademicEventDate(date, now, data.timezone)}`,
      action: "recordatorios", actionLabel: kind === "assignment" ? "Ver entrega" : kind === "event" ? "Ver evento" : "Ver pendiente",
      urgent: distance <= 6 * 60 * MINUTE, rank, time: date.getTime(),
    })
  }

  const grouped = new Map<string, UpcomingReminderAssessment[]>()
  for (const assessment of upcomingAssessments) grouped.set(assessment.localDate, [...(grouped.get(assessment.localDate) ?? []), assessment])
  const assessmentGroups = [...grouped.values()].sort((a, b) => a[0].date.getTime() - b[0].date.getTime())
  assessmentGroups.forEach((group, index) => {
    if (index === 0 || group[0].date.getTime() - now.getTime() <= LIVE_FEED_HORIZONS_MS.assessment) add(assessmentGroupMessage(group, now, data.timezone))
  })

  for (const assessment of data.assessments.filter((item) => item.score == null && item.status !== "graded")) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(assessment.date) || upcomingAssessments.some((reminder) => sameGradeAndReminder(assessment, reminder))) continue
    const date = new Date(`${assessment.date}T12:00:00`)
    const distance = date.getTime() - now.getTime()
    if (Number.isNaN(date.getTime()) || distance < 0 || distance > LIVE_FEED_HORIZONS_MS.assessment) continue
    add({ key: `assessment:${assessment.id ?? `${assessment.title}:${assessment.date}`}`, kind: "assessment", message: `${assessment.title} ${localDayDifference(date, now, data.timezone) === 1 ? "mañana" : `el ${formatAcademicEventDate(date, now, data.timezone)}`}.`, tickerMessage: `${assessment.title} · ${compactAcademicEventDate(date, now, data.timezone)}`, action: "notas", actionLabel: "Ver notas", urgent: distance <= DAY, rank: 1, time: date.getTime() })
  }

  const today = DAYS[now.getDay()]
  const classes = data.classes.filter((item) => item.day === today).map((item) => ({ item, start: atTime(now, item.start), end: atTime(now, item.end) })).filter((x): x is typeof x & { start: Date; end: Date } => Boolean(x.start && x.end)).sort((a,b) => a.start.getTime()-b.start.getTime())
  const current = classes.find(({start,end}) => start <= now && now < end)
  if (current) add({ key: `class:${current.item.id ?? `${today}:${current.item.subjectName}:${current.item.start}`}`, kind: "current-class", message: `Estás en ${current.item.subjectName} hasta las ${current.item.end}.`, tickerMessage: `${current.item.subjectName} hasta las ${current.item.end}`, action: "horario", actionLabel: "Ver horario", rank: 2, time: current.start.getTime() })
  const next = classes.find(({start}) => start > now)
  if (next) add({ key: `class:${next.item.id ?? `${today}:${next.item.subjectName}:${next.item.start}`}`, kind: "next-class", message: `${next.item.subjectName} comienza en ${formatClassCountdown((next.start.getTime()-now.getTime())/MINUTE)}.`, action: "horario", actionLabel: "Ver horario", rank: 3, time: next.start.getTime() })
  if (classes.length) add({ key: `summary:${now.toISOString().slice(0,10)}`, kind: "day-summary", message: `Hoy tienes ${classes.length} ${classes.length === 1 ? "clase" : "clases"}.`, action: "horario", actionLabel: "Ver horario", rank: 5, time: Number.MAX_SAFE_INTEGER })

  ranked.sort((a,b) => a.rank-b.rank || a.time-b.time || a.key.localeCompare(b.key))
  const limited = ranked.slice(0, 8)
  const nearestAssessmentKey = assessmentGroups[0] ? `reminder-assessments:${assessmentGroups[0][0].localDate}` : undefined
  if (nearestAssessmentKey && !limited.some((item) => item.key === nearestAssessmentKey)) {
    const guaranteed = ranked.find((item) => item.key === nearestAssessmentKey)
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
