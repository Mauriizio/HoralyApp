import { EMPTY_APP_DATA, type AppData } from "@/lib/types"

export type SupabaseDataset = Record<string, any[]>
const iso = (ms?: number) => new Date(ms ?? Date.now()).toISOString()
const ms = (value: string | null | undefined) => value ? new Date(value).getTime() : Date.now()

export function appDataToSupabaseRows(data: AppData, userId: string): SupabaseDataset {
  return {
    subjects: data.subjects.map((s) => ({ id: s.id, user_id: userId, name: s.name, color: s.color, icon: s.icon, notes: s.notes, command_key: s.commandKey, difficulty: s.difficulty, created_at: iso(s.createdAt), updated_at: new Date().toISOString() })),
    schedule_blocks: data.blocks.map((b) => ({ id: b.id, user_id: userId, subject_id: b.subjectId, day: b.day, module_ids: b.moduleIds, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })),
    study_blocks: data.studyBlocks.map((b) => ({ id: b.id, user_id: userId, subject_id: b.subjectId, day: b.day, title: b.title, start_time: b.start, end_time: b.end, notes: b.notes, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })),
    reminders: data.reminders.map((r) => ({ id: r.id, user_id: userId, subject_id: r.subjectId, study_block_id: r.studyBlockId, title: r.title, description: r.description, priority: r.priority, triggers: r.triggers, target_date_time: r.targetDateTime, notified_trigger_indexes: r.notifiedTriggerIndexes, created_at: iso(r.createdAt), updated_at: new Date().toISOString() })),
    grades: data.grades.map((g) => ({ id: g.id, user_id: userId, subject_id: g.subjectId, title: g.title, score: g.score, weight: g.weight, grade_date: g.date, notes: g.notes, created_at: iso(g.createdAt), updated_at: new Date().toISOString() })),
    user_settings: [{ id: "settings", user_id: userId, settings: data.settings, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }],
    profiles: [{ id: userId, user_id: userId, display_name: data.profile.displayName, avatar_url: data.profile.avatar, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }],
  }
}

export function supabaseRowsToAppData(rows: Partial<SupabaseDataset>): AppData {
  const settings = rows.user_settings?.[0]?.settings ?? EMPTY_APP_DATA.settings
  const profileRow = rows.profiles?.[0]
  return {
    ...EMPTY_APP_DATA,
    subjects: (rows.subjects ?? []).map((s) => ({ id: s.id, name: s.name, color: s.color, icon: s.icon, notes: s.notes, commandKey: s.command_key, difficulty: s.difficulty, createdAt: ms(s.created_at) })),
    blocks: (rows.schedule_blocks ?? []).map((b) => ({ id: b.id, subjectId: b.subject_id, day: b.day, moduleIds: b.module_ids ?? [] })),
    studyBlocks: (rows.study_blocks ?? []).map((b) => ({ id: b.id, subjectId: b.subject_id, day: b.day, title: b.title, start: b.start_time, end: b.end_time, notes: b.notes })),
    reminders: (rows.reminders ?? []).map((r) => ({ id: r.id, subjectId: r.subject_id, studyBlockId: r.study_block_id, title: r.title, description: r.description, priority: r.priority, triggers: r.triggers ?? [], targetDateTime: r.target_date_time, createdAt: ms(r.created_at), notifiedTriggerIndexes: r.notified_trigger_indexes ?? [] })),
    grades: (rows.grades ?? []).map((g) => ({ id: g.id, subjectId: g.subject_id, title: g.title, score: g.score, weight: g.weight, date: g.grade_date, notes: g.notes, createdAt: ms(g.created_at) })),
    settings,
    profile: { displayName: profileRow?.display_name ?? "", avatar: profileRow?.avatar_url },
    version: 3,
  }
}
