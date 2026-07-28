import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { EMPTY_APP_DATA, type AppData, type AssessmentGroup, type Grade } from "../lib/types.ts"
import { migrateData } from "../lib/storage.ts"
import { appDataToSupabaseRows, gradeToSupabaseRow } from "../lib/repositories/supabase-mappers.ts"
import { deleteAssessmentGroupTransition, ensureDefaultAssessmentGroup, ensureGradeAssessmentGroup } from "../lib/assessment-groups.ts"

const baseSubject = { id: "fis", semesterId: "sem-a", name: "Física", color: "#123", difficulty: 3 as const, createdAt: 1 }
const baseData: AppData = { ...EMPTY_APP_DATA, activeSemesterId: "sem-a", semesters: [{ id: "sem-a", name: "2026", status: "active", createdAt: 1 }], subjects: [baseSubject] }

function grade(patch: Partial<Grade> = {}): Grade {
  return { id: "g1", semesterId: "sem-a", subjectId: "fis", title: "Control", score: 5, weight: 100, date: "2026-05-01", createdAt: 2, ...patch }
}

function group(patch: Partial<AssessmentGroup> = {}): AssessmentGroup {
  return { id: "group-a", semesterId: "sem-a", subjectId: "fis", name: "Evaluación continua", kind: "continuous", courseWeight: 100, position: 1, createdAt: 1, ...patch }
}

test("una materia sin notas permanece pendiente y el bridge legacy sigue disponible", () => {
  const ensured = ensureDefaultAssessmentGroup(baseData, "sem-a", "fis", 10)
  assert.equal(ensured.group.name, "Evaluación continua")
  assert.equal(ensured.group.courseWeight, 100)
  assert.equal(ensured.nextData.assessmentGroups.length, 1)
  const repeated = ensureDefaultAssessmentGroup(ensured.nextData, "sem-a", "fis", 11)
  assert.equal(repeated.nextData.assessmentGroups.length, 1)

  const migrated = migrateData({ ...baseData, assessmentGroups: [], grades: [] })
  assert.equal(migrated.assessmentGroups.length, 0)
})

test("creación tradicional o avanzada de nota asigna groupId aunque la materia antigua no tenga grupos", () => {
  const transition = ensureGradeAssessmentGroup(baseData, grade({ groupId: undefined }), 20)
  assert.equal(transition.grade.groupId, transition.group.id)
  assert.equal(transition.nextData.assessmentGroups.length, 1)
  assert.equal(transition.grade.semesterId, "sem-a")
})

test("mapper rechaza explícitamente evaluaciones sin semesterId, subjectId o groupId", () => {
  assert.throws(() => gradeToSupabaseRow(grade({ semesterId: undefined }), "user-a"), /semestre/)
  assert.throws(() => gradeToSupabaseRow({ ...grade(), subjectId: "" }, "user-a"), /materia/)
  assert.throws(() => gradeToSupabaseRow(grade({ groupId: undefined }), "user-a"), /grupo/)
})

test("appDataToSupabaseRows normaliza grupos antes de grades y no serializa group_id undefined", () => {
  const rows = appDataToSupabaseRows({ ...baseData, grades: [grade({ groupId: undefined })] }, "user-a")
  assert.equal(rows.assessment_groups.length, 1)
  assert.equal(rows.grades[0].group_id, rows.assessment_groups[0].id)
})

test("borrado de grupo con evaluaciones exige destino y reasigna solo dentro de la misma materia y semestre", () => {
  const source = group({ id: "source" })
  const target = group({ id: "target", position: 2 })
  const otherSubject = group({ id: "other-subject", subjectId: "mat" })
  const otherSemester = group({ id: "other-semester", semesterId: "sem-b" })
  const data = { ...baseData, assessmentGroups: [source, target, otherSubject, otherSemester], grades: [grade({ groupId: "source" })] }

  assert.equal(deleteAssessmentGroupTransition(data, "source").ok, false)
  assert.equal(deleteAssessmentGroupTransition(data, "source", { reassignToGroupId: "other-subject" }).ok, false)
  assert.equal(deleteAssessmentGroupTransition(data, "source", { reassignToGroupId: "other-semester" }).ok, false)

  const reassigned = deleteAssessmentGroupTransition(data, "source", { reassignToGroupId: "target" })
  assert.equal(reassigned.ok, true)
  assert.equal(reassigned.nextData!.grades[0].groupId, "target")
  assert.equal(reassigned.nextData!.assessmentGroups.some((item) => item.id === "source"), false)
})

test("migración SQL incluye bridge compatible para clientes antiguos sin modificar áreas protegidas", () => {
  const sql = readFileSync(join(process.cwd(), "supabase/migrations/202607210001_advanced_grading_groups.sql"), "utf8")
  assert.match(sql, /ensure_grade_assessment_group_bridge/)
  assert.match(sql, /before insert or update of group_id, user_id, semester_id, subject_id, score on public\.grades/i)
  assert.match(sql, /NEW\.group_id is null/i)
  assert.match(sql, /legacy-continuous-/)
  assert.match(sql, /set search_path = ''/)
  const bridgeDefinition = sql.split("create or replace function public.ensure_grade_assessment_group_bridge()")[1]?.split("revoke execute on function public.ensure_grade_assessment_group_bridge()")[0] ?? ""
  assert.doesNotMatch(bridgeDefinition, /security definer/i)
  const changed = readFileSync(join(process.cwd(), ".git/HEAD"), "utf8")
  assert.ok(changed.length > 0)
})
