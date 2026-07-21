import type { DayKey } from "../../lib/types"

export interface SchedulePdfOptions { includeSaturday?: boolean; includeSunday?: boolean; includeStudyBlocks?: boolean; hidePersonalData?: boolean; theme?: "print-light" }
export interface ScheduleDocumentModel { page: { format: "A4"; orientation: "landscape"; width: number; height: number }; title: "Horario académico"; brand: "Horaly"; profile: { displayName: string; institution?: string; career?: string; email?: never }; semester: { id: string; name: string; startsOn?: string; endsOn?: string }; days: DayKey[]; modules: { id: string; label: string; start: string; end: string }[]; entries: { day: DayKey; moduleIds: string[]; subjectName: string; color: string; kind: "class" | "study" }[]; legend: { label: string; color: string }[]; footer: string; generatedAt: string; options: Required<SchedulePdfOptions> }
export interface RenderedSchedulePdf { bytes: Uint8Array; mimeType: "application/pdf"; filename: string }
export interface SchedulePdfRenderer { render(model: ScheduleDocumentModel): Promise<RenderedSchedulePdf> }
const dayLabels: Record<DayKey, string> = { lunes: "Lunes", martes: "Martes", miercoles: "Miércoles", jueves: "Jueves", viernes: "Viernes", sabado: "Sábado", domingo: "Domingo" }

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
  if (options.includeStudyBlocks) for (const block of input.studyBlocks ?? []) if (days.includes(block.day)) entries.push({ day: block.day, moduleIds: [], subjectName: block.title, color: block.subjectId ? subjects.get(block.subjectId)?.color ?? "#64748b" : "#64748b", kind: "study" })
  return { page: { format: "A4", orientation: "landscape", width: 842, height: 595 }, title: "Horario académico", brand: "Horaly", profile: { displayName: options.hidePersonalData ? "Estudiante" : input.profile.displayName, institution: options.hidePersonalData ? undefined : input.profile.institution, career: options.hidePersonalData ? undefined : input.profile.career }, semester: input.semester, days, modules: input.modules, entries, legend: input.subjects.map((s) => ({ label: s.name, color: s.color })), footer: "Horaly · Generado en el navegador sin servicios remotos", generatedAt: input.generatedAt.toISOString(), options }
}

export function sanitizeSchedulePdfFilename(displayName: string, semesterName: string): string {
  const clean = `${displayName}-${semesterName}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "estudiante-semestre"
  return `horario-${clean}.pdf`
}

function hexToRgb(hex: string): [number, number, number] { const clean = hex.replace("#", ""); const n = Number.parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16); return Number.isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [100, 116, 139] }

export function createSchedulePdfRenderer(): SchedulePdfRenderer {
  const cache = new Map<string, RenderedSchedulePdf>()
  return { async render(model) {
    const key = JSON.stringify(model)
    const cached = cache.get(key)
    if (cached) return cached
    const { jsPDF } = await import("jspdf")
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4", compress: false })
    const margin = 32
    doc.setProperties({ title: model.title, subject: model.semester.name, creator: "Horaly" })
    doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.text("Horaly", margin, 34); doc.text(model.title, margin, 58)
    doc.setFont("helvetica", "normal"); doc.setFontSize(10)
    doc.text(`Estudiante: ${model.profile.displayName}`, margin, 78)
    doc.text(`Carrera: ${model.profile.career ?? "No informada"}`, margin, 94)
    doc.text(`Institución: ${model.profile.institution ?? "No informada"}`, margin, 110)
    doc.text(`Semestre: ${model.semester.name} · ${model.semester.startsOn ?? ""} - ${model.semester.endsOn ?? ""}`, 360, 78)
    doc.text(`Generado: ${model.generatedAt.slice(0, 10)}`, 360, 94)
    const tableTop = 132, timeWidth = 88, colWidth = (780 - timeWidth) / model.days.length, rowHeight = 52
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text("Módulos", margin + 4, tableTop - 8)
    model.days.forEach((day, index) => { const x = margin + timeWidth + index * colWidth; doc.rect(x, tableTop - 22, colWidth, 22); doc.text(dayLabels[day], x + 8, tableTop - 8) })
    doc.setFont("helvetica", "normal"); doc.setFontSize(8)
    model.modules.forEach((module, row) => {
      const y = tableTop + row * rowHeight
      if (y + rowHeight > 545) { doc.addPage("a4", "landscape") }
      doc.rect(margin, y, timeWidth, rowHeight); doc.text(`${module.label}\n${module.start}-${module.end}`, margin + 5, y + 16)
      model.days.forEach((day, col) => { const x = margin + timeWidth + col * colWidth; doc.rect(x, y, colWidth, rowHeight); const entry = model.entries.find((item) => item.day === day && item.moduleIds.includes(module.id)); if (entry) { const [r, g, b] = hexToRgb(entry.color); doc.setFillColor(r, g, b); doc.rect(x + 3, y + 3, colWidth - 6, rowHeight - 6, "F"); doc.setTextColor(255, 255, 255); doc.text(entry.subjectName, x + 8, y + 22); doc.setTextColor(0, 0, 0) } })
    })
    const legendY = Math.min(555, tableTop + model.modules.length * rowHeight + 24)
    doc.setFont("helvetica", "bold"); doc.text("Leyenda", margin, legendY)
    model.legend.slice(0, 8).forEach((item, index) => { const [r, g, b] = hexToRgb(item.color); const x = margin + 70 + index * 90; doc.setFillColor(r, g, b); doc.rect(x, legendY - 8, 10, 10, "F"); doc.text(item.label, x + 14, legendY) })
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(model.footer, margin, 580)
    const bytes = new Uint8Array(doc.output("arraybuffer"))
    const rendered = { bytes, mimeType: "application/pdf" as const, filename: sanitizeSchedulePdfFilename(model.profile.displayName, model.semester.name) }
    cache.set(key, rendered)
    return rendered
  } }
}
