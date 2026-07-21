import type { Assessment } from "../grading/index"
import type { DayKey } from "../../lib/types"

export type AcademicAgendaItemKind = "class" | "study_block" | "reminder" | "assessment" | "overdue_assessment"
export interface AcademicAgendaItem { id: string; kind: AcademicAgendaItemKind; semesterId: string; subjectId?: string; title: string; startsAt: Date; action: "open_assessment" | "record_grade" | "create_study_block" | "create_reminder" | "go_to_subject" }
export interface AcademicAgendaInput { now: Date; semesterId: string; timezone?: string; subjects: { id: string; name: string }[]; assessments: Assessment[]; classes: { id: string; semesterId?: string; subjectId: string; day: DayKey; start: string; end: string; title?: string }[]; studyBlocks: { id: string; semesterId?: string; subjectId?: string; title: string; startsAt?: string; day?: DayKey; start?: string }[]; reminders: { id: string; semesterId?: string; subjectId?: string; title: string; targetDateTime: string }[] }
const DAY_ORDER: DayKey[] = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]

function dateForDay(day: DayKey, time: string, now: Date): Date {
  const target = (DAY_ORDER.indexOf(day) + 1) % 7
  const diff = (target - now.getDay() + 7) % 7
  const date = new Date(now)
  date.setDate(now.getDate() + diff)
  const [h, m] = time.split(":").map(Number)
  date.setHours(h || 0, m || 0, 0, 0)
  if (date.getTime() < now.getTime()) date.setDate(date.getDate() + 7)
  return date
}
function localDate(date: string, time = "08:00"): Date { return new Date(`${date}T${time}:00`) }

export function buildAcademicAgenda(input: AcademicAgendaInput): { next7Days: AcademicAgendaItem[]; next30Days: AcademicAgendaItem[]; bySubject: Record<string, AcademicAgendaItem[]> } {
  const subjectIds = new Set(input.subjects.map((s) => s.id))
  const items: AcademicAgendaItem[] = []
  for (const klass of input.classes) {
    if (klass.semesterId !== input.semesterId || !subjectIds.has(klass.subjectId)) continue
    items.push({ id: klass.id, kind: "class", semesterId: input.semesterId, subjectId: klass.subjectId, title: klass.title ?? "Clase", startsAt: dateForDay(klass.day, klass.start, input.now), action: "go_to_subject" })
  }
  for (const assessment of input.assessments) {
    if (assessment.semesterId !== input.semesterId || !subjectIds.has(assessment.subjectId) || assessment.status === "exempt") continue
    const startsAt = localDate(assessment.scheduledDate)
    const overdue = startsAt.getTime() < input.now.getTime() && assessment.status !== "graded"
    items.push({ id: assessment.id, kind: overdue ? "overdue_assessment" : "assessment", semesterId: assessment.semesterId, subjectId: assessment.subjectId, title: assessment.title, startsAt, action: overdue ? "record_grade" : "open_assessment" })
  }
  for (const reminder of input.reminders) {
    if (reminder.semesterId !== input.semesterId || (reminder.subjectId && !subjectIds.has(reminder.subjectId))) continue
    items.push({ id: reminder.id, kind: "reminder", semesterId: input.semesterId, subjectId: reminder.subjectId, title: reminder.title, startsAt: new Date(reminder.targetDateTime), action: "create_reminder" })
  }
  for (const block of input.studyBlocks) {
    if (block.semesterId !== input.semesterId || (block.subjectId && !subjectIds.has(block.subjectId))) continue
    const startsAt = block.startsAt ? new Date(block.startsAt) : block.day && block.start ? dateForDay(block.day, block.start, input.now) : input.now
    items.push({ id: block.id, kind: "study_block", semesterId: input.semesterId, subjectId: block.subjectId, title: block.title, startsAt, action: "create_study_block" })
  }
  const sorted = items.filter((item) => !Number.isNaN(item.startsAt.getTime())).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
  const days = (n: number) => input.now.getTime() + n * 24 * 60 * 60 * 1000
  const next7Days = sorted.filter((item) => item.startsAt.getTime() >= input.now.getTime() && item.startsAt.getTime() <= days(7))
  const next30Days = sorted.filter((item) => item.startsAt.getTime() >= input.now.getTime() && item.startsAt.getTime() <= days(30))
  const bySubject: Record<string, AcademicAgendaItem[]> = {}
  for (const item of sorted) if (item.subjectId) (bySubject[item.subjectId] ??= []).push(item)
  return { next7Days, next30Days, bySubject }
}
