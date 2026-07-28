import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { evaluateSubjectGradingPlan } from "../domain/grading/index.ts"
import type { AssessmentGroup, Grade } from "../lib/types.ts"

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
