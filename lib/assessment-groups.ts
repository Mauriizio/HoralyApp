import type { AppData, AssessmentGroup, Grade } from "./types.ts"

export const DEFAULT_ASSESSMENT_GROUP_NAME = "Evaluación continua"

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
