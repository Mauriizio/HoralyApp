import { writeFile } from "node:fs/promises"
import { buildScheduleDocumentModel, createSchedulePdfRenderer } from "../domain/schedule-pdf/index.ts"

const names = ["SISTEMAS ELECTRONEUMÁTICOS INDUSTRIALES", "ELECTROTECNIA II", "ÁLGEBRA Y TRIGONOMETRÍA", "BASES DE ELECTRÓNICA Y PROGRAMACIÓN", "INSTALACIONES ELÉCTRICAS / ILUMINACIÓN", "FUNDAMENTOS DE ANTROPOLOGÍA"]
const modules = Array.from({ length: 8 }, (_, index) => ({ id: `m${index}`, label: `Módulo ${index + 1}`, start: `${String(8 + index).padStart(2, "0")}:00`, end: `${String(8 + index).padStart(2, "0")}:45` }))
const subjects = names.map((name, index) => ({ id: `s${index}`, name, color: ["#7c3aed", "#2563eb", "#dc2626", "#059669", "#d97706", "#4f46e5"][index] }))
const days = ["lunes", "martes", "miercoles", "jueves"] as const
async function main() {
  const model = buildScheduleDocumentModel({ profile: { displayName: "Estudiante QA", institution: "Institución QA", career: "Carrera QA" }, semester: { id: "sem", name: "2026-2" }, subjects, modules, visibleDays: [...days], schedule: modules.map((module, index) => ({ subjectId: subjects[index % subjects.length].id, day: days[index % days.length], moduleIds: [module.id] })), generatedAt: new Date("2026-08-13") })
  const pdf = await createSchedulePdfRenderer().render(model)
  await writeFile("docs/qa/hotfix-schedule-long-subjects.pdf", pdf.bytes)
  console.log(JSON.stringify({ bytes: pdf.bytes.length, pages: (Buffer.from(pdf.bytes).toString("latin1").match(/\/Type \/Page\b/g) ?? []).length }))
}
void main()
