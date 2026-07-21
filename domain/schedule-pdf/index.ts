import type { DayKey } from "../../lib/types"

export interface SchedulePdfOptions { includeSaturday?: boolean; includeSunday?: boolean; includeStudyBlocks?: boolean; hidePersonalData?: boolean; theme?: "print-light" }
export interface ScheduleDocumentModel { page: { format: "A4"; orientation: "landscape" }; title: "Horario académico"; brand: "Horaly"; profile: { displayName: string; institution?: string; career?: string; email?: never }; semester: { id: string; name: string; startsOn?: string; endsOn?: string }; days: DayKey[]; modules: { id: string; label: string; start: string; end: string }[]; entries: { day: DayKey; moduleIds: string[]; subjectName: string; color: string; kind: "class" | "study" }[]; legend: { label: string; color: string }[]; footer: string; generatedAt: string; options: Required<SchedulePdfOptions> }
export interface SchedulePdfRenderer { render(model: ScheduleDocumentModel): Uint8Array }

export function buildScheduleDocumentModel(input: { profile: { displayName: string; email?: string; institution?: string; career?: string }; semester: { id: string; name: string; startsOn?: string; endsOn?: string }; subjects: { id: string; name: string; color: string }[]; modules: { id: string; label: string; start: string; end: string }[]; schedule: { subjectId: string; day: DayKey; moduleIds: string[] }[]; studyBlocks?: { title: string; day: DayKey; start: string; end: string; subjectId?: string }[]; generatedAt: Date; options?: SchedulePdfOptions }): ScheduleDocumentModel {
  const options: Required<SchedulePdfOptions> = { includeSaturday: false, includeSunday: false, includeStudyBlocks: false, hidePersonalData: false, theme: "print-light", ...input.options }
  const days: DayKey[] = ["lunes", "martes", "miercoles", "jueves", "viernes"]
  if (options.includeSaturday) days.push("sabado")
  if (options.includeSunday) days.push("domingo")
  const subjects = new Map(input.subjects.map((s) => [s.id, s]))
  const entries: ScheduleDocumentModel["entries"] = input.schedule.flatMap((item) => {
    if (!days.includes(item.day)) return []
    const subject = subjects.get(item.subjectId)
    return subject ? [{ day: item.day, moduleIds: item.moduleIds, subjectName: subject.name, color: subject.color, kind: "class" as const }] : []
  })
  if (options.includeStudyBlocks) {
    for (const block of input.studyBlocks ?? []) {
      if (days.includes(block.day)) entries.push({ day: block.day, moduleIds: [], subjectName: block.title, color: block.subjectId ? subjects.get(block.subjectId)?.color ?? "#64748b" : "#64748b", kind: "study" })
    }
  }
  return { page: { format: "A4", orientation: "landscape" }, title: "Horario académico", brand: "Horaly", profile: { displayName: options.hidePersonalData ? "Estudiante" : input.profile.displayName, institution: options.hidePersonalData ? undefined : input.profile.institution, career: options.hidePersonalData ? undefined : input.profile.career }, semester: input.semester, days, modules: input.modules, entries, legend: input.subjects.map((s) => ({ label: s.name, color: s.color })), footer: "Horaly · Generado en el navegador sin servicios remotos", generatedAt: input.generatedAt.toISOString(), options }
}

export function sanitizeSchedulePdfFilename(displayName: string, semesterName: string): string {
  const clean = `${displayName}-${semesterName}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "estudiante-semestre"
  return `horario-${clean}.pdf`
}

export function createSchedulePdfRenderer(): SchedulePdfRenderer {
  return { render(model) { const body = [`Horaly`, model.title, model.profile.displayName, model.profile.career ?? "", model.profile.institution ?? "", model.semester.name, model.footer].join("\n"); return new TextEncoder().encode(`%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 842 595]/Resources<<>>/Contents 4 0 R>>endobj\n4 0 obj<</Length ${body.length}>>stream\n${body}\nendstream endobj\ntrailer<</Root 1 0 R>>\n%%EOF`) } }
}
