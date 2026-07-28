import type { AppData, AssessmentGroup, Grade } from "./types.ts"

export const DEFAULT_ASSESSMENT_GROUP_NAME = "Evaluación continua"
export const INACTIVE_ASSESSMENT_GROUP_PREFIX = "Fuera de estructura · "

export function isActiveAssessmentGroup(group: Pick<AssessmentGroup, "name">): boolean {
  return !group.name.startsWith(INACTIVE_ASSESSMENT_GROUP_PREFIX)
}

const WEIGHT_EPSILON = 0.000001

export function getAssessmentInternalWeight(assessment: Pick<Grade, "weight" | "weightWithinGroup">): number {
  return assessment.weightWithinGroup ?? assessment.weight
}

export function getAssessmentInternalWeightTotal(assessments: Grade[], excludedAssessmentId?: string): number {
  return assessments.reduce((total, assessment) => {
    if (assessment.id === excludedAssessmentId || assessment.status === "exempt") return total
    return total + getAssessmentInternalWeight(assessment)
  }, 0)
}

export function getMaximumAssessmentWeight(assessments: Grade[], excludedAssessmentId?: string): number {
  return Math.max(0, 100 - getAssessmentInternalWeightTotal(assessments, excludedAssessmentId))
}

export function isStandardSingleAssessmentFinalGroup(
  group: AssessmentGroup,
  activeSubjectGroups: AssessmentGroup[],
): boolean {
  if (group.kind !== "final_exam" || Math.abs(group.courseWeight - 40) > WEIGHT_EPSILON) return false
  if (activeSubjectGroups.length !== 2) return false
  return activeSubjectGroups.some(
    (candidate) => candidate.id !== group.id
      && candidate.kind === "continuous"
      && Math.abs(candidate.courseWeight - 60) <= WEIGHT_EPSILON,
  )
}

export function inactiveAssessmentGroupName(name: string): string {
  return name.startsWith(INACTIVE_ASSESSMENT_GROUP_PREFIX)
    ? name
    : `${INACTIVE_ASSESSMENT_GROUP_PREFIX}${name}`
}

export function defaultAssessmentGroupId(semesterId: string, subjectId: string): string {
  return `legacy-continuous-${semesterId}-${subjectId}`
}

export function createDefaultAssessmentGroup(semesterId: string, subjectId: string, createdAt = Date.now()): AssessmentGroup {
  return {
    id: defaultAssessmentGroupId(semesterId, subjectId),
    semesterId,
    subjectId,
    name: DEFAULT_ASSESSMENT_GROUP_NAME,
    kind: "continuous",
    courseWeight: 100,
    position: 1,
    createdAt,
  }
}

function sameScope(group: Pick<AssessmentGroup, "semesterId" | "subjectId">, semesterId: string, subjectId: string): boolean {
  return group.semesterId === semesterId && group.subjectId === subjectId
}

export function findDefaultAssessmentGroup(data: AppData, semesterId: string, subjectId: string): AssessmentGroup | undefined {
  const id = defaultAssessmentGroupId(semesterId, subjectId)
  return data.assessmentGroups.find((group) => group.id === id && sameScope(group, semesterId, subjectId))
}

export function ensureDefaultAssessmentGroup(data: AppData, semesterId: string, subjectId: string, createdAt = Date.now()): { nextData: AppData; group: AssessmentGroup; created: boolean } {
  const existing = findDefaultAssessmentGroup(data, semesterId, subjectId)
  if (existing) return { nextData: data, group: existing, created: false }
  const active = data.assessmentGroups.find((group) => sameScope(group, semesterId, subjectId) && isActiveAssessmentGroup(group))
  if (active) return { nextData: data, group: active, created: false }
  const group = createDefaultAssessmentGroup(semesterId, subjectId, createdAt)
  return { nextData: { ...data, assessmentGroups: [...data.assessmentGroups, group].sort((a, b) => a.position - b.position) }, group, created: true }
}

export function ensureDefaultAssessmentGroupsForSubjects(data: AppData, createdAt = Date.now()): AppData {
  return data.subjects.reduce((nextData, subject) => {
    const semesterId = subject.semesterId ?? data.activeSemesterId
    if (!semesterId) return nextData
    return ensureDefaultAssessmentGroup(nextData, semesterId, subject.id, createdAt).nextData
  }, data)
}

export function ensureGradeAssessmentGroup(data: AppData, grade: Grade, createdAt = Date.now()): { nextData: AppData; grade: Grade; group: AssessmentGroup; created: boolean } {
  const subject = data.subjects.find((item) => item.id === grade.subjectId)
  const semesterId = grade.semesterId ?? subject?.semesterId ?? data.activeSemesterId
  if (!semesterId) throw new Error("No se puede crear una evaluación sin semestre.")
  if (!grade.subjectId) throw new Error("No se puede crear una evaluación sin materia.")

  const existing = grade.groupId
    ? data.assessmentGroups.find((group) => group.id === grade.groupId && sameScope(group, semesterId, grade.subjectId))
    : undefined
  if (existing) return { nextData: data, grade: { ...grade, semesterId, groupId: existing.id }, group: existing, created: false }

  const ensured = ensureDefaultAssessmentGroup(data, semesterId, grade.subjectId, createdAt)
  return { nextData: ensured.nextData, grade: { ...grade, semesterId, groupId: ensured.group.id }, group: ensured.group, created: ensured.created }
}

export function addGradeTransition(
  data: AppData,
  grade: Omit<Grade, "id" | "createdAt">,
  id: string,
  createdAt = Date.now(),
): { nextData: AppData; grade: Grade; createdGroup: AssessmentGroup | null } {
  const draft: Grade = {
    ...grade,
    id,
    createdAt,
    semesterId: grade.semesterId ?? data.activeSemesterId,
    status: grade.status ?? (grade.score === null ? "planned" : "graded"),
    weightWithinGroup: grade.weightWithinGroup ?? grade.weight,
  }
  const ensured = ensureGradeAssessmentGroup(data, draft, createdAt)
  const activeSubjectGroups = ensured.nextData.assessmentGroups.filter(
    (group) => group.subjectId === ensured.grade.subjectId && isActiveAssessmentGroup(group),
  )
  const groupAssessments = ensured.nextData.grades.filter((item) => item.groupId === ensured.group.id)
  const standardFinal = isStandardSingleAssessmentFinalGroup(ensured.group, activeSubjectGroups)
  if (standardFinal && groupAssessments.length > 0) {
    throw new Error("La ponderación de este grupo ya está completa.")
  }
  const normalizedGrade = standardFinal
    ? { ...ensured.grade, weight: 100, weightWithinGroup: 100 }
    : ensured.grade
  const maximumWeight = getMaximumAssessmentWeight(groupAssessments)
  if (getAssessmentInternalWeight(normalizedGrade) - maximumWeight > WEIGHT_EPSILON) {
    throw new Error(`Solo queda ${maximumWeight}% disponible en ${ensured.group.name}.`)
  }
  return {
    nextData: { ...ensured.nextData, grades: [...ensured.nextData.grades, normalizedGrade] },
    grade: normalizedGrade,
    createdGroup: ensured.created ? ensured.group : null,
  }
}

export type GradingPresetId =
  | "continuous100"
  | "presentation60Transversal40"
  | "laboratoryTheoryTransversal"
  | "custom"

export function applyGradingPresetTransition(
  data: AppData,
  subjectId: string,
  preset: GradingPresetId,
  createdAt = Date.now(),
  options: { preservePopulatedObsoleteGroups?: boolean } = {},
): {
  nextData: AppData
  groups: AssessmentGroup[]
  obsoletePopulatedGroups: AssessmentGroup[]
  requiresResolution: boolean
} {
  const subject = data.subjects.find((item) => item.id === subjectId)
  const semesterId = subject?.semesterId ?? data.activeSemesterId
  if (!semesterId) throw new Error("No se puede configurar una materia sin semestre.")
  const current = data.assessmentGroups
    .filter((group) => group.subjectId === subjectId && group.semesterId === semesterId && isActiveAssessmentGroup(group))
    .sort((a, b) => a.position - b.position)
  const specifications = {
    continuous100: [{ name: "Evaluación continua", kind: "continuous" as const, courseWeight: 100 }],
    presentation60Transversal40: [
      { name: "Evaluaciones parciales", kind: "continuous" as const, courseWeight: 60 },
      { name: "Evaluación transversal", kind: "final_exam" as const, courseWeight: 40 },
    ],
    laboratoryTheoryTransversal: [
      { name: "Laboratorio", kind: "laboratory" as const, courseWeight: 30 },
      { name: "Teoría", kind: "continuous" as const, courseWeight: 30 },
      { name: "Evaluación transversal", kind: "final_exam" as const, courseWeight: 40 },
    ],
    custom: [],
  }[preset]
  let nextGroups = [...data.assessmentGroups]
  const configured: AssessmentGroup[] = []
  for (const [index, specification] of specifications.entries()) {
    const available = current.filter((group) => !configured.some((item) => item.id === group.id))
    const existing = available.find((group) => group.name === specification.name)
      ?? available.find((group) => group.kind === specification.kind)
    const next = existing
      ? { ...existing, ...specification }
      : {
          ...specification,
          id: `${subjectId}-${specification.kind}-${createdAt}-${index}`,
          semesterId,
          subjectId,
          position: current.length + index + 1,
          createdAt,
        }
    nextGroups = existing
      ? nextGroups.map((group) => group.id === existing.id ? next : group)
      : [...nextGroups, next]
    configured.push(next)
  }
  const configuredIds = new Set(configured.map((group) => group.id))
  const obsolete = current.filter((group) => !configuredIds.has(group.id))
  const populatedIds = new Set(data.grades.map((grade) => grade.groupId).filter(Boolean))
  const obsoletePopulatedGroups = obsolete.filter((group) => populatedIds.has(group.id))
  if (obsoletePopulatedGroups.length > 0 && !options.preservePopulatedObsoleteGroups) {
    return {
      nextData: data,
      groups: current,
      obsoletePopulatedGroups,
      requiresResolution: true,
    }
  }

  const obsoleteIds = new Set(obsolete.map((group) => group.id))
  const populatedObsoleteIds = new Set(obsoletePopulatedGroups.map((group) => group.id))
  nextGroups = nextGroups
    .filter((group) => !obsoleteIds.has(group.id) || populatedObsoleteIds.has(group.id))
    .map((group) => populatedObsoleteIds.has(group.id)
      ? { ...group, name: inactiveAssessmentGroupName(group.name), courseWeight: 0 }
      : group)
  return {
    nextData: { ...data, assessmentGroups: nextGroups.sort((a, b) => a.position - b.position) },
    groups: configured,
    obsoletePopulatedGroups,
    requiresResolution: false,
  }
}

export type DeleteAssessmentGroupResult =
  | { ok: true; nextData: AppData; reassignedGrades: Grade[]; deletedGroup: AssessmentGroup }
  | { ok: false; reason: string; preview: Grade[] }

export function deleteAssessmentGroupTransition(data: AppData, groupId: string, options: { reassignToGroupId?: string } = {}): DeleteAssessmentGroupResult {
  const group = data.assessmentGroups.find((item) => item.id === groupId)
  if (!group) return { ok: false, reason: "El grupo de evaluación no existe.", preview: [] }

  const affected = data.grades.filter((grade) => grade.groupId === groupId)
  if (affected.length > 0) {
    if (!options.reassignToGroupId) {
      return { ok: false, reason: "Este grupo contiene evaluaciones. Elige un grupo destino antes de eliminarlo.", preview: affected }
    }
    if (options.reassignToGroupId === groupId) {
      return { ok: false, reason: "El grupo destino debe ser distinto al grupo eliminado.", preview: affected }
    }
    const destination = data.assessmentGroups.find((item) => item.id === options.reassignToGroupId)
    if (!destination || !sameScope(destination, group.semesterId, group.subjectId)) {
      return { ok: false, reason: "El grupo destino debe pertenecer a la misma materia y semestre.", preview: affected }
    }
  }

  const nextData = {
    ...data,
    assessmentGroups: data.assessmentGroups.filter((item) => item.id !== groupId),
    grades: data.grades.map((grade) => grade.groupId === groupId ? { ...grade, groupId: options.reassignToGroupId } : grade),
  }
  return { ok: true, nextData, reassignedGrades: nextData.grades.filter((grade) => affected.some((item) => item.id === grade.id)), deletedGroup: group }
}
