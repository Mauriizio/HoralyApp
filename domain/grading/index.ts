import type { Grade, GradeScale } from "../../lib/types"

export type AssessmentGroupKind = "continuous" | "laboratory" | "project" | "final_exam" | "custom"
export type AssessmentStatus = "planned" | "graded" | "missing" | "exempt"
export type SubjectAcademicStatus = "no_data" | "in_progress" | "requires_attention" | "at_risk" | "mathematically_approved" | "impossible_target"

export interface AssessmentGroup { id: string; semesterId: string; subjectId: string; name: string; kind: AssessmentGroupKind; courseWeight: number; position: number; createdAt: number }
export interface Assessment { id: string; semesterId: string; subjectId: string; groupId: string; title: string; score: number | null; weightWithinGroup: number; scheduledDate: string; status: AssessmentStatus; notes?: string; createdAt: number }
export interface SubjectGradingPlan { semesterId: string; subjectId: string; groups: AssessmentGroup[]; assessments: Assessment[]; scale: GradeScale; targetGrade?: number }
export interface PlanValidity { isValid: boolean; warnings: string[]; errors: string[] }
export interface RequiredScoreResult { requiredScore: number | null; status: "ok" | "below_minimum" | "impossible_high" | "no_pending_weight" }
export interface GroupProjection { groupId: string; name: string; kind: AssessmentGroupKind; courseWeight: number; average: number | null; evaluatedCoverage: number; effectiveEvaluatedWeight: number; internalWeightTotal: number; requiredForTarget: RequiredScoreResult | null }
export interface SubjectProjection { scale: GradeScale; validity: PlanValidity; groups: GroupProjection[]; presentationAverage: number | null; currentFinalGrade: number | null; projectedFinalGrade: number | null; requiredFinalExamScore: RequiredScoreResult | null; confidence: "none" | "low" | "medium" | "high" | "complete"; distanceToPassing: number | null; mathematicallyApproved: boolean; status: SubjectAcademicStatus }

const EPS = 0.000001
const round = (n: number) => Math.round((n + Number.EPSILON) * 10000) / 10000
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)
const approx100 = (n: number) => Math.abs(n - 100) <= 0.001

export function getAssessmentEffectiveWeight(group: AssessmentGroup, assessment: Assessment): number {
  return round((group.courseWeight * assessment.weightWithinGroup) / 100)
}

export function validateSubjectGradingPlan(plan: SubjectGradingPlan): PlanValidity {
  const warnings: string[] = []
  const errors: string[] = []
  const groupTotal = sum(plan.groups.map((group) => group.courseWeight))
  if (!approx100(groupTotal)) warnings.push(`Los pesos de grupos suman ${round(groupTotal)}%, deberían sumar 100%.`)
  if (groupTotal > 100 + EPS) errors.push("Los pesos de grupos superan 100%.")
  for (const group of plan.groups) {
    if (group.semesterId !== plan.semesterId || group.subjectId !== plan.subjectId) errors.push(`Grupo ${group.id} no pertenece al semestre/asignatura del plan.`)
    if (group.courseWeight < 0 || group.courseWeight > 100) errors.push(`Grupo ${group.name} tiene peso final fuera de rango.`)
    const groupAssessments = plan.assessments.filter((a) => a.groupId === group.id)
    const total = sum(groupAssessments.map((assessment) => assessment.status === "exempt" ? 0 : assessment.weightWithinGroup))
    if (groupAssessments.length === 0) warnings.push(`Grupo ${group.name} no tiene evaluaciones.`)
    if (!approx100(total)) warnings.push(`Los pesos dentro de ${group.name} suman ${round(total)}%, deberían sumar 100%.`)
    if (total > 100 + EPS) errors.push(`Los pesos dentro de ${group.name} superan 100%.`)
    for (const assessment of groupAssessments) {
      if (assessment.semesterId !== plan.semesterId || assessment.subjectId !== plan.subjectId) errors.push(`Evaluación ${assessment.id} no pertenece al semestre/asignatura del plan.`)
      if (assessment.weightWithinGroup < 0 || assessment.weightWithinGroup > 100) errors.push(`Evaluación ${assessment.title} tiene peso interno fuera de rango.`)
      if (assessment.score !== null && (assessment.score < plan.scale.min || assessment.score > plan.scale.max)) errors.push(`Evaluación ${assessment.title} está fuera de escala.`)
    }
  }
  return { isValid: errors.length === 0 && warnings.length === 0, warnings, errors }
}

export function requiredScoreForTarget(input: { currentWeightedContribution: number; pendingEffectiveWeight: number; target: number; scale: GradeScale }): RequiredScoreResult {
  if (input.pendingEffectiveWeight <= 0) return { requiredScore: null, status: "no_pending_weight" }
  const required = round(((input.target - input.currentWeightedContribution) * 100) / input.pendingEffectiveWeight)
  if (required < input.scale.min) return { requiredScore: input.scale.min, status: "below_minimum" }
  if (required > input.scale.max) return { requiredScore: required, status: "impossible_high" }
  return { requiredScore: required, status: "ok" }
}

export function evaluateSubjectGradingPlan(plan: SubjectGradingPlan): SubjectProjection {
  const validity = validateSubjectGradingPlan(plan)
  const orderedGroups = [...plan.groups].sort((a, b) => a.position - b.position)
  let currentContribution = 0
  let projectedContribution = 0
  let effectiveEvaluated = 0
  const groupResults = orderedGroups.map((group): GroupProjection => {
    const active = plan.assessments.filter((a) => a.groupId === group.id && a.status !== "exempt")
    const graded = active.filter((a) => a.status === "graded" && a.score !== null)
    const gradedWeight = sum(graded.map((a) => a.weightWithinGroup))
    const internalTotal = sum(active.map((a) => a.weightWithinGroup))
    const average = gradedWeight > 0 ? round(sum(graded.map((a) => (a.score ?? 0) * a.weightWithinGroup)) / gradedWeight) : null
    const evaluatedCoverage = internalTotal > 0 ? Math.min(1, gradedWeight / internalTotal) : 0
    const effectiveEvaluatedWeight = round((group.courseWeight * gradedWeight) / 100)
    if (average !== null) {
      currentContribution += (average * effectiveEvaluatedWeight) / 100
      projectedContribution += (average * group.courseWeight) / 100
      effectiveEvaluated += effectiveEvaluatedWeight
    }
    return { groupId: group.id, name: group.name, kind: group.kind, courseWeight: group.courseWeight, average, evaluatedCoverage, effectiveEvaluatedWeight, internalWeightTotal: internalTotal, requiredForTarget: null }
  })
  const presentationGroups = groupResults.filter((g) => g.kind !== "final_exam" && g.average !== null)
  const presentationWeight = sum(presentationGroups.map((g) => g.courseWeight))
  const presentationAverage = presentationWeight > 0 ? round(sum(presentationGroups.map((g) => (g.average ?? 0) * g.courseWeight)) / presentationWeight) : null
  if (presentationAverage !== null) {
    for (const group of groupResults) {
      if (group.kind === "final_exam" && group.average === null) projectedContribution += (presentationAverage * group.courseWeight) / 100
    }
  }
  const target = plan.targetGrade ?? plan.scale.passing
  const finalExam = orderedGroups.find((group) => group.kind === "final_exam")
  const requiredFinalExamScore = finalExam ? requiredScoreForTarget({ currentWeightedContribution: currentContribution, pendingEffectiveWeight: finalExam.courseWeight, target, scale: plan.scale }) : null
  const currentFinalGrade = effectiveEvaluated > 0 ? round(currentContribution) : null
  const projectedFinalGrade = validity.isValid ? round(projectedContribution) : null
  const distanceToPassing = projectedFinalGrade === null ? null : round(projectedFinalGrade - plan.scale.passing)
  const mathematicallyApproved = requiredFinalExamScore?.status === "below_minimum" || (requiredFinalExamScore?.requiredScore !== null && requiredFinalExamScore?.requiredScore !== undefined && requiredFinalExamScore.requiredScore <= plan.scale.passing) || (currentFinalGrade !== null && currentFinalGrade >= plan.scale.passing && effectiveEvaluated >= 99.999)
  const confidence = effectiveEvaluated >= 99.999 ? "complete" : effectiveEvaluated >= 75 ? "high" : effectiveEvaluated >= 40 ? "medium" : effectiveEvaluated > 0 ? "low" : "none"
  const status: SubjectAcademicStatus = plan.assessments.length === 0 ? "no_data" : requiredFinalExamScore?.status === "impossible_high" ? "impossible_target" : mathematicallyApproved ? "mathematically_approved" : validity.errors.length > 0 || validity.warnings.length > 0 ? "requires_attention" : projectedFinalGrade !== null && projectedFinalGrade < plan.scale.passing ? "at_risk" : "in_progress"
  return { scale: plan.scale, validity, groups: groupResults, presentationAverage, currentFinalGrade, projectedFinalGrade, requiredFinalExamScore, confidence, distanceToPassing, mathematicallyApproved, status }
}

export function createDefaultLegacyGroup(semesterId: string, subjectId: string): AssessmentGroup {
  return { id: `legacy-continuous-${semesterId}-${subjectId}`, semesterId, subjectId, name: "Evaluación continua", kind: "continuous", courseWeight: 100, position: 1, createdAt: 0 }
}

export function migrateLegacyGradesToPlan(input: { semesterId: string; subjectId: string; legacyGrades: Grade[]; scale?: GradeScale }): SubjectGradingPlan {
  const group = createDefaultLegacyGroup(input.semesterId, input.subjectId)
  return { semesterId: input.semesterId, subjectId: input.subjectId, scale: input.scale ?? { min: 1, max: 7, passing: 4 }, groups: [group], assessments: input.legacyGrades.filter((grade) => grade.semesterId === input.semesterId && grade.subjectId === input.subjectId).map((grade) => ({ id: grade.id, semesterId: input.semesterId, subjectId: input.subjectId, groupId: group.id, title: grade.title, score: grade.score, weightWithinGroup: grade.weight, scheduledDate: grade.date, status: "graded", notes: grade.notes, createdAt: grade.createdAt })) }
}

export const gradingPresets = {
  continuous100: () => ({ groups: [{ name: "Evaluación continua", kind: "continuous", courseWeight: 100 }] }),
  presentation60Transversal40: () => ({ groups: [{ name: "Presentación", kind: "continuous", courseWeight: 60 }, { name: "Examen transversal", kind: "final_exam", courseWeight: 40 }] }),
  laboratoryTheoryTransversal: () => ({ groups: [{ name: "Laboratorio", kind: "laboratory", courseWeight: 30 }, { name: "Teoría", kind: "continuous", courseWeight: 30 }, { name: "Examen transversal", kind: "final_exam", courseWeight: 40 }] }),
  custom: () => ({ groups: [] }),
} as const
