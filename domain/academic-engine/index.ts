import type { AppData, DayKey, GradeScale, Reminder, ScheduleBlock, Subject, TimeModule } from "@/lib/types"

export interface AverageResult { value: number | null; completedWeight: number; confidence: "none" | "partial" | "complete" }
export interface SubjectRisk { subjectId: string; subjectName: string; average: number | null; reason: string; severity: "low" | "medium" | "high" }
export interface SubjectAttention { subjectId: string; subjectName: string; reason: string; severity: "low" | "medium" | "high" }
export interface NextClass { subject: Subject; block: ScheduleBlock; day: DayKey; start: string; end: string; startsAt: Date }

const DAY_ORDER: DayKey[] = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]

export function calculateWeightedAverage(grades: AppData["grades"], scale: GradeScale): AverageResult {
  const valid = grades.filter((g) => Number.isFinite(g.score) && Number.isFinite(g.weight) && g.weight > 0 && g.score >= scale.min && g.score <= scale.max)
  const totalWeight = valid.reduce((sum, g) => sum + g.weight, 0)
  if (valid.length === 0 || totalWeight <= 0) return { value: null, completedWeight: 0, confidence: "none" }
  const value = valid.reduce((sum, g) => sum + g.score * g.weight, 0) / totalWeight
  return { value: Number(value.toFixed(2)), completedWeight: totalWeight, confidence: totalWeight >= 99.5 ? "complete" : "partial" }
}

export function detectSubjectsAtRisk(data: AppData): SubjectRisk[] {
  return data.subjects.flatMap((subject) => {
    const average = calculateWeightedAverage(data.grades.filter((g) => g.subjectId === subject.id), data.settings.gradeScale)
    if (average.value !== null && average.value < data.settings.gradeScale.passing) {
      return [{ subjectId: subject.id, subjectName: subject.name, average: average.value, reason: "Promedio bajo la nota de aprobación.", severity: "high" as const }]
    }
    const remaining = Math.max(0, 100 - average.completedWeight)
    const required = calculateRequiredGrade(average, data.settings.gradeScale, remaining)
    if (average.confidence === "partial" && required.required !== null && required.required > data.settings.gradeScale.max) {
      return [{ subjectId: subject.id, subjectName: subject.name, average: average.value, reason: "Situación matemáticamente crítica con la ponderación restante.", severity: "high" as const }]
    }
    return []
  })
}

export function detectSubjectsRequiringAttention(data: AppData, now = new Date()): SubjectAttention[] {
  return data.subjects.flatMap((subject) => {
    const overdue = detectOverdueReminders(data.reminders.filter((r) => r.subjectId === subject.id), now).length
    if (overdue > 0) return [{ subjectId: subject.id, subjectName: subject.name, reason: overdue === 1 ? "Tiene un recordatorio vencido." : `Tiene ${overdue} recordatorios vencidos.`, severity: overdue > 1 ? "high" as const : "medium" as const }]
    if (subject.difficulty >= 4) return [{ subjectId: subject.id, subjectName: subject.name, reason: "Dificultad declarada alta.", severity: "medium" as const }]
    return []
  })
}

export function calculateRequiredGrade(current: AverageResult, scale: GradeScale, remainingWeight: number): { required: number | null; message: string } {
  if (current.value === null) return { required: null, message: "Faltan notas para estimar." }
  if (remainingWeight <= 0) return { required: null, message: "No queda ponderación disponible." }
  const required = (scale.passing * (current.completedWeight + remainingWeight) - current.value * current.completedWeight) / remainingWeight
  if (required > scale.max) return { required: Number(required.toFixed(2)), message: "La meta supera la escala; revisa ponderaciones." }
  return { required: Math.max(scale.min, Number(required.toFixed(2))), message: "Estimación determinista con datos actuales." }
}

export function orderAcademicPriorities(risks: SubjectRisk[]): SubjectRisk[] {
  const score = { high: 3, medium: 2, low: 1 }
  return [...risks].sort((a, b) => score[b.severity] - score[a.severity] || a.subjectName.localeCompare(b.subjectName))
}

export function detectOverdueReminders(reminders: Reminder[], now: Date): Reminder[] {
  return reminders.filter((r) => {
    const target = new Date(r.targetDateTime)
    return !Number.isNaN(target.getTime()) && target.getTime() < now.getTime()
  })
}

function nextDateForDay(day: DayKey, now: Date): Date {
  const jsTarget = (DAY_ORDER.indexOf(day) + 1) % 7
  const diff = (jsTarget - now.getDay() + 7) % 7
  const date = new Date(now)
  date.setDate(now.getDate() + diff)
  return date
}

export function getTodayClasses(data: AppData, now: Date): NextClass[] {
  const today = DAY_ORDER[(now.getDay() + 6) % 7]
  return data.blocks.flatMap((block) => {
    if (block.day !== today) return []
    const next = determineNextClass({ ...data, blocks: [block] }, new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0))
    return next ? [next] : []
  }).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
}

export function determineNextClass(data: AppData, now: Date): NextClass | null {
  const modules = new Map(data.modules.map((m) => [m.id, m]))
  const subjects = new Map(data.subjects.map((s) => [s.id, s]))
  const candidates = data.blocks.flatMap((block) => {
    const subject = subjects.get(block.subjectId)
    if (!subject) return []
    const ordered = block.moduleIds.map((id) => modules.get(id)).filter((m): m is TimeModule => Boolean(m)).sort((a, b) => a.start.localeCompare(b.start))
    const first = ordered[0]
    const last = ordered[ordered.length - 1]
    if (!first || !last) return []
    const date = nextDateForDay(block.day, now)
    const [hour, minute] = first.start.split(":").map(Number)
    date.setHours(hour, minute, 0, 0)
    if (date.getTime() < now.getTime()) date.setDate(date.getDate() + 7)
    return [{ subject, block, day: block.day, start: first.start, end: last.end, startsAt: date }]
  })
  return candidates.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0] ?? null
}

export function estimateWeeklyLoad(data: AppData): { classBlocks: number; studyBlocks: number; totalBlocks: number } {
  return { classBlocks: data.blocks.reduce((sum, b) => sum + b.moduleIds.length, 0), studyBlocks: data.studyBlocks.length, totalBlocks: data.blocks.reduce((sum, b) => sum + b.moduleIds.length, 0) + data.studyBlocks.length }
}

export function suggestBasicStudyBlock(data: AppData): { subjectId?: string; message: string; confidence: "low" | "medium" } {
  const risk = orderAcademicPriorities(detectSubjectsAtRisk(data))[0]
  if (risk) return { subjectId: risk.subjectId, message: `Reserva 30 minutos para ${risk.subjectName}.`, confidence: "medium" }
  const attention = detectSubjectsRequiringAttention(data)[0]
  if (attention) return { subjectId: attention.subjectId, message: `Reserva 25 minutos para revisar ${attention.subjectName}.`, confidence: "medium" }
  if (data.subjects[0]) return { subjectId: data.subjects[0].id, message: `Reserva 25 minutos para repasar ${data.subjects[0].name}.`, confidence: "low" }
  return { message: "Agrega materias para sugerir estudio.", confidence: "low" }
}
