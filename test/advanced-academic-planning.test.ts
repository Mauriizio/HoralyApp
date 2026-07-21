import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { createDefaultLegacyGroup, evaluateSubjectGradingPlan, getAssessmentEffectiveWeight, gradingPresets, migrateLegacyGradesToPlan, requiredScoreForTarget } from "../domain/grading/index.ts"
import { buildAcademicAgenda } from "../domain/academic-agenda/index.ts"
import { generateAcademicRecommendations, hasExternalAiDependency } from "../domain/academic-advisor/index.ts"
import { buildScheduleDocumentModel, createSchedulePdfRenderer, sanitizeSchedulePdfFilename } from "../domain/schedule-pdf/index.ts"
import type { Assessment, AssessmentGroup, SubjectGradingPlan } from "../domain/grading/index.ts"

const scale = { min: 1, max: 7, passing: 4 }
const groups: AssessmentGroup[] = [
  { id: "presentation", semesterId: "sem-a", subjectId: "fis", name: "Presentación", kind: "continuous", courseWeight: 60, position: 1, createdAt: 1 },
  { id: "transversal", semesterId: "sem-a", subjectId: "fis", name: "Examen transversal", kind: "final_exam", courseWeight: 40, position: 2, createdAt: 1 },
]
const assessments: Assessment[] = [
  { id: "p1", semesterId: "sem-a", subjectId: "fis", groupId: "presentation", title: "Prueba 1", score: 5, weightWithinGroup: 20, scheduledDate: "2026-04-01", status: "graded", createdAt: 1 },
  { id: "p2", semesterId: "sem-a", subjectId: "fis", groupId: "presentation", title: "Prueba 2", score: 5, weightWithinGroup: 20, scheduledDate: "2026-04-15", status: "graded", createdAt: 2 },
  { id: "p3", semesterId: "sem-a", subjectId: "fis", groupId: "presentation", title: "Prueba 3", score: 5, weightWithinGroup: 20, scheduledDate: "2026-05-01", status: "graded", createdAt: 3 },
  { id: "p4", semesterId: "sem-a", subjectId: "fis", groupId: "presentation", title: "Prueba 4", score: 5, weightWithinGroup: 20, scheduledDate: "2026-05-15", status: "graded", createdAt: 4 },
  { id: "p5", semesterId: "sem-a", subjectId: "fis", groupId: "presentation", title: "Prueba 5", score: 5, weightWithinGroup: 20, scheduledDate: "2026-06-01", status: "graded", createdAt: 5 },
  { id: "ex", semesterId: "sem-a", subjectId: "fis", groupId: "transversal", title: "Transversal", score: null, weightWithinGroup: 100, scheduledDate: "2026-07-01", status: "planned", createdAt: 6 },
]
const plan: SubjectGradingPlan = { semesterId: "sem-a", subjectId: "fis", groups, assessments, scale, targetGrade: 4 }

describe("planificación académica avanzada", () => {
  it("soporta preset 60/40 con cinco evaluaciones internas y peso efectivo", () => {
    assert.equal(gradingPresets.presentation60Transversal40().groups[0].courseWeight, 60)
    assert.equal(assessments.filter((a) => a.groupId === "presentation").reduce((sum, a) => sum + a.weightWithinGroup, 0), 100)
    assert.equal(getAssessmentEffectiveWeight(groups[0], assessments[0]), 12)
  })

  it("calcula presentación, proyección, transversal necesario 2,5 y pesos incompletos", () => {
    const result = evaluateSubjectGradingPlan(plan)
    assert.equal(result.presentationAverage, 5)
    assert.equal(result.currentContribution, 3)
    assert.equal(result.currentFinalGrade, null)
    assert.equal(result.projectedFinalGrade, 5)
    assert.equal(result.requiredFinalExamScore?.requiredScore, 2.5)
    assert.equal(result.mathematicallyApproved, false)
    assert.equal(result.status, "in_progress")

    const invalid = evaluateSubjectGradingPlan({ ...plan, groups: [{ ...groups[0], courseWeight: 80 }], assessments: assessments.slice(0, 5) })
    assert.equal(invalid.validity.isValid, false)
    assert.equal(invalid.projectedFinalGrade, null)
  })

  it("detecta objetivo imposible, exenciones, planificadas sin nota y escalas", () => {
    assert.equal(requiredScoreForTarget({ currentWeightedContribution: 3, pendingEffectiveWeight: 40, target: 7, scale }).status, "impossible_high")
    assert.equal(requiredScoreForTarget({ currentWeightedContribution: 6, pendingEffectiveWeight: 40, target: 4, scale }).status, "below_minimum")
    const custom = evaluateSubjectGradingPlan({ ...plan, scale: { min: 0, max: 100, passing: 60 }, targetGrade: 60 })
    assert.equal(custom.scale.max, 100)
    const exempt = evaluateSubjectGradingPlan({ ...plan, assessments: assessments.map((a) => a.id === "ex" ? { ...a, status: "exempt" } : a) })
    assert.equal(exempt.groups.find((g) => g.groupId === "transversal")?.evaluatedCoverage, 0)
  })

  it("migra notas legacy preservando IDs y aislando user/semestre/materia", () => {
    const legacy = [{ id: "legacy-1", semesterId: "sem-a", subjectId: "fis", title: "Control", score: 6, weight: 25, date: "2026-05-20", notes: "ok", createdAt: 10 }]
    const migrated = migrateLegacyGradesToPlan({ semesterId: "sem-a", subjectId: "fis", legacyGrades: legacy })
    assert.equal(migrated.groups[0].name, "Evaluación continua")
    assert.equal(migrated.assessments[0].id, "legacy-1")
    assert.equal(migrated.assessments[0].groupId, createDefaultLegacyGroup("sem-a", "fis").id)
    assert.equal(migrated.assessments[0].semesterId, "sem-a")
    assert.equal(migrated.assessments[0].subjectId, "fis")
  })

  it("filtra agenda por semestre/asignatura y genera recomendaciones deterministas sin LLM", () => {
    const agenda = buildAcademicAgenda({ now: new Date("2026-06-28T12:00:00Z"), semesterId: "sem-a", subjects: [{ id: "fis", name: "Física" }], assessments, classes: [], studyBlocks: [], reminders: [] })
    assert.equal(agenda.next30Days.some((item) => item.kind === "assessment" && item.subjectId === "fis"), true)
    const recommendations = generateAcademicRecommendations({ now: new Date("2026-06-28T12:00:00Z"), plan, subjects: [{ id: "fis", name: "Física" }], agendaItems: agenda.next30Days, weeklyLoad: { classBlocks: 20, studyBlocks: 0 } })
    assert.equal(hasExternalAiDependency(), false)
    assert.equal(recommendations.every((r) => r.evidence.length > 0), true)
    assert.deepEqual(recommendations.map((r) => r.id), generateAcademicRecommendations({ now: new Date("2026-06-28T12:00:00Z"), plan, subjects: [{ id: "fis", name: "Física" }], agendaItems: agenda.next30Days, weeklyLoad: { classBlocks: 20, studyBlocks: 0 } }).map((r) => r.id))
  })

  it("crea modelo PDF A4 horizontal sin correo por defecto y archivo válido", () => {
    const model = buildScheduleDocumentModel({ profile: { displayName: "María Pérez", email: "maria@example.test", institution: "U", career: "Ingeniería" }, semester: { id: "sem-a", name: "2026-1", startsOn: "2026-03-01", endsOn: "2026-07-15" }, subjects: [{ id: "fis", name: "Física", color: "#123456" }], modules: [{ id: "m1", label: "M1", start: "08:00", end: "08:45" }], schedule: [{ subjectId: "fis", day: "lunes", moduleIds: ["m1"] }], generatedAt: new Date("2026-07-01T00:00:00Z"), options: { includeSaturday: false, includeSunday: true, includeStudyBlocks: false, hidePersonalData: false } })
    assert.equal(model.page.format, "A4")
    assert.equal(model.page.orientation, "landscape")
    assert.equal(model.profile.email, undefined)
    assert.equal(model.days.includes("sabado"), false)
    assert.equal(model.days.includes("domingo"), true)
    assert.equal(sanitizeSchedulePdfFilename("María Pérez", "2026-1"), "horario-maria-perez-2026-1.pdf")
    const pdf = createSchedulePdfRenderer().render(model)
    assert.equal(pdf.mimeType, "application/pdf")
    assert.equal(Buffer.from(pdf.bytes).subarray(0, 5).toString(), "%PDF-")
  })
})
