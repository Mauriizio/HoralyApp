import type { SupabaseClient } from "@supabase/supabase-js"
import type { AppData, AssessmentGroup, Grade, Reminder, ScheduleBlock, StudyBlock, Subject, SubjectNote, AppSettings, UserProfile } from "@/lib/types"
import { EMPTY_APP_DATA } from "@/lib/types"
import { loadData, saveData } from "@/lib/storage"
import { SessionIdentityMismatchError } from "@/lib/session-identity"
import { appDataToSupabaseRows, assessmentGroupToSupabaseRow, gradeToSupabaseRow, reminderToSupabaseRow, scheduleBlockToSupabaseRow, studyBlockToSupabaseRow, subjectNoteToSupabaseRow, subjectToSupabaseRow, supabaseRowsToAppData, type SupabaseDataset } from "./supabase-mappers"

export type SyncStatus = "local" | "loading" | "syncing" | "synced" | "error" | "offline"

export interface AcademicRepository {
  readonly kind: "local" | "supabase"
  readonly userIdForCache?: string
  loadData(): Promise<AppData>
  replaceAll(data: AppData): Promise<void>
  saveSubject(subject: Subject): Promise<void>
  updateSubject(subject: Subject): Promise<void>
  deleteSubject(id: string): Promise<void>
  saveScheduleBlock(block: ScheduleBlock): Promise<void>
  deleteScheduleBlock(id: string): Promise<void>
  saveStudyBlock(block: StudyBlock): Promise<void>
  deleteStudyBlock(id: string): Promise<void>
  saveReminder(reminder: Reminder): Promise<void>
  deleteReminder(id: string): Promise<void>
  saveAssessmentGroup(group: AssessmentGroup): Promise<void>
  deleteAssessmentGroup(id: string): Promise<void>
  saveGrade(grade: Grade): Promise<void>
  deleteGrade(id: string): Promise<void>
  saveSubjectNote(note: SubjectNote): Promise<void>
  deleteSubjectNote(id: string): Promise<void>
  updateSettings(settings: AppSettings, modules: AppData["modules"]): Promise<void>
  updateProfile(profile: UserProfile, email?: string): Promise<void>
  assertRepositoryOwner(expectedUserId: string): void
}

export class LocalAcademicRepository implements AcademicRepository {
  readonly kind = "local" as const
  async loadData() { return loadData() }
  async replaceAll(data: AppData) { saveData(data) }
  async saveSubject() {}
  async updateSubject() {}
  async deleteSubject() {}
  async saveScheduleBlock() {}
  async deleteScheduleBlock() {}
  async saveStudyBlock() {}
  async deleteStudyBlock() {}
  async saveReminder() {}
  async deleteReminder() {}
  async saveAssessmentGroup() {}
  async deleteAssessmentGroup() {}
  async saveGrade() {}
  async deleteGrade() {}
  async saveSubjectNote() {}
  async deleteSubjectNote() {}
  async updateSettings() {}
  async updateProfile() {}
  assertRepositoryOwner() {}
}

const DATA_TABLES = ["semesters", "subjects", "schedule_blocks", "study_blocks", "reminders", "assessment_groups", "grades", "subject_notes", "subject_note_attachments", "user_settings", "profiles"] as const
const REPLACE_DELETE_TABLES = ["schedule_blocks", "study_blocks", "reminders", "grades", "assessment_groups", "subject_note_attachments", "subject_notes", "subjects", "semesters"] as const

export class SupabaseAcademicRepository implements AcademicRepository {
  readonly kind = "supabase" as const
  constructor(private client: SupabaseClient, public readonly userIdForCache: string) {}

  assertRepositoryOwner(expectedUserId: string) {
    if (this.userIdForCache !== expectedUserId) throw new SessionIdentityMismatchError()
  }

  private async upsert(table: keyof SupabaseDataset, values: object[], onConflict = "id,user_id") {
    if (!values.length) return
    const conflict = table === "profiles" ? "id" : onConflict
    const { error } = await this.client.from(table).upsert(values, { onConflict: conflict })
    if (error) throw new Error("No se pudieron sincronizar tus datos.")
  }

  private async deleteById(table: string, id: string) {
    const { error } = await this.client.from(table).delete().eq("id", id).eq("user_id", this.userIdForCache)
    if (error) throw new Error("No se pudo eliminar el dato sincronizado.")
  }

  private async deleteWhere(table: string, column: string, value: string) {
    const { error } = await this.client.from(table).delete().eq(column, value).eq("user_id", this.userIdForCache)
    if (error) throw new Error("No se pudieron limpiar dependencias sincronizadas.")
  }

  private async deleteObsolete(table: (typeof REPLACE_DELETE_TABLES)[number], keepIds: string[]) {
    let query = this.client.from(table).delete().eq("user_id", this.userIdForCache)
    if (keepIds.length > 0) query = query.not("id", "in", `(${keepIds.map((id) => `"${id.replaceAll('"', '\\"')}"`).join(",")})`)
    const { error } = await query
    if (error) throw new Error("No se pudieron eliminar filas obsoletas en Supabase.")
  }

  async ensureProfile(email?: string) {
    const { error } = await this.client.from("profiles").upsert({ id: this.userIdForCache, user_id: this.userIdForCache, email: email ?? null }, { onConflict: "id" })
    if (error) throw new Error("No se pudo preparar tu perfil sincronizado.")
  }

  async loadData(): Promise<AppData> {
    const dataset: Partial<SupabaseDataset> = {}
    for (const table of DATA_TABLES) {
      const { data, error } = await this.client.from(table).select("*").eq("user_id", this.userIdForCache)
      if (error) throw new Error("No se pudieron cargar tus datos sincronizados.")
      dataset[table] = data ?? []
    }
    return supabaseRowsToAppData(dataset)
  }

  async replaceAll(data: AppData): Promise<void> {
    const rows = appDataToSupabaseRows(data, this.userIdForCache)
    const keepByTable = {
      semesters: data.semesters.map((item) => item.id),
      subjects: data.subjects.map((item) => item.id),
      schedule_blocks: data.blocks.map((item) => item.id),
      study_blocks: data.studyBlocks.map((item) => item.id),
      reminders: data.reminders.map((item) => item.id),
      assessment_groups: data.assessmentGroups.map((item) => item.id),
      grades: data.grades.map((item) => item.id),
      subject_notes: data.subjectNotes.map((item) => item.id),
      subject_note_attachments: data.subjectNoteAttachments.map((item) => item.id),
    }
    for (const table of REPLACE_DELETE_TABLES) await this.deleteObsolete(table, keepByTable[table])
    for (const table of ["profiles", "user_settings", "semesters", "subjects", "assessment_groups", "schedule_blocks", "study_blocks", "reminders", "grades", "subject_notes", "subject_note_attachments"] as (keyof SupabaseDataset)[]) {
      await this.upsert(table, rows[table])
    }
  }

  async saveSubject(subject: Subject) { await this.upsert("subjects", [subjectToSupabaseRow(subject, this.userIdForCache)]) }
  async updateSubject(subject: Subject) { await this.saveSubject(subject) }
  async deleteSubject(id: string) {
    await this.deleteWhere("schedule_blocks", "subject_id", id)
    await this.deleteWhere("grades", "subject_id", id)
    await this.deleteWhere("assessment_groups", "subject_id", id)
    await this.deleteWhere("reminders", "subject_id", id)
    await this.deleteWhere("subject_notes", "subject_id", id)
    const { error: studyError } = await this.client.from("study_blocks").update({ subject_id: null }).eq("subject_id", id).eq("user_id", this.userIdForCache)
    if (studyError) throw new Error("No se pudieron desvincular bloques de estudio sincronizados.")
    await this.deleteById("subjects", id)
  }
  async saveScheduleBlock(block: ScheduleBlock) { await this.upsert("schedule_blocks", [scheduleBlockToSupabaseRow(block, this.userIdForCache)]) }
  async deleteScheduleBlock(id: string) { await this.deleteById("schedule_blocks", id) }
  async saveStudyBlock(block: StudyBlock) { await this.upsert("study_blocks", [studyBlockToSupabaseRow(block, this.userIdForCache)]) }
  async deleteStudyBlock(id: string) { await this.deleteById("study_blocks", id) }
  async saveReminder(reminder: Reminder) { await this.upsert("reminders", [reminderToSupabaseRow(reminder, this.userIdForCache)]) }
  async deleteReminder(id: string) { await this.deleteById("reminders", id) }
  async saveAssessmentGroup(group: AssessmentGroup) { await this.upsert("assessment_groups", [assessmentGroupToSupabaseRow(group, this.userIdForCache)]) }
  async deleteAssessmentGroup(id: string) { await this.deleteById("assessment_groups", id) }
  async saveGrade(grade: Grade) { await this.upsert("grades", [gradeToSupabaseRow(grade, this.userIdForCache)]) }
  async deleteGrade(id: string) { await this.deleteById("grades", id) }
  async saveSubjectNote(note: SubjectNote) { await this.upsert("subject_notes", [subjectNoteToSupabaseRow(note, this.userIdForCache)]) }
  async deleteSubjectNote(id: string) { await this.deleteById("subject_notes", id) }
  async updateSettings(settings: AppSettings, modules: AppData["modules"]) { await this.upsert("user_settings", appDataToSupabaseRows({ ...EMPTY_APP_DATA, settings, modules }, this.userIdForCache).user_settings) }
  async updateProfile(profile: UserProfile, email?: string) { await this.upsert("profiles", appDataToSupabaseRows({ ...EMPTY_APP_DATA, profile }, this.userIdForCache, email).profiles) }
}

export function selectAcademicRepository(session: { user?: { id: string } } | null, client?: SupabaseClient | null): AcademicRepository {
  if (session?.user?.id && client) return new SupabaseAcademicRepository(client, session.user.id)
  return new LocalAcademicRepository()
}
