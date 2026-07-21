import type { Assessment } from "../grading/index"
import type { DayKey } from "../../lib/types"

export type AcademicAgendaItemKind = "class" | "study_block" | "reminder" | "assessment" | "overdue_assessment"
export interface AcademicAgendaItem { id: string; kind: AcademicAgendaItemKind; semesterId: string; subjectId?: string; title: string; startsAt: Date; action: "open_assessment" | "record_grade" | "create_study_block" | "create_reminder" | "go_to_subject" }
export interface AcademicAgendaInput { now: Date; semesterId: string; timezone?: string; subjects: { id: string; name: string }[]; assessments: Assessment[]; classes: { id: string; semesterId?: string; subjectId: string; day: DayKey; start: string; end: string; title?: string }[]; studyBlocks: { id: string; semesterId?: string; subjectId?: string; title: string; startsAt?: string; day?: DayKey; start?: string }[]; reminders: { id: string; semesterId?: string; subjectId?: string; title: string; targetDateTime: string }[] }
const DAY_ORDER: DayKey[] = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]
const WEEKDAY_BY_LABEL: Record<string, DayKey> = { lunes: "lunes", martes: "martes", miércoles: "miercoles", miercoles: "miercoles", jueves: "jueves", viernes: "viernes", sábado: "sabado", sabado: "sabado", domingo: "domingo" }

export interface ZonedDateTimeParts { year: number; month: number; day: number; hour: number; minute: number; weekday: DayKey }

function validTimezone(timezone?: string): string {
  if (!timezone) return "UTC"
  try { new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date(0)); return timezone } catch { return "UTC" }
}
function parseDate(date: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return null
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3])
  const utc = new Date(Date.UTC(year, month - 1, day))
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) return null
  return { year, month, day }
}
function parseTime(time: string): { hour: number; minute: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time)
  if (!match) return null
  const hour = Number(match[1]), minute = Number(match[2])
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return { hour, minute }
}
function formatter(timezone: string) {
  return new Intl.DateTimeFormat("es-CL", { timeZone: validTimezone(timezone), weekday: "long", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
}
export function getZonedDateTimeParts(date: Date, timezone = "UTC"): ZonedDateTimeParts | null {
  if (Number.isNaN(date.getTime())) return null
  const parts = Object.fromEntries(formatter(timezone).formatToParts(date).map((part) => [part.type, part.value]))
  const weekday = WEEKDAY_BY_LABEL[String(parts.weekday).toLowerCase()]
  if (!weekday) return null
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), hour: Number(parts.hour), minute: Number(parts.minute), weekday }
}
function addDays(date: { year: number; month: number; day: number }, days: number): { year: number; month: number; day: number } {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days))
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() }
}
function dateKey(parts: { year: number; month: number; day: number }): string {
  return `${parts.year.toString().padStart(4, "0")}-${parts.month.toString().padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`
}

export function zonedTimeToDate(date: string, time = "08:00", timezone = "UTC"): Date | null {
  const parsedDate = parseDate(date), parsedTime = parseTime(time)
  if (!parsedDate || !parsedTime) return null
  const zone = validTimezone(timezone)
  const targetAsUtc = Date.UTC(parsedDate.year, parsedDate.month - 1, parsedDate.day, parsedTime.hour, parsedTime.minute)
  let instant = new Date(targetAsUtc)
  for (let i = 0; i < 3; i++) {
    const parts = getZonedDateTimeParts(instant, zone)
    if (!parts) return null
    const actualAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute)
    const delta = targetAsUtc - actualAsUtc
    if (delta === 0) return instant
    instant = new Date(instant.getTime() + delta)
  }
  const finalParts = getZonedDateTimeParts(instant, zone)
  return finalParts && finalParts.year === parsedDate.year && finalParts.month === parsedDate.month && finalParts.day === parsedDate.day && finalParts.hour === parsedTime.hour && finalParts.minute === parsedTime.minute ? instant : null
}

function nextWallDateForDay(day: DayKey, time: string, now: Date, timezone = "UTC"): Date | null {
  const zone = validTimezone(timezone)
  const nowParts = getZonedDateTimeParts(now, zone)
  if (!nowParts) return null
  const target = DAY_ORDER.indexOf(day)
  const current = DAY_ORDER.indexOf(nowParts.weekday)
  if (target < 0 || current < 0) return null
  for (let offset = (target - current + 7) % 7; offset <= 7; offset += 7) {
    const candidateDate = dateKey(addDays(nowParts, offset))
    const candidate = zonedTimeToDate(candidateDate, time, zone)
    if (candidate && candidate.getTime() >= now.getTime()) return candidate
  }
  return null
}

export function buildAcademicAgenda(input: AcademicAgendaInput): { next7Days: AcademicAgendaItem[]; next30Days: AcademicAgendaItem[]; bySubject: Record<string, AcademicAgendaItem[]> } {
  const timezone = validTimezone(input.timezone)
  const subjectIds = new Set(input.subjects.map((s) => s.id))
  const items: AcademicAgendaItem[] = []
  for (const klass of input.classes) {
    if (klass.semesterId !== input.semesterId || !subjectIds.has(klass.subjectId)) continue
    const startsAt = nextWallDateForDay(klass.day, klass.start, input.now, timezone)
    if (startsAt) items.push({ id: klass.id, kind: "class", semesterId: input.semesterId, subjectId: klass.subjectId, title: klass.title ?? "Clase", startsAt, action: "go_to_subject" })
  }
  for (const assessment of input.assessments) {
    if (assessment.semesterId !== input.semesterId || !subjectIds.has(assessment.subjectId) || assessment.status === "exempt") continue
    const startsAt = zonedTimeToDate(assessment.scheduledDate, "08:00", timezone)
    if (!startsAt) continue
    const overdue = startsAt.getTime() < input.now.getTime() && assessment.status !== "graded"
    items.push({ id: assessment.id, kind: overdue ? "overdue_assessment" : "assessment", semesterId: assessment.semesterId, subjectId: assessment.subjectId, title: assessment.title, startsAt, action: overdue ? "record_grade" : "open_assessment" })
  }
  for (const reminder of input.reminders) {
    if (reminder.semesterId !== input.semesterId || (reminder.subjectId && !subjectIds.has(reminder.subjectId))) continue
    items.push({ id: reminder.id, kind: "reminder", semesterId: input.semesterId, subjectId: reminder.subjectId, title: reminder.title, startsAt: new Date(reminder.targetDateTime), action: "create_reminder" })
  }
  for (const block of input.studyBlocks) {
    if (block.semesterId !== input.semesterId || (block.subjectId && !subjectIds.has(block.subjectId))) continue
    const startsAt = block.startsAt ? new Date(block.startsAt) : block.day && block.start ? nextWallDateForDay(block.day, block.start, input.now, timezone) : input.now
    if (startsAt) items.push({ id: block.id, kind: "study_block", semesterId: input.semesterId, subjectId: block.subjectId, title: block.title, startsAt, action: "create_study_block" })
  }
  const sorted = items.filter((item) => !Number.isNaN(item.startsAt.getTime())).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
  const days = (n: number) => input.now.getTime() + n * 24 * 60 * 60 * 1000
  const next7Days = sorted.filter((item) => item.startsAt.getTime() >= input.now.getTime() && item.startsAt.getTime() <= days(7))
  const next30Days = sorted.filter((item) => item.startsAt.getTime() >= input.now.getTime() && item.startsAt.getTime() <= days(30))
  const bySubject: Record<string, AcademicAgendaItem[]> = {}
  for (const item of sorted) if (item.subjectId) (bySubject[item.subjectId] ??= []).push(item)
  return { next7Days, next30Days, bySubject }
}
