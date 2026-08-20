import { z } from "zod"
import {
  type AppData,
  type AppSettings,
  DEFAULT_PROFILE,
  EMPTY_APP_DATA,
  type GradeScale,
  type Subject,
  type SubjectNote,
  WEEKDAY_KEYS,
} from "./types.ts"
import { commandKeyForSubjectName, ensureUniqueCommandKey, normalizeCommandKey } from "./command-key.ts"
import { validateModules } from "./time-modules.ts"
import { defaultAssessmentGroupId, ensureGradeAssessmentGroup } from "./assessment-groups.ts"

export const STORAGE_KEY = "horario-escolar:v1"

const ARRAY_FIELDS = ["subjects", "blocks", "studyBlocks", "reminders", "modules", "grades", "assessmentGroups", "subjectNotes", "subjectNoteAttachments", "semesters"] as const

const daySchema = z.enum(["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"])
const difficultySchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
const gradeScaleSchema = z
  .object({ min: z.number().finite(), max: z.number().finite(), passing: z.number().finite() })
  .refine((scale) => scale.min < scale.max, "La nota mínima debe ser menor que la máxima.")
  .refine((scale) => scale.passing >= scale.min && scale.passing <= scale.max, "La nota de aprobación debe estar dentro de la escala.")

const subjectSchema = z.object({
  semesterId: z.string().optional(),
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
  semesterId: z.string().optional(),
  id: z.string().min(1),
  subjectId: z.string().min(1),
  day: daySchema,
  moduleIds: z.array(z.string().min(1)).min(1),
})

const studyBlockSchema = z.object({
  semesterId: z.string().optional(),
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
  semesterId: z.string().optional(),
  id: z.string().min(1),
  subjectId: z.string().optional(),
  studyBlockId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["baja", "media", "alta"]),
  kind: z.enum(["general", "assessment", "assignment", "event"]).default("general"),
  triggers: z.array(reminderTriggerSchema),
  targetDateTime: z.string().min(1),
  createdAt: z.number().finite(),
  notifiedTriggerIndexes: z.array(z.number().int().nonnegative()),
})

const assessmentStatusSchema = z.enum(["planned", "graded", "missing", "exempt"])
const assessmentGroupSchema = z.object({
  semesterId: z.string().min(1),
  id: z.string().min(1),
  subjectId: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(["continuous", "laboratory", "project", "final_exam", "custom"]),
  courseWeight: z.number().finite().min(0).max(100),
  position: z.number().int().nonnegative(),
  createdAt: z.number().finite(),
})
const gradeSchema = z.object({
  semesterId: z.string().optional(),
  id: z.string().min(1),
  subjectId: z.string().min(1),
  groupId: z.string().optional(),
  title: z.string().min(1),
  score: z.number().finite().nullable(),
  weight: z.number().finite().min(0).max(100),
  weightWithinGroup: z.number().finite().min(0).max(100).optional(),
  date: z.string().min(1),
  status: assessmentStatusSchema.optional(),
  notes: z.string().optional(),
  createdAt: z.number().finite(),
})

const profileSchema = z.object({ displayName: z.string(), avatar: z.string().optional(), institution: z.string().optional(), career: z.string().optional(), timezone: z.string().optional(), onboardingCompletedAt: z.string().optional() })

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
  visibleScheduleDays: z.array(z.enum(["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"])).min(1),
  googleCalendarConnected: z.boolean(),
  advancedModeEnabled: z.boolean().default(false),
  tutorialProgress: z.record(z.string(), z.object({
    version: z.number().int().nonnegative(),
    status: z.enum(["not-started", "in-progress", "completed", "skipped"]),
    currentStep: z.number().int().nonnegative(),
    updatedAt: z.string().optional(),
  })).optional(),
  gradeScale: gradeScaleSchema,
  onboarding: z.object({
    currentStep: z.number().int().nonnegative(),
    completed: z.boolean(),
    updatedAt: z.string().optional(),
    activationCompletedAt: z.string().optional(),
    draftSubjectName: z.string().optional(),
    draftSemesterName: z.string().optional(),
  }),
})

const semesterSchema = z.object({ id: z.string().min(1), name: z.string().min(1), startsOn: z.string().optional(), endsOn: z.string().optional(), status: z.enum(["planned", "active", "archived"]), createdAt: z.number().finite() })
const subjectNoteSchema = z.object({
  id: z.string().min(1),
  semesterId: z.string().min(1),
  subjectId: z.string().min(1),
  title: z.string().min(1),
  unit: z.string().optional(),
  content: z.string(),
  document: z.object({ version: z.literal(1), blocks: z.array(z.unknown()) }).optional(),
  createdAt: z.number().finite(),
  updatedAt: z.number().finite(),
})
const subjectNoteAttachmentSchema = z.object({ id: z.string().min(1), semesterId: z.string().min(1), subjectId: z.string().min(1), noteId: z.string().min(1), kind: z.enum(["image", "pdf", "drawing"]), filename: z.string().min(1), mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]), sizeBytes: z.number().nonnegative(), storagePath: z.string().optional(), createdAt: z.number().finite() })

const appDataSchema = z.object({
  subjects: z.array(subjectSchema),
  blocks: z.array(blockSchema),
  studyBlocks: z.array(studyBlockSchema),
  reminders: z.array(reminderSchema),
  modules: z.array(moduleSchema),
  grades: z.array(gradeSchema),
  assessmentGroups: z.array(assessmentGroupSchema),
  subjectNotes: z.array(subjectNoteSchema),
  subjectNoteAttachments: z.array(subjectNoteAttachmentSchema),
  profile: profileSchema,
  settings: settingsSchema,
  semesters: z.array(semesterSchema),
  activeSemesterId: z.string().optional(),
  version: z.literal(6),
})

export type LoadDataResult =
  | { ok: true; data: AppData; raw: string | null }
  | { ok: false; data: AppData; raw: string; errors: string[] }

export interface ImportValidationResult {
  ok: boolean
  data?: AppData
  errors: string[]
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input)
}

function validateOriginalShape(input: unknown): string[] {
  if (!isRecord(input)) return ["El archivo debe contener un objeto JSON."]
  const errors: string[] = []

  for (const field of ARRAY_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, field) && !Array.isArray(input[field])) {
      errors.push(`El campo ${field} debe ser un arreglo.`)
    }
  }

  for (const field of ["settings", "profile"] as const) {
    if (Object.prototype.hasOwnProperty.call(input, field) && !isRecord(input[field])) {
      errors.push(`El campo ${field} debe ser un objeto.`)
    }
  }

  return errors
}

function fallbackId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function normalizeSubjectForStorage(
  subject: Omit<Subject, "id" | "createdAt">,
  existingSubjects: Pick<Subject, "id" | "name" | "commandKey">[],
  options: { id?: string; createdAt?: number; excludeSubjectId?: string } = {},
): Subject {
  const preferred = subject.commandKey ? normalizeCommandKey(subject.commandKey) : commandKeyForSubjectName(subject.name, existingSubjects, options.excludeSubjectId)
  return {
    ...subject,
    id: options.id ?? fallbackId(),
    createdAt: options.createdAt ?? Date.now(),
    commandKey: ensureUniqueCommandKey(preferred, existingSubjects, {
      excludeSubjectId: options.excludeSubjectId,
      fallbackName: subject.name,
    }),
  }
}

function normalizeSubjects(subjects: Subject[]): Subject[] {
  return subjects.reduce<Subject[]>((acc, subject) => {
    acc.push(
      normalizeSubjectForStorage(subject, acc, {
        id: subject.id,
        createdAt: subject.createdAt,
        excludeSubjectId: subject.id,
      }),
    )
    return acc
  }, [])
}

function normalizeAssessmentGroups(data: AppData): AppData["assessmentGroups"] {
  return data.assessmentGroups
}

function normalizeGradeAssessment(grade: AppData["grades"][number], data: AppData): AppData["grades"][number] {
  const subject = data.subjects.find((item) => item.id === grade.subjectId)
  const semesterId = grade.semesterId ?? subject?.semesterId ?? data.activeSemesterId
  const preferredGroupId = grade.groupId ?? (semesterId ? defaultAssessmentGroupId(semesterId, grade.subjectId) : undefined)
  const normalized = { ...grade, semesterId, groupId: preferredGroupId, status: grade.status ?? (grade.score === null ? "planned" : "graded"), weightWithinGroup: grade.weightWithinGroup ?? grade.weight }
  return semesterId ? ensureGradeAssessmentGroup(data, normalized).grade : normalized
}

export function migrateData(parsed: Partial<AppData> & Record<string, unknown>): AppData {
  const legacySettings = parsed.settings as Partial<AppSettings> | undefined
  const visibleScheduleDays = legacySettings?.visibleScheduleDays?.length
    ? legacySettings.visibleScheduleDays
    : [...WEEKDAY_KEYS, ...(legacySettings?.enableSaturday ? ["sabado" as const] : [])]
  const migrated = {
    ...EMPTY_APP_DATA,
    ...parsed,
    settings: { ...EMPTY_APP_DATA.settings, ...(parsed.settings ?? {}), visibleScheduleDays },
    modules: Array.isArray(parsed.modules) && parsed.modules.length ? parsed.modules : EMPTY_APP_DATA.modules,
    grades: Array.isArray(parsed.grades) ? parsed.grades : [],
    assessmentGroups: Array.isArray(parsed.assessmentGroups) ? parsed.assessmentGroups : [],
    subjectNotes: Array.isArray(parsed.subjectNotes) ? parsed.subjectNotes.map((note) => {
      const legacy = note as SubjectNote
      return legacy.document ? legacy : { ...legacy, document: { version: 1 as const, blocks: [{ id: `legacy-${legacy.id}`, type: "paragraph" as const, content: [{ text: legacy.content }] }] } }
    }) : [],
    subjectNoteAttachments: Array.isArray(parsed.subjectNoteAttachments) ? parsed.subjectNoteAttachments : [],
    profile: { ...DEFAULT_PROFILE, ...(parsed.profile ?? {}) },
    semesters: Array.isArray(parsed.semesters) ? parsed.semesters : [],
    activeSemesterId: typeof parsed.activeSemesterId === "string" ? parsed.activeSemesterId : undefined,
    version: 6,
  } as AppData

  migrated.subjects = normalizeSubjects(Array.isArray(migrated.subjects) ? migrated.subjects : [])
  if (migrated.semesters.length === 0 && (migrated.subjects.length || migrated.blocks.length || migrated.grades.length || migrated.reminders.length || migrated.studyBlocks.length)) {
    const initial = { id: "initial-semester", name: "Semestre inicial", status: "active" as const, createdAt: Date.now() }
    migrated.semesters = [initial]
    migrated.activeSemesterId = initial.id
    migrated.subjects = migrated.subjects.map((item) => ({ ...item, semesterId: item.semesterId ?? initial.id }))
    migrated.blocks = migrated.blocks.map((item) => ({ ...item, semesterId: item.semesterId ?? initial.id }))
    migrated.studyBlocks = migrated.studyBlocks.map((item) => ({ ...item, semesterId: item.semesterId ?? initial.id }))
    migrated.reminders = migrated.reminders.map((item) => ({ ...item, semesterId: item.semesterId ?? initial.id }))
    migrated.grades = migrated.grades.map((item) => ({ ...item, semesterId: item.semesterId ?? initial.id }))
  }
  migrated.assessmentGroups = normalizeAssessmentGroups(migrated)
  migrated.grades = migrated.grades.map((grade) => {
    const normalized = normalizeGradeAssessment(grade, migrated)
    migrated.assessmentGroups = ensureGradeAssessmentGroup({ ...migrated, assessmentGroups: migrated.assessmentGroups }, normalized).nextData.assessmentGroups
    return normalized
  })
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

  const groupKeys = new Set(data.assessmentGroups.map((group) => `${group.semesterId}:${group.subjectId}:${group.id}`))
  for (const group of data.assessmentGroups) {
    if (!subjectIds.has(group.subjectId)) errors.push(`Grupo ${group.id} referencia una materia inexistente.`)
  }
  for (const grade of data.grades) {
    if (!subjectIds.has(grade.subjectId)) errors.push(`Nota ${grade.id} referencia una materia inexistente.`)
    if (grade.weight < 0 || grade.weight > 100) errors.push(`Nota ${grade.id} tiene ponderación inválida.`)
    if (grade.status === "graded" && grade.score === null) errors.push(`Nota ${grade.id} está calificada sin puntaje.`)
    if (grade.groupId && grade.semesterId && !groupKeys.has(`${grade.semesterId}:${grade.subjectId}:${grade.groupId}`)) errors.push(`Nota ${grade.id} referencia un grupo inexistente para su semestre y materia.`)
  }
  for (const note of data.subjectNotes) {
    if (!subjectIds.has(note.subjectId)) errors.push(`Apunte ${note.id} referencia una materia inexistente.`)
    const subject = data.subjects.find((item) => item.id === note.subjectId)
    if (subject?.semesterId && subject.semesterId !== note.semesterId) errors.push(`Apunte ${note.id} no pertenece al semestre de su materia.`)
  }

  return errors
}

export function isGradeCompatibleWithScale(score: number | null, scale: GradeScale): boolean {
  return score === null || (Number.isFinite(score) && score >= scale.min && score <= scale.max)
}

export function hasGradesOutsideScale(data: AppData, scale: GradeScale): boolean {
  return data.grades.some((grade) => !isGradeCompatibleWithScale(grade.score, scale))
}

export function validateImportedData(input: unknown): ImportValidationResult {
  try {
    const shapeErrors = validateOriginalShape(input)
    if (shapeErrors.length > 0) return { ok: false, errors: shapeErrors }

    const migrated = migrateData(input as Partial<AppData> & Record<string, unknown>)
    const parsed = appDataSchema.safeParse(migrated)
    if (!parsed.success) {
      return { ok: false, errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) }
    }
    const validated = parsed.data as AppData
    const relationErrors = validateRelations(validated)
    if (relationErrors.length > 0) return { ok: false, errors: relationErrors }
    return { ok: true, data: validated, errors: [] }
  } catch (error) {
    return { ok: false, errors: [error instanceof Error ? error.message : "Error desconocido de importación."] }
  }
}

export function loadDataResult(): LoadDataResult {
  if (typeof window === "undefined") return { ok: true, data: EMPTY_APP_DATA, raw: null }
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return { ok: true, data: EMPTY_APP_DATA, raw: null }

  try {
    const parsed = JSON.parse(raw) as unknown
    const validation = validateImportedData(parsed)
    if (!validation.ok || !validation.data) {
      console.warn("[Horaly] Datos locales inválidos; se conserva el almacenamiento original.", validation.errors)
      return { ok: false, data: EMPTY_APP_DATA, raw, errors: validation.errors }
    }
    return { ok: true, data: validation.data, raw }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error cargando datos locales."
    console.warn("[Horaly] Error cargando datos; se conserva el almacenamiento original:", err)
    return { ok: false, data: EMPTY_APP_DATA, raw, errors: [message] }
  }
}

export function loadData(): AppData {
  return loadDataResult().data
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
