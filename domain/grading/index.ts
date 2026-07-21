import type { AssessmentGroup as AppAssessmentGroup, Grade, GradeScale } from "../../lib/types"
export type AssessmentGroup = AppAssessmentGroup

export type AssessmentGroupKind = AppAssessmentGroup["kind"]
export type AssessmentStatus = NonNullable<Grade["status"]>
export interface Assessment { id: string; semesterId?: string; subjectId: string; groupId: string; title: string; score: number | null; weight?: number; weightWithinGroup: number; date?: string; scheduledDate: string; status: AssessmentStatus; notes?: string; createdAt: number }
export type SubjectAcademicStatus = "no_data" | "incomplete_configuration" | "in_progress" | "requires_attention" | "at_risk" | "mathematically_approved" | "impossible_target" | "finished"

export interface SubjectGradingPlan { semesterId: string; subjectId: string; groups: AssessmentGroup[]; assessments: Assessment[]; scale: GradeScale; targetGrade?: number }
export interface PlanValidity { isValid: boolean; warnings: string[]; errors: string[] }
export interface RequiredScoreResult { requiredScore: number | null; status: "ok" | "below_minimum" | "impossible_high" | "no_pending_weight" }
export interface GroupProjection { groupId: string; name: string; kind: AssessmentGroupKind; courseWeight: number; average: number | null; evaluatedCoverage: number; effectiveEvaluatedWeight: number; internalWeightTotal: number; requiredForTarget: RequiredScoreResult | null }
export interface SubjectProjection { scale: GradeScale; validity: PlanValidity; groups: GroupProjection[]; presentationAverage: number | null; evaluatedAverage: number | null; currentContribution: number; currentFinalGrade: number | null; projectedFinalGrade: number | null; definitiveFinalGrade: number | null; minimumPossibleFinalGrade: number; maximumPossibleFinalGrade: number; requiredFinalExamScore: RequiredScoreResult | null; confidence: "none" | "low" | "medium" | "high" | "complete"; distanceToPassing: number | null; mathematicallyApproved: boolean; impossibleTarget: boolean; status: SubjectAcademicStatus }

const EPS = 0.000001
const round = (n: number) => Math.round((n + Number.EPSILON) * 10000) / 10000
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)
const approx100 = (n: number) => Math.abs(n - 100) <= 0.001
const assessmentWeight = (assessment: Assessment | Grade) => "weightWithinGroup" in assessment && typeof assessment.weightWithinGroup === "number" ? assessment.weightWithinGroup : assessment.weight
const assessmentDate = (assessment: Assessment | Grade) => "scheduledDate" in assessment && assessment.scheduledDate ? assessment.scheduledDate : assessment.date

export function getAssessmentEffectiveWeight(group: AssessmentGroup, assessment: Assessment | Grade): number {
  return round((group.courseWeight * (assessmentWeight(assessment) ?? 0)) / 100)
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
    const total = sum(groupAssessments.map((assessment) => assessment.status === "exempt" ? 0 : (assessmentWeight(assessment) ?? 0)))
    if (groupAssessments.length === 0) warnings.push(`Grupo ${group.name} no tiene evaluaciones.`)
    if (!approx100(total)) warnings.push(`Los pesos dentro de ${group.name} suman ${round(total)}%, deberían sumar 100%.`)
    if (total > 100 + EPS) errors.push(`Los pesos dentro de ${group.name} superan 100%.`)
    for (const assessment of groupAssessments) {
      if (assessment.semesterId !== plan.semesterId || assessment.subjectId !== plan.subjectId) errors.push(`Evaluación ${assessment.id} no pertenece al semestre/asignatura del plan.`)
      if ((assessmentWeight(assessment) ?? 0) < 0 || (assessmentWeight(assessment) ?? 0) > 100) errors.push(`Evaluación ${assessment.title} tiene peso interno fuera de rango.`)
      if (assessment.score !== null && (assessment.score < plan.scale.min || assessment.score > plan.scale.max)) errors.push(`Evaluación ${assessment.title} está fuera de escala.`)
      if (assessment.status === "graded" && assessment.score === null) errors.push(`Evaluación ${assessment.title} está calificada sin nota.`)
    }
  }
  return { isValid: errors.length === 0 && warnings.length === 0, warnings, errors }
}

export function requiredScoreForTarget(input: { currentWeightedContribution: number; pendingEffectiveWeight: number; target: number; scale: GradeScale }): RequiredScoreResult {
  if (input.pendingEffectiveWeight <= 0) return { requiredScore: null, status: "no_pending_weight" }
  const required = ((input.target - input.currentWeightedContribution) * 100) / input.pendingEffectiveWeight
  if (required < input.scale.min) return { requiredScore: input.scale.min, status: "below_minimum" }
  if (required > input.scale.max) return { requiredScore: round(required), status: "impossible_high" }
  return { requiredScore: round(required), status: "ok" }
}

export function evaluateSubjectGradingPlan(plan: SubjectGradingPlan): SubjectProjection {
  const validity = validateSubjectGradingPlan(plan)
  const orderedGroups = [...plan.groups].sort((a, b) => a.position - b.position)
  let currentContributionRaw = 0
  let projectedContributionRaw = 0
  let minRaw = 0
  let maxRaw = 0
  let effectiveEvaluated = 0
  let evaluatedWeighted = 0
  const groupResults = orderedGroups.map((group): GroupProjection => {
    const active = plan.assessments.filter((a) => a.groupId === group.id && a.status !== "exempt")
    const graded = active.filter((a) => a.status === "graded" && a.score !== null)
    const gradedWeight = sum(graded.map((a) => assessmentWeight(a) ?? 0))
    const internalTotal = sum(active.map((a) => assessmentWeight(a) ?? 0))
    const averageRaw = gradedWeight > 0 ? sum(graded.map((a) => (a.score ?? 0) * (assessmentWeight(a) ?? 0))) / gradedWeight : null
    const average = averageRaw === null ? null : round(averageRaw)
    const evaluatedCoverage = internalTotal > 0 ? Math.min(1, gradedWeight / internalTotal) : 0
    const effectiveEvaluatedWeight = (group.courseWeight * gradedWeight) / 100
    effectiveEvaluated += effectiveEvaluatedWeight
    if (averageRaw !== null) {
      currentContributionRaw += (averageRaw * effectiveEvaluatedWeight) / 100
      projectedContributionRaw += (averageRaw * group.courseWeight) / 100
      evaluatedWeighted += averageRaw * effectiveEvaluatedWeight
    }
    const missingEffective = Math.max(0, group.courseWeight - effectiveEvaluatedWeight)
    minRaw += (averageRaw !== null ? (averageRaw * effectiveEvaluatedWeight) / 100 : 0) + (missingEffective * plan.scale.min) / 100
    maxRaw += (averageRaw !== null ? (averageRaw * effectiveEvaluatedWeight) / 100 : 0) + (missingEffective * plan.scale.max) / 100
    return { groupId: group.id, name: group.name, kind: group.kind, courseWeight: group.courseWeight, average, evaluatedCoverage, effectiveEvaluatedWeight: round(effectiveEvaluatedWeight), internalWeightTotal: internalTotal, requiredForTarget: null }
  })
  const presentationGroups = groupResults.filter((g) => g.kind !== "final_exam" && g.average !== null)
  const presentationWeight = sum(presentationGroups.map((g) => g.courseWeight))
  const presentationAverage = presentationWeight > 0 ? round(sum(presentationGroups.map((g) => (g.average ?? 0) * g.courseWeight)) / presentationWeight) : null
  if (presentationAverage !== null) for (const group of groupResults) if (group.kind === "final_exam" && group.average === null) projectedContributionRaw += (presentationAverage * group.courseWeight) / 100
  const target = plan.targetGrade ?? plan.scale.passing
  const finalExam = orderedGroups.find((group) => group.kind === "final_exam")
  const requiredFinalExamScore = finalExam ? requiredScoreForTarget({ currentWeightedContribution: currentContributionRaw, pendingEffectiveWeight: finalExam.courseWeight, target, scale: plan.scale }) : null
  const evaluatedAverage = effectiveEvaluated > 0 ? round(evaluatedWeighted / effectiveEvaluated) : null
  const complete = effectiveEvaluated >= 99.999 && validity.isValid
  const projectedFinalGrade = validity.isValid ? round(projectedContributionRaw) : null
  const definitiveFinalGrade = complete ? round(currentContributionRaw) : null
  const minimumPossibleFinalGrade = round(minRaw)
  const maximumPossibleFinalGrade = round(maxRaw)
  const impossibleTarget = maximumPossibleFinalGrade + EPS < target
  const mathematicallyApproved = minimumPossibleFinalGrade + EPS >= plan.scale.passing
  const distanceToPassing = projectedFinalGrade === null ? null : round(projectedFinalGrade - plan.scale.passing)
  const confidence = complete ? "complete" : effectiveEvaluated >= 75 ? "high" : effectiveEvaluated >= 40 ? "medium" : effectiveEvaluated > 0 ? "low" : "none"
  const status: SubjectAcademicStatus = plan.assessments.length === 0 ? "no_data" : !validity.isValid ? "incomplete_configuration" : impossibleTarget ? "impossible_target" : complete ? "finished" : mathematicallyApproved ? "mathematically_approved" : projectedFinalGrade !== null && projectedFinalGrade < plan.scale.passing ? "at_risk" : "in_progress"
  return { scale: plan.scale, validity, groups: groupResults, presentationAverage, evaluatedAverage, currentContribution: round(currentContributionRaw), currentFinalGrade: complete ? round(currentContributionRaw) : null, projectedFinalGrade, definitiveFinalGrade, minimumPossibleFinalGrade, maximumPossibleFinalGrade, requiredFinalExamScore, confidence, distanceToPassing, mathematicallyApproved, impossibleTarget, status }
}

export function createDefaultLegacyGroup(semesterId: string, subjectId: string): AssessmentGroup {
  return { id: `legacy-continuous-${semesterId}-${subjectId}`, semesterId, subjectId, name: "Evaluación continua", kind: "continuous", courseWeight: 100, position: 1, createdAt: 0 }
}

export function migrateLegacyGradesToPlan(input: { semesterId: string; subjectId: string; legacyGrades: Grade[]; scale?: GradeScale }): SubjectGradingPlan {
  const group = createDefaultLegacyGroup(input.semesterId, input.subjectId)
  return { semesterId: input.semesterId, subjectId: input.subjectId, scale: input.scale ?? { min: 1, max: 7, passing: 4 }, groups: [group], assessments: input.legacyGrades.filter((grade) => grade.semesterId === input.semesterId && grade.subjectId === input.subjectId).map((grade) => ({ ...grade, groupId: grade.groupId ?? group.id, score: grade.score, weightWithinGroup: grade.weightWithinGroup ?? grade.weight, scheduledDate: assessmentDate(grade) ?? grade.date, status: grade.status ?? "graded" })) }
}

export const gradingPresets = {
  continuous100: () => ({ groups: [{ name: "Evaluación continua", kind: "continuous", courseWeight: 100 }] }),
  presentation60Transversal40: () => ({ groups: [{ name: "Presentación", kind: "continuous", courseWeight: 60 }, { name: "Examen transversal", kind: "final_exam", courseWeight: 40 }] }),
  laboratoryTheoryTransversal: () => ({ groups: [{ name: "Laboratorio", kind: "laboratory", courseWeight: 30 }, { name: "Teoría", kind: "continuous", courseWeight: 30 }, { name: "Examen transversal", kind: "final_exam", courseWeight: 40 }] }),
  custom: () => ({ groups: [] }),
} as const
