import type { AppData, Grade, Reminder, ScheduleBlock, StudyBlock, Subject, AppSettings } from "@/lib/types"
import { EMPTY_APP_DATA } from "@/lib/types"
import { loadData, saveData } from "@/lib/storage"
import { appDataToSupabaseRows, supabaseRowsToAppData, type SupabaseDataset } from "./supabase-mappers"

export interface AcademicRepository {
  loadData(): Promise<AppData>
  replaceAll(data: AppData): Promise<void>
  saveSubject(subject: Subject): Promise<void>
  updateSubject(subject: Subject): Promise<void>
  deleteSubject(id: string): Promise<void>
  saveScheduleBlock(block: ScheduleBlock): Promise<void>
  saveStudyBlock(block: StudyBlock): Promise<void>
  saveReminder(reminder: Reminder): Promise<void>
  saveGrade(grade: Grade): Promise<void>
  updateSettings(settings: AppSettings): Promise<void>
}

export class LocalAcademicRepository implements AcademicRepository {
  async loadData() { return loadData() }
  async replaceAll(data: AppData) { saveData(data) }
  async saveSubject() { await this.replaceAll(loadData()) }
  async updateSubject() { await this.replaceAll(loadData()) }
  async deleteSubject() { await this.replaceAll(loadData()) }
  async saveScheduleBlock() { await this.replaceAll(loadData()) }
  async saveStudyBlock() { await this.replaceAll(loadData()) }
  async saveReminder() { await this.replaceAll(loadData()) }
  async saveGrade() { await this.replaceAll(loadData()) }
  async updateSettings() { await this.replaceAll(loadData()) }
}

type SupabaseLike = { from: (table: string) => any }

export class SupabaseAcademicRepository implements AcademicRepository {
  constructor(private client: SupabaseLike, private userId: string) {}
  async loadData(): Promise<AppData> {
    const dataset: Partial<SupabaseDataset> = {}
    for (const table of ["subjects", "schedule_blocks", "study_blocks", "reminders", "grades", "user_settings", "profiles"] as const) {
      const { data, error } = await this.client.from(table).select("*").eq("user_id", this.userId)
      if (error) throw new Error("No se pudieron cargar tus datos sincronizados.")
      ;(dataset as any)[table] = data ?? []
    }
    return supabaseRowsToAppData(dataset)
  }
  async replaceAll(data: AppData): Promise<void> {
    const rows = appDataToSupabaseRows(data, this.userId)
    for (const [table, values] of Object.entries(rows)) {
      if (!values.length) continue
      const { error } = await this.client.from(table).upsert(values, { onConflict: "id,user_id" })
      if (error) throw new Error("No se pudieron sincronizar tus datos.")
    }
  }
  async saveSubject(subject: Subject) { await this.replaceAll({ ...EMPTY_APP_DATA, subjects: [subject] }) }
  async updateSubject(subject: Subject) { await this.saveSubject(subject) }
  async deleteSubject(id: string) { await this.client.from("subjects").delete().eq("id", id).eq("user_id", this.userId) }
  async saveScheduleBlock(block: ScheduleBlock) { await this.replaceAll({ ...EMPTY_APP_DATA, blocks: [block] }) }
  async saveStudyBlock(block: StudyBlock) { await this.replaceAll({ ...EMPTY_APP_DATA, studyBlocks: [block] }) }
  async saveReminder(reminder: Reminder) { await this.replaceAll({ ...EMPTY_APP_DATA, reminders: [reminder] }) }
  async saveGrade(grade: Grade) { await this.replaceAll({ ...EMPTY_APP_DATA, grades: [grade] }) }
  async updateSettings(settings: AppSettings) { await this.replaceAll({ ...EMPTY_APP_DATA, settings }) }
}

export function selectAcademicRepository(session: { user?: { id: string } } | null, client?: SupabaseLike | null): AcademicRepository {
  if (session?.user?.id && client) return new SupabaseAcademicRepository(client, session.user.id)
  return new LocalAcademicRepository()
}
