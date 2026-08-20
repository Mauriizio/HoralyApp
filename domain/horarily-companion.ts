import type { DayKey, ReminderKind, ReminderPriority } from "../lib/types.ts"

export type HorarilyCompanionMessage = {
  key: string
  kind: "overdue" | "current-class" | "next-class" | "reminder" | "assessment" | "assignment" | "event" | "attention" | "day-summary" | "empty"
  message: string
  action?: "horario" | "recordatorios" | "notas" | "materias"
  urgent?: boolean
}

export type HorarilyCompanionData = {
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

function atTime(now: Date, value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const result = new Date(now); result.setHours(Number(match[1]), Number(match[2]), 0, 0)
  return Number.isNaN(result.getTime()) ? null : result
}
function humanDistance(ms: number) {
  const days = Math.ceil(ms / 86_400_000)
  if (days <= 0) return "hoy"
  if (days === 1) return "mañana"
  return `en ${days} días`
}

export function getHorarilyCompanionMessages(data: HorarilyCompanionData, now: Date): HorarilyCompanionMessage[] {
  const ranked: Array<HorarilyCompanionMessage & { rank: number; time: number }> = []
  const seen = new Set<string>()
  const add = (item: HorarilyCompanionMessage & { rank: number; time: number }) => { if (!seen.has(item.key)) { seen.add(item.key); ranked.push(item) } }
  for (const [index, reminder] of data.reminders.entries()) {
    const date = new Date(reminder.targetDateTime)
    if (Number.isNaN(date.getTime())) continue
    const key = `reminder:${reminder.id ?? `${reminder.title}:${reminder.targetDateTime}`}`
    const distance = date.getTime() - now.getTime()
    if (distance < 0) { add({ key, kind: "overdue", message: `Tienes pendiente: ${reminder.title}.`, action: "recordatorios", urgent: true, rank: 1, time: date.getTime() }); continue }
    const kind = reminder.kind ?? "general"
    if (distance > LIVE_FEED_HORIZONS_MS[kind]) continue
    const subject = reminder.subjectName ? ` de ${reminder.subjectName}` : ""
    const label = kind === "assessment" ? `Evaluación${subject}` : reminder.title
    const message = kind === "assessment" ? `${label} ${humanDistance(distance)}.` : `${reminder.title} vence ${humanDistance(distance)} a las ${new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date)}.`
    const rank = distance < 86_400_000 ? 3 : kind === "assessment" ? 5 : kind === "assignment" ? 6 : reminder.priority === "alta" ? 7 : 8
    add({ key, kind: kind === "general" ? "reminder" : kind, message, action: "recordatorios", urgent: distance < 6 * 60 * MINUTE, rank, time: date.getTime() })
    void index
  }
  for (const assessment of data.assessments.filter((item) => item.score == null && item.status !== "graded")) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(assessment.date)) continue
    const date = new Date(`${assessment.date}T12:00:00`)
    const distance = date.getTime() - now.getTime()
    if (Number.isNaN(date.getTime()) || distance < 0 || distance > LIVE_FEED_HORIZONS_MS.assessment) continue
    add({ key: `assessment:${assessment.id ?? `${assessment.title}:${assessment.date}`}`, kind: "assessment", message: `${assessment.title} ${humanDistance(distance)}.`, action: "notas", urgent: distance < 6 * 60 * MINUTE, rank: distance < 86_400_000 ? 3 : 5, time: date.getTime() })
  }
  const today = DAYS[now.getDay()]
  const classes = data.classes.filter((item) => item.day === today).map((item) => ({ item, start: atTime(now, item.start), end: atTime(now, item.end) })).filter((x): x is typeof x & { start: Date; end: Date } => Boolean(x.start && x.end)).sort((a,b) => a.start.getTime()-b.start.getTime())
  const current = classes.find(({start,end}) => start <= now && now < end)
  if (current) add({ key: `class:${current.item.id ?? `${today}:${current.item.subjectName}:${current.item.start}`}`, kind: "current-class", message: `Estás en ${current.item.subjectName} hasta las ${current.item.end}.`, action: "horario", rank: 2, time: current.start.getTime() })
  const next = classes.find(({start}) => start > now)
  if (next) add({ key: `class:${next.item.id ?? `${today}:${next.item.subjectName}:${next.item.start}`}`, kind: "next-class", message: `${next.item.subjectName} comienza en ${Math.max(1, Math.round((next.start.getTime()-now.getTime())/MINUTE))} minutos.`, action: "horario", rank: 4, time: next.start.getTime() })
  for (const subject of data.subjects.filter((x) => x.requiresAttention)) add({ key: `subject:${subject.id ?? subject.name}`, kind: "attention", message: `${subject.name} necesita un poco de atención.`, action: "materias", rank: 9, time: Number.MAX_SAFE_INTEGER })
  if (classes.length) add({ key: `summary:${now.toISOString().slice(0,10)}`, kind: "day-summary", message: `Hoy tienes ${classes.length} clases.`, action: "horario", rank: 10, time: Number.MAX_SAFE_INTEGER })
  ranked.sort((a,b) => a.rank-b.rank || a.time-b.time || a.key.localeCompare(b.key))
  const result = ranked.slice(0, 8).map(({rank,time,...item}) => item)
  return result.length ? result : [{ key: "empty", kind: "empty", message: "Agrega tu horario para recibir avisos académicos.", action: "horario" }]
}

export function getHorarilyCompanionMessage(data: HorarilyCompanionData, now: Date) { return getHorarilyCompanionMessages(data, now)[0] }

export function weightUrgentCompanionMessages(messages: HorarilyCompanionMessage[]) {
  const urgent = messages.find((item) => item.urgent || item.kind === "overdue")
  if (!urgent || messages.length < 2) return messages
  return [urgent, ...messages.filter((item) => item.key !== urgent.key).flatMap((item) => [item, urgent])]
}
