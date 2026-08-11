import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { evaluateSubjectGradingPlan } from "../domain/grading/index.ts"
import { buildAcademicAgenda, getZonedDateTimeParts } from "../domain/academic-agenda/index.ts"
import { buildScheduleDocumentModel, createSchedulePdfRenderer } from "../domain/schedule-pdf/index.ts"
import { appDataToSupabaseRows, supabaseRowsToAppData } from "../lib/repositories/supabase-mappers.ts"
import { migrateData } from "../lib/storage.ts"
import type { AppData } from "../lib/types.ts"

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), "utf8")

describe("regresión integración académica avanzada", () => {
  it("corrige migración: grade_date, hardening set_updated_at y FK compuesta completa", () => {
    const sql = read("supabase/migrations/202607210001_advanced_grading_groups.sql")
    assert.equal(/public\.grades[\s\S]*\bdate\b/.test(sql), false, "grades no debe usar columna date")
    assert.match(sql, /grade_date/)
    assert.equal(/create or replace function public\.set_updated_at/.test(sql), false, "no debe redefinir set_updated_at")
    assert.match(sql, /set search_path = ''/)
    assert.match(sql, /pg_catalog\.now\(\)/)
    assert.match(sql, /revoke execute on function public\.set_updated_at\(\) from public, anon, authenticated/)
    assert.match(sql, /unique\s*\(id, user_id, semester_id, subject_id\)/i)
    assert.match(sql, /foreign key \(group_id, user_id, semester_id, subject_id\)/i)
    assert.match(sql, /raise exception 'advanced_grading_legacy_group_backfill_failed/i)
  })

  it("corrige semántica: 2,5 requerido no es aprobado matemático y currentFinalGrade no es contribución", () => {
    const result = evaluateSubjectGradingPlan({
      semesterId: "sem-a",
      subjectId: "fis",
      scale: { min: 1, max: 7, passing: 4 },
      targetGrade: 4,
      groups: [
        { id: "presentation", semesterId: "sem-a", subjectId: "fis", name: "Presentación", kind: "continuous", courseWeight: 60, position: 1, createdAt: 1 },
        { id: "transversal", semesterId: "sem-a", subjectId: "fis", name: "Transversal", kind: "final_exam", courseWeight: 40, position: 2, createdAt: 1 },
      ],
      assessments: [
        { id: "p1", semesterId: "sem-a", subjectId: "fis", groupId: "presentation", title: "P1", score: 5, weightWithinGroup: 100, scheduledDate: "2026-05-01", status: "graded", createdAt: 1 },
        { id: "ex", semesterId: "sem-a", subjectId: "fis", groupId: "transversal", title: "Examen", score: null, weightWithinGroup: 100, scheduledDate: "2026-07-01", status: "planned", createdAt: 2 },
      ],
    })
    assert.equal(result.presentationAverage, 5)
    assert.equal(result.evaluatedAverage, 5)
    assert.equal(result.currentContribution, 3)
    assert.equal(result.currentFinalGrade, null)
    assert.equal(result.minimumPossibleFinalGrade, 3.4)
    assert.equal(result.requiredFinalExamScore?.requiredScore, 2.5)
    assert.equal(result.mathematicallyApproved, false)
    assert.equal(result.status, "in_progress")
  })

  it("integra assessmentGroups en AppData, legacy localStorage y mappers Supabase", () => {
    const legacy = migrateData({
      subjects: [{ id: "fis", name: "Física", color: "#111", difficulty: 3, createdAt: 1, commandKey: "FIS" }],
      grades: [{ id: "g1", subjectId: "fis", title: "Control", score: 6, weight: 50, date: "2026-05-01", notes: "ok", createdAt: 1 }],
    })
    assert.ok(Array.isArray(legacy.assessmentGroups))
    assert.equal(legacy.assessmentGroups[0].name, "Evaluación continua")
    assert.equal(legacy.grades[0].groupId, legacy.assessmentGroups[0].id)
    assert.equal(legacy.grades[0].status, "graded")

    const rows = appDataToSupabaseRows(legacy, "user-a")
    assert.ok("assessment_groups" in rows)
    assert.equal(rows.grades[0].grade_date, "2026-05-01")
    assert.equal(rows.grades[0].group_id, legacy.grades[0].groupId)
    const roundTrip = supabaseRowsToAppData(rows)
    assert.equal(roundTrip.assessmentGroups[0].id, legacy.assessmentGroups[0].id)
    assert.equal(roundTrip.grades[0].score, 6)
  })

  it("expone operaciones del store y UI visible de configurador, agenda, consejero y PDF", () => {
    const storeSource = read("hooks/use-schedule-store.ts")
    for (const name of ["createAssessmentGroup", "updateAssessmentGroup", "deleteAssessmentGroup", "reorderAssessmentGroups", "applyGradingPreset", "createAssessment", "updateAssessment", "deleteAssessment", "duplicateGradingPlan", "simulateAssessmentScore"]) {
      assert.match(storeSource, new RegExp(`\\b${name}\\b`), `${name} debe existir en store`)
    }
    assert.ok(existsSync(join(root, "components/grades/grading-plan-manager.tsx")))
    assert.ok(existsSync(join(root, "components/grades/grade-projection-card.tsx")))
    assert.ok(existsSync(join(root, "components/grades/grade-simulator.tsx")))
    assert.match(read("components/grades-panel.tsx"), /GradingPlanManager/)
    assert.match(read("components/schedule-grid.tsx"), /Vista previa PDF/)
    assert.match(read("components/schedule-grid.tsx"), /Descargar PDF/)
    assert.ok(existsSync(join(root, "components/academic-agenda-panel.tsx")))
    assert.ok(existsSync(join(root, "components/horarily/horarily-companion.tsx")))
    assert.match(read("app/page.tsx"), /HorarilyCompanion/)
  })

  it("agenda agrega clases y no fija evaluaciones a 12:00 UTC", () => {
    const agenda = buildAcademicAgenda({
      now: new Date("2026-06-01T08:00:00-04:00"),
      semesterId: "sem-a",
      timezone: "America/Santiago",
      subjects: [{ id: "fis", name: "Física" }],
      assessments: [{ id: "a1", semesterId: "sem-a", subjectId: "fis", groupId: "g", title: "Prueba", score: null, weightWithinGroup: 100, scheduledDate: "2026-06-02", status: "planned", createdAt: 1 }],
      classes: [{ id: "c1", semesterId: "sem-a", subjectId: "fis", day: "lunes", start: "09:00", end: "10:00", title: "Clase Física" }],
      studyBlocks: [],
      reminders: [],
    })
    assert.equal(agenda.next7Days.some((item) => item.kind === "class"), true)
    const assessment = agenda.next7Days.find((item) => item.kind === "assessment")
    assert.ok(assessment)
    assert.deepEqual(getZonedDateTimeParts(assessment!.startsAt, "America/Santiago"), { year: 2026, month: 6, day: 2, hour: 8, minute: 0, weekday: "martes" })
  })

  it("PDF real contiene tabla verificable, catálogo/pages y preview/descarga comparten bytes", async () => {
    const model = buildScheduleDocumentModel({
      profile: { displayName: "María Pérez", email: "maria@example.test", institution: "U", career: "Ingeniería" },
      semester: { id: "sem-a", name: "2026-1", startsOn: "2026-03-01", endsOn: "2026-07-15" },
      subjects: [{ id: "fis", name: "Física", color: "#123456" }],
      modules: [{ id: "m1", label: "M1", start: "08:00", end: "08:45" }],
      schedule: [{ subjectId: "fis", day: "lunes", moduleIds: ["m1"] }],
      generatedAt: new Date("2026-07-01T00:00:00Z"),
      options: { includeSaturday: true, includeSunday: true, includeStudyBlocks: false, hidePersonalData: false },
    })
    const renderer = createSchedulePdfRenderer()
    const preview = await renderer.render(model)
    const download = await renderer.render(model)
    const text = Buffer.from(preview.bytes).toString("latin1")
    assert.equal(preview.mimeType, "application/pdf")
    assert.deepEqual(preview.bytes, download.bytes)
    assert.ok(preview.bytes.length > 1200)
    assert.match(text, /\/Type\s*\/Catalog/)
    assert.match(text, /\/Type\s*\/Page/)
    assert.match(text, /Horario académico/)
    assert.match(text, /Lunes/)
    assert.match(text, /M1/)
    assert.match(text, /Física/)
    assert.equal(text.includes("maria@example.test"), false)
  })
})
