import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { evaluateSubjectGradingPlan } from "../domain/grading/index.ts"
import {
  addGradeTransition,
  applyGradingPresetTransition,
  getAvailableAssessmentGroups,
  getMaximumAssessmentWeight,
  getSubjectStructureStatus,
  isActiveAssessmentGroup,
  isStandardSingleAssessmentFinalGroup,
} from "../lib/assessment-groups.ts"
import { EMPTY_APP_DATA, type AppData, type AssessmentGroup, type Grade } from "../lib/types.ts"
import { migrateData } from "../lib/storage.ts"

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

test("evaluaciones exponen grupo, estado calificado implícito, edición y borrado", () => {
  const form = readFileSync("components/grade-form.tsx", "utf8")
  const editor = readFileSync("components/grades/assessment-editor.tsx", "utf8")
  assert.match(form, /groupId/)
  assert.match(form, /status/)
  assert.match(form, /score: scoreNum/)
  assert.match(form, /status: "graded"/)
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

test("presets consecutivos reemplazan grupos vacíos y nunca se acumulan", () => {
  let state: AppData = {
    ...EMPTY_APP_DATA,
    activeSemesterId: "sem",
    semesters: [{ id: "sem", name: "2026", status: "active", createdAt: 1 }],
    subjects: [{ id: "course", semesterId: "sem", name: "Planos", color: "#000", difficulty: 3, createdAt: 1 }],
  }
  const expected = [
    ["continuous100", 1, 100],
    ["presentation60Transversal40", 2, 100],
    ["laboratoryTheoryTransversal", 3, 100],
    ["continuous100", 1, 100],
  ] as const
  expected.forEach(([presetId, count, total], index) => {
    const transition = applyGradingPresetTransition(state, "course", presetId, 100 + index)
    assert.equal(transition.requiresResolution, false)
    state = transition.nextData
    const active = state.assessmentGroups.filter(isActiveAssessmentGroup)
    assert.equal(active.length, count)
    assert.equal(active.reduce((sum, item) => sum + item.courseWeight, 0), total)
  })
})

test("un grupo obsoleto con evaluaciones exige resolución y jamás borra notas", () => {
  const obsolete: AssessmentGroup = {
    ...group,
    id: "custom-with-data",
    name: "Proyecto anterior",
    kind: "project",
    courseWeight: 100,
  }
  const existingGrade = { ...assessments(1)[0], id: "project-grade", groupId: obsolete.id }
  const state: AppData = {
    ...EMPTY_APP_DATA,
    activeSemesterId: "sem",
    semesters: [{ id: "sem", name: "2026", status: "active", createdAt: 1 }],
    subjects: [{ id: "course", semesterId: "sem", name: "Planos", color: "#000", difficulty: 3, createdAt: 1 }],
    assessmentGroups: [obsolete],
    grades: [existingGrade],
  }
  const blocked = applyGradingPresetTransition(state, "course", "presentation60Transversal40", 10)
  assert.equal(blocked.requiresResolution, true)
  assert.equal(blocked.nextData, state)
  assert.equal(blocked.nextData.grades.length, 1)

  const preserved = applyGradingPresetTransition(
    state,
    "course",
    "presentation60Transversal40",
    10,
    { preservePopulatedObsoleteGroups: true },
  )
  assert.equal(preserved.requiresResolution, false)
  assert.equal(preserved.nextData.grades.length, 1)
  assert.equal(preserved.nextData.grades[0].groupId, obsolete.id)
  const active = preserved.nextData.assessmentGroups.filter(isActiveAssessmentGroup)
  const inactive = preserved.nextData.assessmentGroups.filter((item) => !isActiveAssessmentGroup(item))
  assert.deepEqual(active.map((item) => item.courseWeight), [60, 40])
  assert.equal(inactive.length, 1)
  assert.equal(inactive[0].courseWeight, 0)

  const projection = evaluateSubjectGradingPlan({
    semesterId: "sem",
    subjectId: "course",
    groups: active,
    assessments: [],
    scale: { min: 1, max: 7, passing: 4 },
  })
  assert.equal(active.reduce((sum, item) => sum + item.courseWeight, 0), 100)
  assert.equal(projection.validity.errors.some((error) => error.includes("superan 100%")), false)

  const reloaded = migrateData(JSON.parse(JSON.stringify(preserved.nextData)))
  assert.equal(reloaded.assessmentGroups.filter(isActiveAssessmentGroup).length, 2)
  assert.equal(reloaded.assessmentGroups.filter((item) => !isActiveAssessmentGroup(item)).length, 1)
  assert.equal(reloaded.grades.length, 1)
})

test("Registrar nota filtra grupos fuera de la estructura activa", () => {
  const form = readFileSync("components/grade-form.tsx", "utf8")
  assert.match(form, /isActiveAssessmentGroup/)
  assert.match(form, /group\.subjectId === subjectId && isActiveAssessmentGroup\(group\)/)
})

test("limita creación y edición al peso interno realmente disponible", () => {
  const existing = assessments(5).map((grade, index) => ({
    ...grade,
    weight: index === 4 ? 5 : 20,
    weightWithinGroup: index === 4 ? 5 : 20,
  }))
  assert.equal(getMaximumAssessmentWeight(existing), 15)
  assert.equal(getMaximumAssessmentWeight(assessments(5), "g-0"), 20)
  assert.equal(getMaximumAssessmentWeight(assessments(5), "g-0") < 25, true)
  assert.equal(getMaximumAssessmentWeight(assessments(5), "g-0") >= 15, true)

  const invalidLegacy = [...existing, { ...existing[0], id: "legacy-extra", weight: 20, weightWithinGroup: 20 }]
  assert.equal(getMaximumAssessmentWeight(invalidLegacy), 0)
  assert.equal(getMaximumAssessmentWeight(invalidLegacy, "legacy-extra"), 15)
})

test("creación excluye grupos completos y edición conserva el grupo actual", () => {
  const partials = assessments(5)
  const final = { ...group, id: "transversal", kind: "final_exam" as const, courseWeight: 40, position: 2 }
  assert.deepEqual(
    getAvailableAssessmentGroups([group, final], partials, "course").map((item) => item.id),
    ["transversal"],
  )
  const completed = [...partials, { ...partials[0], id: "et", groupId: "transversal", weight: 100, weightWithinGroup: 100 }]
  assert.deepEqual(getAvailableAssessmentGroups([group, final], completed, "course"), [])
  assert.deepEqual(
    getAvailableAssessmentGroups([group, final], completed, "course", "g-2").map((item) => item.id),
    ["partials"],
  )
  assert.equal(getMaximumAssessmentWeight(partials, "g-2"), 20)
})

test("distingue estructura pendiente, válida y heredada incompatible", () => {
  assert.equal(getSubjectStructureStatus([], [], "course"), "missing")
  assert.equal(getSubjectStructureStatus([group, { ...group, id: "transversal", kind: "final_exam", courseWeight: 40 }], [], "course"), "valid")
  assert.equal(getSubjectStructureStatus([{ ...group, courseWeight: 70 }], [], "course"), "invalid")
  assert.equal(getSubjectStructureStatus([group], [...assessments(5), { ...assessments(1)[0], id: "extra" }], "course"), "invalid")
})

test("la escala chilena es predeterminada y una escala existente se conserva", () => {
  assert.deepEqual(EMPTY_APP_DATA.settings.gradeScale, { min: 1, max: 7, passing: 4 })
  const fresh = migrateData({ ...EMPTY_APP_DATA, settings: undefined })
  assert.deepEqual(fresh.settings.gradeScale, { min: 1, max: 7, passing: 4 })
  const custom = migrateData({
    ...EMPTY_APP_DATA,
    settings: { ...EMPTY_APP_DATA.settings, gradeScale: { min: 1, max: 20, passing: 11 } },
  })
  assert.deepEqual(custom.settings.gradeScale, { min: 1, max: 20, passing: 11 })
})

test("reconoce solo el transversal estándar por semántica de la estructura", () => {
  const partials = group
  const final = { ...group, id: "transversal", kind: "final_exam" as const, courseWeight: 40, position: 2 }
  assert.equal(isStandardSingleAssessmentFinalGroup(final, [partials, final]), true)
  assert.equal(isStandardSingleAssessmentFinalGroup({ ...final, name: "Nombre editable" }, [partials, final]), true)
  assert.equal(isStandardSingleAssessmentFinalGroup(final, [{ ...partials, courseWeight: 30 }, final]), false)
  assert.equal(isStandardSingleAssessmentFinalGroup(final, [partials, final, { ...partials, id: "lab", kind: "laboratory", courseWeight: 30 }]), false)
})

test("la UI de notas no expone estado, evita duplicados y presenta simulación contextual", () => {
  const form = readFileSync("components/grade-form.tsx", "utf8")
  const panel = readFileSync("components/grades-panel.tsx", "utf8")
  const editor = readFileSync("components/grades/assessment-editor.tsx", "utf8")
  const groupEditor = readFileSync("components/grades/assessment-group-editor.tsx", "utf8")
  const simulator = readFileSync("components/grades/grade-simulator.tsx", "utf8")
  assert.doesNotMatch(form, /g-status/)
  assert.match(form, /status: "graded"/)
  assert.match(form, /getMaximumAssessmentWeight/)
  assert.match(form, /Esta evaluación representa el 100% del grupo transversal/)
  assert.doesNotMatch(panel, /subjectGrades\.map/)
  assert.match(panel, /CollapsibleTrigger/)
  assert.match(panel, /aria-expanded/)
  assert.match(editor, /assessment\.score/)
  assert.match(editor, /formatWeight/)
  assert.doesNotMatch(editor, /Peso final del grupo:/)
  assert.match(groupEditor, /Math\.abs\(total - 100\) <= 0\.001/)
  assert.match(simulator, /Simular nota de/)
  assert.match(simulator, /Select/)
  assert.match(simulator, /evaluateSubjectGradingPlan/)
})

test("el registro es secuencial, muestra errores locales y mantiene acciones móviles accesibles", () => {
  const form = readFileSync("components/grade-form.tsx", "utf8")
  const panel = readFileSync("components/grades-panel.tsx", "utf8")
  const manager = readFileSync("components/grades/grading-plan-manager.tsx", "utf8")
  assert.match(form, /disabled=\{!groupId\}/)
  assert.match(form, /Selecciona primero un grupo|Selecciona un grupo de evaluación/)
  assert.match(form, /errors\.title/)
  assert.match(form, /errors\.score/)
  assert.match(form, /errors\.weight/)
  assert.doesNotMatch(form, /errors\.map/)
  assert.match(form, /100dvh/)
  assert.match(form, /overflow-y-auto/)
  assert.match(form, /safe-area-inset-bottom/)
  assert.match(form, /cambios sin guardar/)
  assert.match(panel, /Configura cómo se calculará esta asignatura/)
  assert.match(panel, /Estructura requiere revisión/)
  assert.match(panel, /getAvailableAssessmentGroups/)
  assert.match(manager, /Detalles y estadísticas/)
  assert.match(manager, /useState\(false\)/)
})
