import type { DayKey } from "../../lib/types"

export interface SchedulePdfOptions { includeSaturday?: boolean; includeSunday?: boolean; includeStudyBlocks?: boolean; hidePersonalData?: boolean; theme?: "print-light" }
export interface ScheduleDocumentModel { page: { format: "A4"; orientation: "landscape"; width: number; height: number }; title: "Horario académico"; brand: "Horarily"; profile: { displayName: string; institution?: string; career?: string; email?: never }; semester: { id: string; name: string; startsOn?: string; endsOn?: string }; days: DayKey[]; modules: { id: string; label: string; start: string; end: string }[]; entries: { day: DayKey; moduleIds: string[]; subjectName: string; color: string; kind: "class" | "study" }[]; legend: { label: string; color: string }[]; footer: string; generatedAt: string; options: Required<SchedulePdfOptions> }
export interface RenderedSchedulePdf { bytes: Uint8Array; mimeType: "application/pdf"; filename: string }
export interface SchedulePdfRenderer { render(model: ScheduleDocumentModel): Promise<RenderedSchedulePdf> }
const dayLabels: Record<DayKey, string> = { lunes: "Lunes", martes: "Martes", miercoles: "Miércoles", jueves: "Jueves", viernes: "Viernes", sabado: "Sábado", domingo: "Domingo" }

export function buildScheduleDocumentModel(input: { profile: { displayName: string; email?: string; institution?: string; career?: string }; semester: { id: string; name: string; startsOn?: string; endsOn?: string }; subjects: { id: string; name: string; color: string }[]; modules: { id: string; label: string; start: string; end: string }[]; schedule: { subjectId: string; day: DayKey; moduleIds: string[] }[]; studyBlocks?: { title: string; day: DayKey; start: string; end: string; subjectId?: string }[]; generatedAt: Date; visibleDays?: DayKey[]; options?: SchedulePdfOptions }): ScheduleDocumentModel {
  const options: Required<SchedulePdfOptions> = { includeSaturday: false, includeSunday: false, includeStudyBlocks: false, hidePersonalData: false, theme: "print-light", ...input.options }
  const days: DayKey[] = input.visibleDays?.length ? [...input.visibleDays] : ["lunes", "martes", "miercoles", "jueves", "viernes"]
  if (!input.visibleDays && options.includeSaturday) days.push("sabado")
  if (!input.visibleDays && options.includeSunday) days.push("domingo")
  const subjects = new Map(input.subjects.map((s) => [s.id, s]))
  const entries: ScheduleDocumentModel["entries"] = input.schedule.flatMap((item) => {
    if (!days.includes(item.day)) return []
    const subject = subjects.get(item.subjectId)
    return subject ? [{ day: item.day, moduleIds: item.moduleIds, subjectName: subject.name, color: subject.color, kind: "class" as const }] : []
  })
  if (options.includeStudyBlocks) for (const block of input.studyBlocks ?? []) if (days.includes(block.day)) entries.push({ day: block.day, moduleIds: [], subjectName: block.title, color: block.subjectId ? subjects.get(block.subjectId)?.color ?? "#64748b" : "#64748b", kind: "study" })
  return { page: { format: "A4", orientation: "landscape", width: 842, height: 595 }, title: "Horario académico", brand: "Horarily", profile: { displayName: options.hidePersonalData ? "Estudiante" : input.profile.displayName, institution: options.hidePersonalData ? undefined : input.profile.institution, career: options.hidePersonalData ? undefined : input.profile.career }, semester: input.semester, days, modules: input.modules, entries, legend: input.subjects.map((s) => ({ label: s.name, color: s.color })), footer: "Horarily · Generado en el navegador sin servicios remotos", generatedAt: input.generatedAt.toISOString(), options }
}

export function schedulePdfRegions(moduleCount: number, legendLineCounts: number[]) {
  const headerBottom = 102, tableTop = 126, footerTop = 574, columns = 3
  const rows = Math.ceil(legendLineCounts.length / columns)
  let legendHeight = 18
  for (let row = 0; row < rows; row++) legendHeight += Math.max(1, ...legendLineCounts.slice(row * columns, row * columns + columns)) * 9 + 7
  const legendTop = footerTop - legendHeight - 8
  const rowHeight = Math.max(31, Math.min(46, (legendTop - tableTop - 10) / Math.max(1, moduleCount)))
  return { headerBottom, tableTop, legendTop, legendHeight, footerTop, rowHeight, columns }
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
    doc.setProperties({ title: model.title, subject: model.semester.name, creator: "Horarily" })
    doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.text("Horarily", margin, 30); doc.setFontSize(15); doc.text(model.title, margin, 51)
    doc.setFont("helvetica", "normal"); doc.setFontSize(10)
    doc.text(`Estudiante · ${model.profile.displayName}`, margin, 70)
    doc.text(`Institución · ${model.profile.institution ?? "No informada"}`, margin, 86)
    doc.text(`Carrera · ${model.profile.career ?? "No informada"}`, 310, 70)
    doc.text(`Semestre · ${model.semester.name}`, 310, 86)
    const legendColWidth = 250
    doc.setFontSize(7.5)
    const legendLines = model.legend.map((item) => doc.splitTextToSize(item.label, legendColWidth - 24).slice(0, 3) as string[])
    const regions = schedulePdfRegions(model.modules.length, legendLines.map((lines) => lines.length))
    const tableTop = regions.tableTop, timeWidth = 88, colWidth = (780 - timeWidth) / model.days.length
    const rowHeight = regions.rowHeight
    const cellFontSize = rowHeight < 38 ? 6.5 : rowHeight < 46 ? 7 : 8
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text("Módulos", margin + 4, tableTop - 8)
    model.days.forEach((day, index) => { const x = margin + timeWidth + index * colWidth; doc.rect(x, tableTop - 22, colWidth, 22); doc.text(dayLabels[day], x + 8, tableTop - 8) })
    doc.setFont("helvetica", "normal"); doc.setFontSize(cellFontSize)
    model.modules.forEach((module, row) => {
      const y = tableTop + row * rowHeight
      doc.rect(margin, y, timeWidth, rowHeight); doc.text(`${module.label}\n${module.start}-${module.end}`, margin + 5, y + 16)
      model.days.forEach((day, col) => { const x = margin + timeWidth + col * colWidth; doc.rect(x, y, colWidth, rowHeight); const entry = model.entries.find((item) => item.day === day && item.moduleIds.includes(module.id)); if (entry) { const [r, g, b] = hexToRgb(entry.color); doc.setFillColor(r, g, b); doc.rect(x + 3, y + 3, colWidth - 6, rowHeight - 6, "F"); doc.setTextColor(255, 255, 255); const lines = doc.splitTextToSize(entry.subjectName, colWidth - 16).slice(0, Math.max(1, Math.floor((rowHeight - 10) / (cellFontSize + 2)))); doc.text(lines, x + 8, y + 14); doc.setTextColor(0, 0, 0) } })
    })
    const legendY = Math.max(tableTop + model.modules.length * rowHeight + 10, regions.legendTop)
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.text("Leyenda", margin, legendY + 8)
    let rowY = legendY + 18
    for (let row = 0; row < Math.ceil(model.legend.length / regions.columns); row++) {
      const items = model.legend.slice(row * regions.columns, row * regions.columns + regions.columns)
      const rowLines = legendLines.slice(row * regions.columns, row * regions.columns + regions.columns)
      items.forEach((item, col) => { const [r, g, b] = hexToRgb(item.color); const x = margin + col * legendColWidth; doc.setFillColor(r, g, b); doc.rect(x, rowY - 7, 9, 9, "F"); doc.setTextColor(0); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.text(rowLines[col], x + 14, rowY) })
      rowY += Math.max(...rowLines.map((lines) => lines.length)) * 9 + 7
    }
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text("Creado con Horarily · horaly-app.vercel.app", margin, regions.footerTop + 6)
    const bytes = new Uint8Array(doc.output("arraybuffer"))
    const rendered = { bytes, mimeType: "application/pdf" as const, filename: sanitizeSchedulePdfFilename(model.profile.displayName, model.semester.name) }
    cache.set(key, rendered)
    return rendered
  } }
}
