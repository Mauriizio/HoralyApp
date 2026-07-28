import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { evaluateSubjectGradingPlan } from "../domain/grading/index.ts"
import { addGradeTransition, applyGradingPresetTransition } from "../lib/assessment-groups.ts"
import { EMPTY_APP_DATA, type AppData, type AssessmentGroup, type Grade } from "../lib/types.ts"

const group: AssessmentGroup = {
  id: "partials",
  semesterId: "sem",
  subjectId: "course",
  name: "Evaluaciones parciales",
  kind: "continuous",
  courseWeight: 60,
  position: 1,
  createdAt: 1,
}

function assessments(count: number): Grade[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `g-${index}`,
    semesterId: "sem",
    subjectId: "course",
    groupId: "partials",
    title: `Parcial ${index + 1}`,
    score: 5,
    weight: 100 / count,
    weightWithinGroup: 100 / count,
    status: "graded",
    date: "2026-05-01",
    createdAt: index,
  }))
}

test("el motor admite 3, 4, 5 y 6 parciales sin límites artificiales", () => {
  for (const count of [3, 4, 5, 6]) {
    const result = evaluateSubjectGradingPlan({
      semesterId: "sem",
      subjectId: "course",
      groups: [group, { ...group, id: "transversal", name: "Evaluación transversal", kind: "final_exam", courseWeight: 40, position: 2 }],
      assessments: [
        ...assessments(count).map((grade) => ({ ...grade, scheduledDate: grade.date, groupId: grade.groupId!, weightWithinGroup: grade.weightWithinGroup!, status: grade.status! })),
        { ...assessments(1)[0], id: "t", groupId: "transversal", title: "Transversal", scheduledDate: "2026-06-01", weight: 100, weightWithinGroup: 100, status: "planned" as const, score: null },
      ],
      scale: { min: 1, max: 7, passing: 4 },
    })
    assert.equal(result.validity.errors.length, 0)
    assert.ok(Math.abs(result.groups[0].internalWeightTotal - 100) < 0.001)
  }
})

test("formularios reinician creación y conservan edición explícita", () => {
  const subjectForm = readFileSync("components/subject-form.tsx", "utf8")
  const subjectsPanel = readFileSync("components/subjects-panel.tsx", "utf8")
  assert.match(subjectForm, /useEffect/)
  assert.match(subjectForm, /resetForm/)
  assert.match(subjectsPanel, /setEditing\(undefined\)/)
  assert.match(subjectsPanel, /setEditing\(s\)/)
})

test("evaluaciones exponen grupo, estado, edición y borrado", () => {
  const form = readFileSync("components/grade-form.tsx", "utf8")
  const editor = readFileSync("components/grades/assessment-editor.tsx", "utf8")
  assert.match(form, /groupId/)
  assert.match(form, /status/)
  assert.match(form, /score: status === "graded"/)
  assert.match(editor, /Editar/)
  assert.match(editor, /Eliminar/)
})

test("crear materia sin configuración conduce al onboarding", () => {
  const page = readFileSync("app/page.tsx", "utf8")
  assert.match(page, /requiresAcademicSetup/)
  assert.match(page, /openSubjectCreation/)
  assert.match(page, /navigateTo\("onboarding"\)/)
})

test("crear evaluaciones actualiza inmediatamente el estado expuesto sin reconstruirlo", () => {
  let state: AppData = {
    ...EMPTY_APP_DATA,
    activeSemesterId: "sem",
    semesters: [{ id: "sem", name: "2026", status: "active", createdAt: 1 }],
    subjects: [{ id: "course", semesterId: "sem", name: "Planos", color: "#000", difficulty: 3, createdAt: 1 }],
  }
  for (let index = 1; index <= 6; index += 1) {
    state = addGradeTransition(state, {
      semesterId: "sem", subjectId: "course", title: `Parcial ${index}`, score: 5,
      weight: 100 / 6, weightWithinGroup: 100 / 6, status: "graded", date: "2026-05-01",
    }, `g-${index}`, index).nextData
    assert.equal(state.grades.length, index)
  }
})

test("preset 60/40 preserva seis parciales y separa transversal", () => {
  let state: AppData = {
    ...EMPTY_APP_DATA,
    activeSemesterId: "sem",
    semesters: [{ id: "sem", name: "2026", status: "active", createdAt: 1 }],
    subjects: [{ id: "course", semesterId: "sem", name: "Planos", color: "#000", difficulty: 3, createdAt: 1 }],
  }
  for (let index = 1; index <= 6; index += 1) {
    state = addGradeTransition(state, {
      semesterId: "sem", subjectId: "course", title: `Parcial ${index}`, score: 5,
      weight: 100 / 6, weightWithinGroup: 100 / 6, status: "graded", date: "2026-05-01",
    }, `g-${index}`, index).nextData
  }
  const partialGroupId = state.grades[0].groupId
  const preset = applyGradingPresetTransition(state, "course", "presentation60Transversal40", 20)
  assert.equal(preset.nextData.grades.length, 6)
  assert.ok(preset.nextData.grades.every((grade) => grade.groupId === partialGroupId))
  const partials = preset.groups.find((item) => item.id === partialGroupId)
  const transversal = preset.groups.find((item) => item.kind === "final_exam")
  assert.equal(partials?.courseWeight, 60)
  assert.equal(transversal?.courseWeight, 40)

  const withTransversal = addGradeTransition(preset.nextData, {
    semesterId: "sem", subjectId: "course", groupId: transversal!.id, title: "ET",
    score: 6, weight: 100, weightWithinGroup: 100, status: "graded", date: "2026-06-01",
  }, "et", 21).nextData
  assert.equal(withTransversal.grades.filter((grade) => grade.groupId === partialGroupId).length, 6)
  assert.equal(withTransversal.grades.filter((grade) => grade.groupId === transversal!.id).length, 1)
  assert.equal((transversal!.courseWeight * withTransversal.grades.at(-1)!.weightWithinGroup!) / 100, 40)
})
