import { z } from "zod"
import {
  type AppData,
  DEFAULT_PROFILE,
  EMPTY_APP_DATA,
  type GradeScale,
  type ScheduleBlock,
  type Subject,
} from "./types"
import { commandKeyForSubjectName, ensureUniqueCommandKey, normalizeCommandKey } from "./command-key"
import { validateModules } from "./time-modules"

const STORAGE_KEY = "horario-escolar:v1"

const daySchema = z.enum(["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"])
const difficultySchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
const gradeScaleSchema = z
  .object({ min: z.number().finite(), max: z.number().finite(), passing: z.number().finite() })
  .refine((scale) => scale.min < scale.max, "La nota mínima debe ser menor que la máxima.")
  .refine((scale) => scale.passing >= scale.min && scale.passing <= scale.max, "La nota de aprobación debe estar dentro de la escala.")

const subjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().min(1),
  icon: z.string().optional(),
  notes: z.string().optional(),
  commandKey: z.string().optional(),
  difficulty: difficultySchema,
  createdAt: z.number().finite(),
})

const moduleSchema = z.object({
  id: z.string().min(1),
  start: z.string().min(1),
  end: z.string().min(1),
  label: z.string().min(1),
})

const blockSchema = z.object({
  id: z.string().min(1),
  subjectId: z.string().min(1),
  day: daySchema,
  moduleIds: z.array(z.string().min(1)).min(1),
})

const studyBlockSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  subjectId: z.string().optional(),
  day: daySchema,
  start: z.string().min(1),
  end: z.string().min(1),
  notes: z.string().optional(),
})

const reminderTriggerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("hoursBefore"), hours: z.number().finite().positive() }),
  z.object({ kind: z.literal("dayBefore") }),
  z.object({ kind: z.literal("customDateTime"), datetime: z.string().min(1) }),
])

const reminderSchema = z.object({
  id: z.string().min(1),
  subjectId: z.string().optional(),
  studyBlockId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["baja", "media", "alta"]),
  triggers: z.array(reminderTriggerSchema),
  targetDateTime: z.string().min(1),
  createdAt: z.number().finite(),
  notifiedTriggerIndexes: z.array(z.number().int().nonnegative()),
})

const gradeSchema = z.object({
  id: z.string().min(1),
  subjectId: z.string().min(1),
  title: z.string().min(1),
  score: z.number().finite(),
  weight: z.number().finite().positive().max(100),
  date: z.string().min(1),
  notes: z.string().optional(),
  createdAt: z.number().finite(),
})

const profileSchema = z.object({ displayName: z.string(), avatar: z.string().optional() })

const settingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  language: z.enum(["es", "en"]),
  accentColor: z.string().min(1),
  fontFamily: z.enum(["sans", "serif", "mono", "system", "rounded", "display", "clean", "friendly", "classic", "tech"]),
  fontScale: z.number().finite().positive(),
  timeFormat: z.enum(["12h", "24h"]),
  radius: z.number().finite().nonnegative(),
  blockOpacity: z.number().finite().positive(),
  focusMode: z.boolean(),
  enableSaturday: z.boolean(),
  googleCalendarConnected: z.boolean(),
  gradeScale: gradeScaleSchema,
})

const appDataSchema = z.object({
  subjects: z.array(subjectSchema),
  blocks: z.array(blockSchema),
  studyBlocks: z.array(studyBlockSchema),
  reminders: z.array(reminderSchema),
  modules: z.array(moduleSchema),
  grades: z.array(gradeSchema),
  profile: profileSchema,
  settings: settingsSchema,
  version: z.literal(3),
})

export interface ImportValidationResult {
  ok: boolean
  data?: AppData
  errors: string[]
}

function normalizeSubjects(subjects: Subject[]): Subject[] {
  const result: Subject[] = []
  for (const subject of subjects) {
    const preferred = subject.commandKey ? normalizeCommandKey(subject.commandKey) : commandKeyForSubjectName(subject.name, result)
    const commandKey = ensureUniqueCommandKey(preferred, result, {
      excludeSubjectId: subject.id,
      fallbackName: subject.name,
    })
    result.push({ ...subject, commandKey })
  }
  return result
}

export function migrateData(parsed: Partial<AppData> & Record<string, unknown>): AppData {
  const migrated = {
    ...EMPTY_APP_DATA,
    ...parsed,
    settings: { ...EMPTY_APP_DATA.settings, ...(parsed.settings ?? {}) },
    modules: Array.isArray(parsed.modules) && parsed.modules.length ? parsed.modules : EMPTY_APP_DATA.modules,
    grades: Array.isArray(parsed.grades) ? parsed.grades : [],
    profile: { ...DEFAULT_PROFILE, ...(parsed.profile ?? {}) },
    version: 3,
  } as AppData

  migrated.subjects = normalizeSubjects(Array.isArray(migrated.subjects) ? migrated.subjects : [])
  return migrated
}

function validateRelations(data: AppData): string[] {
  const errors: string[] = []
  const subjectIds = new Set(data.subjects.map((subject) => subject.id))
  const moduleIds = new Set(data.modules.map((module) => module.id))
  const subjectKeys = new Set<string>()

  for (const subject of data.subjects) {
    const key = normalizeCommandKey(subject.commandKey ?? "")
    if (!key) errors.push(`La materia ${subject.name} no tiene commandKey válido.`)
    if (subjectKeys.has(key)) errors.push(`commandKey duplicado: ${key}.`)
    subjectKeys.add(key)
  }

  const modulesError = validateModules(data.modules)
  if (modulesError) errors.push(`Módulos horarios inválidos: ${modulesError}.`)

  for (const block of data.blocks) {
    if (!subjectIds.has(block.subjectId)) errors.push(`Bloque ${block.id} referencia una materia inexistente.`)
    for (const moduleId of block.moduleIds) {
      if (!moduleIds.has(moduleId)) errors.push(`Bloque ${block.id} referencia un módulo inexistente.`)
    }
  }

  for (const studyBlock of data.studyBlocks) {
    if (studyBlock.subjectId && !subjectIds.has(studyBlock.subjectId)) {
      errors.push(`Bloque de estudio ${studyBlock.id} referencia una materia inexistente.`)
    }
  }

  for (const reminder of data.reminders) {
    if (reminder.subjectId && !subjectIds.has(reminder.subjectId)) {
      errors.push(`Recordatorio ${reminder.id} referencia una materia inexistente.`)
    }
  }

  for (const grade of data.grades) {
    if (!subjectIds.has(grade.subjectId)) errors.push(`Nota ${grade.id} referencia una materia inexistente.`)
    if (grade.weight <= 0 || grade.weight > 100) errors.push(`Nota ${grade.id} tiene ponderación inválida.`)
    if (!isGradeCompatibleWithScale(grade.score, data.settings.gradeScale)) {
      errors.push(`Nota ${grade.id} está fuera de la escala configurada.`)
    }
  }

  return errors
}

export function isGradeCompatibleWithScale(score: number, scale: GradeScale): boolean {
  return Number.isFinite(score) && score >= scale.min && score <= scale.max
}

export function hasGradesOutsideScale(data: AppData, scale: GradeScale): boolean {
  return data.grades.some((grade) => !isGradeCompatibleWithScale(grade.score, scale))
}

export function validateImportedData(input: unknown): ImportValidationResult {
  try {
    const migrated = migrateData(input as Partial<AppData> & Record<string, unknown>)
    const parsed = appDataSchema.safeParse(migrated)
    if (!parsed.success) {
      return { ok: false, errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) }
    }
    const relationErrors = validateRelations(parsed.data)
    if (relationErrors.length > 0) return { ok: false, errors: relationErrors }
    return { ok: true, data: parsed.data, errors: [] }
  } catch (error) {
    return { ok: false, errors: [error instanceof Error ? error.message : "Error desconocido de importación."] }
  }
}

export function loadData(): AppData {
  if (typeof window === "undefined") return EMPTY_APP_DATA
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_APP_DATA
    const parsed = JSON.parse(raw) as Partial<AppData>
    const validation = validateImportedData(parsed)
    if (!validation.ok || !validation.data) {
      console.warn("[Horaly] Datos locales inválidos; se usará estado vacío.", validation.errors)
      return EMPTY_APP_DATA
    }
    return validation.data
  } catch (err) {
    console.warn("[Horaly] Error cargando datos:", err)
    return EMPTY_APP_DATA
  }
}

export function saveData(data: AppData) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (err) {
    console.warn("[Horaly] Error guardando datos:", err)
  }
}

export function exportAsJson(data: AppData): string {
  return JSON.stringify(data, null, 2)
}

export function importFromJson(json: string): AppData {
  const parsed = JSON.parse(json) as unknown
  const validation = validateImportedData(parsed)
  if (!validation.ok || !validation.data) {
    throw new Error(validation.errors.join("\n"))
  }
  return validation.data
}

export function downloadJson(filename: string, json: string) {
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
