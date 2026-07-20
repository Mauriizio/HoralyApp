import { EMPTY_APP_DATA, type AppData, type DayKey, type DifficultyLevel, type ReminderPriority } from "@/lib/types"

export type SupabaseRow = Record<string, unknown>
export type SupabaseDataset = {
  subjects: SupabaseRow[]
  schedule_blocks: SupabaseRow[]
  study_blocks: SupabaseRow[]
  reminders: SupabaseRow[]
  grades: SupabaseRow[]
  user_settings: SupabaseRow[]
  semesters: SupabaseRow[]
  profiles: SupabaseRow[]
}
const iso = (value?: number) => new Date(value ?? Date.now()).toISOString()
const ms = (value: unknown) => typeof value === "string" ? new Date(value).getTime() : Date.now()
const str = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback
const optStr = (value: unknown) => typeof value === "string" && value.length ? value : undefined
const arr = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []

export function appDataToSupabaseRows(data: AppData, userId: string, email?: string): SupabaseDataset {
  const now = new Date().toISOString()
  return {
    semesters: data.semesters.map((m) => ({ id: m.id, user_id: userId, name: m.name, starts_on: m.startsOn, ends_on: m.endsOn, status: m.status, created_at: iso(m.createdAt), updated_at: now })),
    subjects: data.subjects.map((s) => ({ id: s.id, user_id: userId, semester_id: s.semesterId ?? data.activeSemesterId, name: s.name, color: s.color, icon: s.icon, notes: s.notes, command_key: s.commandKey, difficulty: s.difficulty, created_at: iso(s.createdAt), updated_at: now })),
    schedule_blocks: data.blocks.map((b) => ({ id: b.id, user_id: userId, semester_id: b.semesterId ?? data.activeSemesterId, subject_id: b.subjectId, day: b.day, module_ids: b.moduleIds, created_at: now, updated_at: now })),
    study_blocks: data.studyBlocks.map((b) => ({ id: b.id, user_id: userId, semester_id: b.semesterId ?? data.activeSemesterId, subject_id: b.subjectId, day: b.day, title: b.title, start_time: b.start, end_time: b.end, notes: b.notes, created_at: now, updated_at: now })),
    reminders: data.reminders.map((r) => ({ id: r.id, user_id: userId, semester_id: r.semesterId ?? data.activeSemesterId, subject_id: r.subjectId, study_block_id: r.studyBlockId, title: r.title, description: r.description, priority: r.priority, triggers: r.triggers, target_date_time: r.targetDateTime, notified_trigger_indexes: r.notifiedTriggerIndexes, created_at: iso(r.createdAt), updated_at: now })),
    grades: data.grades.map((g) => ({ id: g.id, user_id: userId, semester_id: g.semesterId ?? data.activeSemesterId, subject_id: g.subjectId, title: g.title, score: g.score, weight: g.weight, grade_date: g.date, notes: g.notes, created_at: iso(g.createdAt), updated_at: now })),
    user_settings: [{ id: "settings", user_id: userId, settings: { ...data.settings, modules: data.modules, activeSemesterId: data.activeSemesterId }, created_at: now, updated_at: now }],
    profiles: [{ id: userId, user_id: userId, display_name: data.profile.displayName, email: email ?? null, avatar_url: data.profile.avatar, created_at: now, updated_at: now }],
  }
}

export function supabaseRowsToAppData(rows: Partial<SupabaseDataset>): AppData {
  const settingsRow = rows.user_settings?.[0]?.settings as (Partial<AppData["settings"]> & { modules?: AppData["modules"]; activeSemesterId?: string }) | undefined
  const settings = settingsRow ? { ...EMPTY_APP_DATA.settings, ...settingsRow } : EMPTY_APP_DATA.settings
  const modules = Array.isArray(settingsRow?.modules) ? settingsRow.modules : EMPTY_APP_DATA.modules
  const profileRow = rows.profiles?.[0]
  return {
    ...EMPTY_APP_DATA,
    semesters: (rows.semesters ?? []).map((m) => ({ id: str(m.id), name: str(m.name), startsOn: optStr(m.starts_on), endsOn: optStr(m.ends_on), status: str(m.status, "planned") as AppData["semesters"][number]["status"], createdAt: ms(m.created_at) })),
    activeSemesterId: typeof settingsRow?.activeSemesterId === "string" ? settingsRow.activeSemesterId : optStr((rows.semesters ?? []).find((m) => m.status === "active")?.id),
    subjects: (rows.subjects ?? []).map((s) => ({ id: str(s.id), semesterId: optStr(s.semester_id), name: str(s.name), color: str(s.color), icon: optStr(s.icon), notes: optStr(s.notes), commandKey: optStr(s.command_key), difficulty: (Number(s.difficulty) || 3) as DifficultyLevel, createdAt: ms(s.created_at) })),
    blocks: (rows.schedule_blocks ?? []).map((b) => ({ id: str(b.id), semesterId: optStr(b.semester_id), subjectId: str(b.subject_id), day: str(b.day, "lunes") as DayKey, moduleIds: arr(b.module_ids) })),
    studyBlocks: (rows.study_blocks ?? []).map((b) => ({ id: str(b.id), semesterId: optStr(b.semester_id), subjectId: optStr(b.subject_id), day: str(b.day, "lunes") as DayKey, title: str(b.title), start: str(b.start_time), end: str(b.end_time), notes: optStr(b.notes) })),
    reminders: (rows.reminders ?? []).map((r) => ({ id: str(r.id), semesterId: optStr(r.semester_id), subjectId: optStr(r.subject_id), studyBlockId: optStr(r.study_block_id), title: str(r.title), description: optStr(r.description), priority: str(r.priority, "media") as ReminderPriority, triggers: Array.isArray(r.triggers) ? r.triggers as AppData["reminders"][number]["triggers"] : [], targetDateTime: str(r.target_date_time), createdAt: ms(r.created_at), notifiedTriggerIndexes: Array.isArray(r.notified_trigger_indexes) ? r.notified_trigger_indexes.filter((n): n is number => typeof n === "number") : [] })),
    grades: (rows.grades ?? []).map((g) => ({ id: str(g.id), semesterId: optStr(g.semester_id), subjectId: str(g.subject_id), title: str(g.title), score: Number(g.score) || 0, weight: Number(g.weight) || 1, date: str(g.grade_date), notes: optStr(g.notes), createdAt: ms(g.created_at) })),
    modules,
    settings,
    profile: { displayName: str(profileRow?.display_name), avatar: optStr(profileRow?.avatar_url), institution: optStr(profileRow?.institution), career: optStr(profileRow?.career), timezone: optStr(profileRow?.timezone), onboardingCompletedAt: optStr(profileRow?.onboarding_completed_at) },
    version: 4,
  }
}
