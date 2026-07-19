import type { SupabaseClient } from "@supabase/supabase-js"
import type { AppData, Grade, Reminder, ScheduleBlock, StudyBlock, Subject, AppSettings, UserProfile } from "@/lib/types"
import { EMPTY_APP_DATA } from "@/lib/types"
import { loadData, saveData } from "@/lib/storage"
import { appDataToSupabaseRows, supabaseRowsToAppData, type SupabaseDataset } from "./supabase-mappers"

export type SyncStatus = "local" | "loading" | "syncing" | "synced" | "error" | "offline"

export interface AcademicRepository {
  readonly kind: "local" | "supabase"
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
  saveGrade(grade: Grade): Promise<void>
  deleteGrade(id: string): Promise<void>
  updateSettings(settings: AppSettings, modules: AppData["modules"]): Promise<void>
  updateProfile(profile: UserProfile, email?: string): Promise<void>
}

export class LocalAcademicRepository implements AcademicRepository {
  readonly kind = "local" as const
  async loadData() { return loadData() }
  async replaceAll(data: AppData) { saveData(data) }
  async saveSubject() { /* localStorage lo maneja el store */ }
  async updateSubject() {}
  async deleteSubject() {}
  async saveScheduleBlock() {}
  async deleteScheduleBlock() {}
  async saveStudyBlock() {}
  async deleteStudyBlock() {}
  async saveReminder() {}
  async deleteReminder() {}
  async saveGrade() {}
  async deleteGrade() {}
  async updateSettings() {}
  async updateProfile() {}
}

export class SupabaseAcademicRepository implements AcademicRepository {
  readonly kind = "supabase" as const
  constructor(private client: SupabaseClient, private userId: string) {}

  private async upsert(table: keyof SupabaseDataset, values: object[], onConflict = "id,user_id") {
    if (!values.length) return
    const conflict = table === "profiles" ? "id" : onConflict
    const { error } = await this.client.from(table).upsert(values, { onConflict: conflict })
    if (error) throw new Error("No se pudieron sincronizar tus datos.")
  }

  private async delete(table: string, id: string) {
    const { error } = await this.client.from(table).delete().eq("id", id).eq("user_id", this.userId)
    if (error) throw new Error("No se pudo eliminar el dato sincronizado.")
  }

  async ensureProfile(email?: string) {
    const { error } = await this.client.from("profiles").upsert({ id: this.userId, user_id: this.userId, email: email ?? null }, { onConflict: "id" })
    if (error) throw new Error("No se pudo preparar tu perfil sincronizado.")
  }

  async loadData(): Promise<AppData> {
    const dataset: Partial<SupabaseDataset> = {}
    for (const table of ["subjects", "schedule_blocks", "study_blocks", "reminders", "grades", "user_settings", "profiles"] as const) {
      const { data, error } = await this.client.from(table).select("*").eq("user_id", this.userId)
      if (error) throw new Error("No se pudieron cargar tus datos sincronizados.")
      dataset[table] = data ?? []
    }
    return supabaseRowsToAppData(dataset)
  }

  async replaceAll(data: AppData): Promise<void> {
    const rows = appDataToSupabaseRows(data, this.userId)
    for (const [table, values] of Object.entries(rows) as [keyof SupabaseDataset, object[]][]) await this.upsert(table, values)
  }
  async saveSubject(subject: Subject) { await this.upsert("subjects", appDataToSupabaseRows({ ...EMPTY_APP_DATA, subjects: [subject] }, this.userId).subjects) }
  async updateSubject(subject: Subject) { await this.saveSubject(subject) }
  async deleteSubject(id: string) { await this.delete("subjects", id) }
  async saveScheduleBlock(block: ScheduleBlock) { await this.upsert("schedule_blocks", appDataToSupabaseRows({ ...EMPTY_APP_DATA, blocks: [block] }, this.userId).schedule_blocks) }
  async deleteScheduleBlock(id: string) { await this.delete("schedule_blocks", id) }
  async saveStudyBlock(block: StudyBlock) { await this.upsert("study_blocks", appDataToSupabaseRows({ ...EMPTY_APP_DATA, studyBlocks: [block] }, this.userId).study_blocks) }
  async deleteStudyBlock(id: string) { await this.delete("study_blocks", id) }
  async saveReminder(reminder: Reminder) { await this.upsert("reminders", appDataToSupabaseRows({ ...EMPTY_APP_DATA, reminders: [reminder] }, this.userId).reminders) }
  async deleteReminder(id: string) { await this.delete("reminders", id) }
  async saveGrade(grade: Grade) { await this.upsert("grades", appDataToSupabaseRows({ ...EMPTY_APP_DATA, grades: [grade] }, this.userId).grades) }
  async deleteGrade(id: string) { await this.delete("grades", id) }
  async updateSettings(settings: AppSettings, modules: AppData["modules"]) { await this.upsert("user_settings", appDataToSupabaseRows({ ...EMPTY_APP_DATA, settings, modules }, this.userId).user_settings) }
  async updateProfile(profile: UserProfile, email?: string) { await this.upsert("profiles", appDataToSupabaseRows({ ...EMPTY_APP_DATA, profile }, this.userId, email).profiles) }
}

export function selectAcademicRepository(session: { user?: { id: string } } | null, client?: SupabaseClient | null): AcademicRepository {
  if (session?.user?.id && client) return new SupabaseAcademicRepository(client, session.user.id)
  return new LocalAcademicRepository()
}
