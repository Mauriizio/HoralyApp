import { EMPTY_APP_DATA, type AppData, type DayKey, type DifficultyLevel, type ReminderPriority } from "@/lib/types"
import { ensureGradeAssessmentGroup } from "@/lib/assessment-groups"

export type SupabaseRow = Record<string, unknown>
export type SupabaseDataset = {
  subjects: SupabaseRow[]
  schedule_blocks: SupabaseRow[]
  study_blocks: SupabaseRow[]
  reminders: SupabaseRow[]
  grades: SupabaseRow[]
  assessment_groups: SupabaseRow[]
  user_settings: SupabaseRow[]
  semesters: SupabaseRow[]
  profiles: SupabaseRow[]
}
const iso = (value?: number) => new Date(value ?? Date.now()).toISOString()
const ms = (value: unknown) => typeof value === "string" ? new Date(value).getTime() : Date.now()
const str = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback
const optStr = (value: unknown) => typeof value === "string" && value.length ? value : undefined
const arr = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []

function profileRow(data: AppData, userId: string, email?: string): SupabaseRow {
  const row: SupabaseRow = {
    id: userId,
    user_id: userId,
    display_name: data.profile.displayName,
    avatar_url: data.profile.avatar ?? null,
    institution: data.profile.institution ?? null,
    career: data.profile.career ?? null,
    timezone: data.profile.timezone ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  if (email !== undefined) row.email = email
  if (data.profile.onboardingCompletedAt) row.onboarding_completed_at = data.profile.onboardingCompletedAt
  return row
}

export function requireSemesterId(value: string | undefined, entity: string): string {
  if (!value) throw new Error(`No se puede guardar ${entity} sin semestre activo.`)
  return value
}

export function requireSubjectId(value: string | undefined, entity: string): string {
  if (!value) throw new Error(`No se puede guardar ${entity} sin materia.`)
  return value
}

export function requireGroupId(value: string | undefined, entity: string): string {
  if (!value) throw new Error(`No se puede guardar ${entity} sin grupo de evaluación.`)
  return value
}

export function subjectToSupabaseRow(subject: AppData["subjects"][number], userId: string): SupabaseRow {
  return { id: subject.id, user_id: userId, semester_id: requireSemesterId(subject.semesterId, "la materia"), name: subject.name, color: subject.color, icon: subject.icon, notes: subject.notes, command_key: subject.commandKey, difficulty: subject.difficulty, created_at: iso(subject.createdAt), updated_at: new Date().toISOString() }
}

export function scheduleBlockToSupabaseRow(block: AppData["blocks"][number], userId: string): SupabaseRow {
  return { id: block.id, user_id: userId, semester_id: requireSemesterId(block.semesterId, "el bloque horario"), subject_id: block.subjectId, day: block.day, module_ids: block.moduleIds, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
}

export function studyBlockToSupabaseRow(block: AppData["studyBlocks"][number], userId: string): SupabaseRow {
  return { id: block.id, user_id: userId, semester_id: requireSemesterId(block.semesterId, "el bloque de estudio"), subject_id: block.subjectId, day: block.day, title: block.title, start_time: block.start, end_time: block.end, notes: block.notes, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
}

export function reminderToSupabaseRow(reminder: AppData["reminders"][number], userId: string): SupabaseRow {
  return { id: reminder.id, user_id: userId, semester_id: requireSemesterId(reminder.semesterId, "el recordatorio"), subject_id: reminder.subjectId, study_block_id: reminder.studyBlockId, title: reminder.title, description: reminder.description, priority: reminder.priority, triggers: reminder.triggers, target_date_time: reminder.targetDateTime, notified_trigger_indexes: reminder.notifiedTriggerIndexes, created_at: iso(reminder.createdAt), updated_at: new Date().toISOString() }
}

export function assessmentGroupToSupabaseRow(group: AppData["assessmentGroups"][number], userId: string): SupabaseRow {
  return { id: group.id, user_id: userId, semester_id: requireSemesterId(group.semesterId, "el grupo de evaluación"), subject_id: group.subjectId, name: group.name, kind: group.kind, course_weight: group.courseWeight, position: group.position, created_at: iso(group.createdAt), updated_at: new Date().toISOString() }
}

export function gradeToSupabaseRow(grade: AppData["grades"][number], userId: string): SupabaseRow {
  return { id: grade.id, user_id: userId, semester_id: requireSemesterId(grade.semesterId, "la evaluación"), subject_id: requireSubjectId(grade.subjectId, "la evaluación"), group_id: requireGroupId(grade.groupId, "la evaluación"), title: grade.title, score: grade.score, weight: grade.weightWithinGroup ?? grade.weight, grade_date: grade.date, status: grade.status ?? (grade.score === null ? "planned" : "graded"), notes: grade.notes, created_at: iso(grade.createdAt), updated_at: new Date().toISOString() }
}


function dataWithRequiredSemesters(data: AppData): AppData {
  const hasEntities = data.subjects.length > 0 || data.blocks.length > 0 || data.studyBlocks.length > 0 || data.reminders.length > 0 || data.grades.length > 0 || data.assessmentGroups.length > 0
  if (!hasEntities) return data
  const activeSemesterId = data.activeSemesterId ?? data.semesters.find((semester) => semester.status === "active")?.id ?? "initial-semester"
  const semesters = data.semesters.some((semester) => semester.id === activeSemesterId)
    ? data.semesters
    : [...data.semesters, { id: activeSemesterId, name: "Semestre inicial", status: "active" as const, createdAt: Date.now() }]
  return {
    ...data,
    semesters,
    activeSemesterId,
    subjects: data.subjects.map((item) => ({ ...item, semesterId: item.semesterId ?? activeSemesterId })),
    blocks: data.blocks.map((item) => ({ ...item, semesterId: item.semesterId ?? activeSemesterId })),
    studyBlocks: data.studyBlocks.map((item) => ({ ...item, semesterId: item.semesterId ?? activeSemesterId })),
    reminders: data.reminders.map((item) => ({ ...item, semesterId: item.semesterId ?? activeSemesterId })),
    grades: data.grades.map((item) => ({ ...item, semesterId: item.semesterId ?? activeSemesterId })),
    assessmentGroups: data.assessmentGroups.map((item) => ({ ...item, semesterId: item.semesterId ?? activeSemesterId })),
  }
}

export function appDataToSupabaseRows(data: AppData, userId: string, email?: string): SupabaseDataset {
  const normalizedData = dataWithRequiredSemesters(data)
  const dataWithGradeGroups = normalizedData.grades.reduce((current, grade, index) => {
    const ensured = ensureGradeAssessmentGroup(current, grade)
    current = ensured.nextData
    current.grades = current.grades.map((item, itemIndex) => itemIndex === index ? ensured.grade : item)
    return current
  }, normalizedData)
  const now = new Date().toISOString()
  return {
    semesters: dataWithGradeGroups.semesters.map((m) => ({ id: m.id, user_id: userId, name: m.name, starts_on: m.startsOn, ends_on: m.endsOn, status: m.status, created_at: iso(m.createdAt), updated_at: now })),
    subjects: dataWithGradeGroups.subjects.map((s) => subjectToSupabaseRow({ ...s, semesterId: s.semesterId ?? dataWithGradeGroups.activeSemesterId }, userId)),
    schedule_blocks: dataWithGradeGroups.blocks.map((b) => scheduleBlockToSupabaseRow({ ...b, semesterId: b.semesterId ?? dataWithGradeGroups.activeSemesterId }, userId)),
    study_blocks: dataWithGradeGroups.studyBlocks.map((b) => studyBlockToSupabaseRow({ ...b, semesterId: b.semesterId ?? dataWithGradeGroups.activeSemesterId }, userId)),
    reminders: dataWithGradeGroups.reminders.map((r) => reminderToSupabaseRow({ ...r, semesterId: r.semesterId ?? dataWithGradeGroups.activeSemesterId }, userId)),
    assessment_groups: dataWithGradeGroups.assessmentGroups.map((g) => assessmentGroupToSupabaseRow({ ...g, semesterId: g.semesterId ?? dataWithGradeGroups.activeSemesterId }, userId)),
    grades: dataWithGradeGroups.grades.map((g) => gradeToSupabaseRow({ ...g, semesterId: g.semesterId ?? dataWithGradeGroups.activeSemesterId }, userId)),
    user_settings: [{ id: "settings", user_id: userId, settings: { ...dataWithGradeGroups.settings, modules: dataWithGradeGroups.modules, activeSemesterId: dataWithGradeGroups.activeSemesterId }, created_at: now, updated_at: now }],
    profiles: [profileRow(dataWithGradeGroups, userId, email)],
  }
}

export function supabaseRowsToAppData(rows: Partial<SupabaseDataset>): AppData {
  const settingsRow = rows.user_settings?.[0]?.settings as (Partial<AppData["settings"]> & { modules?: AppData["modules"]; activeSemesterId?: string }) | undefined
  const settings = settingsRow ? { ...EMPTY_APP_DATA.settings, ...settingsRow } : EMPTY_APP_DATA.settings
  const modules = Array.isArray(settingsRow?.modules) ? settingsRow.modules : EMPTY_APP_DATA.modules
  const profileRow = rows.profiles?.[0]
  const restored: AppData = {
    ...EMPTY_APP_DATA,
    semesters: (rows.semesters ?? []).map((m) => ({ id: str(m.id), name: str(m.name), startsOn: optStr(m.starts_on), endsOn: optStr(m.ends_on), status: str(m.status, "planned") as AppData["semesters"][number]["status"], createdAt: ms(m.created_at) })),
    activeSemesterId: typeof settingsRow?.activeSemesterId === "string" ? settingsRow.activeSemesterId : optStr((rows.semesters ?? []).find((m) => m.status === "active")?.id),
    subjects: (rows.subjects ?? []).map((s) => ({ id: str(s.id), semesterId: optStr(s.semester_id), name: str(s.name), color: str(s.color), icon: optStr(s.icon), notes: optStr(s.notes), commandKey: optStr(s.command_key), difficulty: (Number(s.difficulty) || 3) as DifficultyLevel, createdAt: ms(s.created_at) })),
    blocks: (rows.schedule_blocks ?? []).map((b) => ({ id: str(b.id), semesterId: optStr(b.semester_id), subjectId: str(b.subject_id), day: str(b.day, "lunes") as DayKey, moduleIds: arr(b.module_ids) })),
    studyBlocks: (rows.study_blocks ?? []).map((b) => ({ id: str(b.id), semesterId: optStr(b.semester_id), subjectId: optStr(b.subject_id), day: str(b.day, "lunes") as DayKey, title: str(b.title), start: str(b.start_time), end: str(b.end_time), notes: optStr(b.notes) })),
    reminders: (rows.reminders ?? []).map((r) => ({ id: str(r.id), semesterId: optStr(r.semester_id), subjectId: optStr(r.subject_id), studyBlockId: optStr(r.study_block_id), title: str(r.title), description: optStr(r.description), priority: str(r.priority, "media") as ReminderPriority, triggers: Array.isArray(r.triggers) ? r.triggers as AppData["reminders"][number]["triggers"] : [], targetDateTime: str(r.target_date_time), createdAt: ms(r.created_at), notifiedTriggerIndexes: Array.isArray(r.notified_trigger_indexes) ? r.notified_trigger_indexes.filter((n): n is number => typeof n === "number") : [] })),
    assessmentGroups: (rows.assessment_groups ?? []).map((g) => ({ id: str(g.id), semesterId: str(g.semester_id), subjectId: str(g.subject_id), name: str(g.name), kind: str(g.kind, "continuous") as AppData["assessmentGroups"][number]["kind"], courseWeight: Number(g.course_weight) || 0, position: Number(g.position) || 0, createdAt: ms(g.created_at) })),
    grades: (rows.grades ?? []).map((g) => ({ id: str(g.id), semesterId: optStr(g.semester_id), subjectId: str(g.subject_id), groupId: optStr(g.group_id), title: str(g.title), score: g.score === null || g.score === undefined ? null : Number(g.score), weight: Number(g.weight) || 0, weightWithinGroup: Number(g.weight) || 0, date: str(g.grade_date), status: str(g.status, g.score === null ? "planned" : "graded") as AppData["grades"][number]["status"], notes: optStr(g.notes), createdAt: ms(g.created_at) })),
    modules,
    settings,
    profile: { displayName: str(profileRow?.display_name), avatar: optStr(profileRow?.avatar_url), institution: optStr(profileRow?.institution), career: optStr(profileRow?.career), timezone: optStr(profileRow?.timezone), onboardingCompletedAt: optStr(profileRow?.onboarding_completed_at) },
    version: 4 as const,
  }
  return restored.grades.reduce((current, grade, index) => {
    const ensured = ensureGradeAssessmentGroup(current, grade)
    current = ensured.nextData
    current.grades = current.grades.map((item, itemIndex) => itemIndex === index ? ensured.grade : item)
    return current
  }, restored)
}
