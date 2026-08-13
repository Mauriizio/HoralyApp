import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"
import { buildScheduleDocumentModel, createSchedulePdfRenderer, schedulePdfRegions } from "../domain/schedule-pdf/index.ts"
import { renderNotebookPdf, splitStyledRuns } from "../domain/notebook/pdf.ts"

const names = ["SISTEMAS ELECTRONEUMÁTICOS INDUSTRIALES", "ELECTROTECNIA II", "ÁLGEBRA Y TRIGONOMETRÍA", "BASES DE ELECTRÓNICA Y PROGRAMACIÓN", "INSTALACIONES ELÉCTRICAS / ILUMINACIÓN", "FUNDAMENTOS DE ANTROPOLOGÍA"]

test("PDF horario real reserva regiones sin overlap y conserva una página", async () => {
  const modules = Array.from({ length: 8 }, (_, index) => ({ id: `m${index}`, label: `Módulo ${index + 1}`, start: `${String(8 + index).padStart(2, "0")}:00`, end: `${String(8 + index).padStart(2, "0")}:45` }))
  const subjects = names.map((name, index) => ({ id: `s${index}`, name, color: `#${(0x335577 + index * 0x111111).toString(16).slice(0, 6)}` }))
  const model = buildScheduleDocumentModel({ profile: { displayName: "QA", institution: "Institución", career: "Carrera" }, semester: { id: "sem", name: "2026-2" }, subjects, modules, visibleDays: ["lunes", "martes", "miercoles", "jueves"], schedule: subjects.map((subject, index) => ({ subjectId: subject.id, day: ["lunes", "martes", "miercoles", "jueves"][index % 4] as "lunes", moduleIds: [`m${index}`] })), generatedAt: new Date("2026-08-13") })
  assert.equal(model.brand, "Horarily")
  const regions = schedulePdfRegions(8, [2, 1, 1, 2, 2, 1])
  assert.ok(regions.headerBottom < regions.tableTop)
  assert.ok(regions.tableTop + regions.rowHeight * 8 < regions.legendTop)
  assert.ok(regions.legendTop + regions.legendHeight < regions.footerTop)
  const pdf = await createSchedulePdfRenderer().render(model)
  assert.equal((Buffer.from(pdf.bytes).toString("latin1").match(/\/Type \/Page\b/g) ?? []).length, 1)
})

test("PDF notebook conserva runs mixtos y orden de bloques", async () => {
  const tokens = splitStyledRuns([{ text: "normal " }, { text: "negrita", marks: ["bold"] }])
  assert.equal(tokens.map((token) => token.text).join(""), "normal negrita")
  assert.equal(tokens.at(-1)?.marks?.[0], "bold")
  const note = { id: "n", semesterId: "sem", subjectId: "s", title: "QA Rich", content: "Antes Imagen Después guia.pdf", document: { version: 1 as const, blocks: [{ id: "a", type: "paragraph" as const, content: [{ text: "Antes " }, { text: "negrita", marks: ["bold" as const] }] }, { id: "pdf", type: "attachmentReference" as const, attachmentId: "pdf", filename: "guia.pdf" }, { id: "b", type: "paragraph" as const, content: [{ text: "Después" }] }] }, createdAt: 1, updatedAt: 2 }
  const result = await renderNotebookPdf({ subject: { name: "Electrotecnia" }, notes: [note], attachments: [{ id: "pdf", semesterId: "sem", subjectId: "s", noteId: "n", kind: "pdf", filename: "guia.pdf", mimeType: "application/pdf", sizeBytes: 1, createdAt: 1 }] })
  const source = Buffer.from(result.bytes).toString("latin1")
  assert.equal((source.match(/guia\.pdf/g) ?? []).length, 1)
})

test("iconos de materias usan componente y fallback, nunca texto interno", async () => {
  const schedule = await readFile(new URL("../components/schedule-grid.tsx", import.meta.url), "utf8")
  const notebook = await readFile(new URL("../components/notebook/notebook-view.tsx", import.meta.url), "utf8")
  assert.match(schedule, /getLucideIcon\(subject\.icon\) \?\? BookOpen/)
  assert.match(notebook, /getLucideIcon\(subject\.icon\)/)
  assert.doesNotMatch(schedule, /\{subject\.icon\}/)
  assert.doesNotMatch(notebook, /\{subject\.icon\}/)
})
