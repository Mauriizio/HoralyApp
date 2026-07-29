import type { AppData } from "../lib/types.ts"

export interface SubjectCreationRuntime {
  identityReady: boolean
  transitioning: boolean
}

export type SubjectCreationGate =
  | { kind: "allowed"; semesterId: string; normalizedName: string }
  | { kind: "requiresOnboarding"; reason: string }
  | { kind: "missingActiveSemester"; reason: string }
  | { kind: "identityNotReady"; reason: string }
  | { kind: "duplicateSubject"; reason: string; subjectId: string }

function normalizeSubjectName(value: string): string {
  return value.trim().replace(/\s+/g, " ")
}

function comparableName(value: string): string {
  return normalizeSubjectName(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es")
}

export function evaluateSubjectCreation(
  data: AppData,
  runtime: SubjectCreationRuntime,
  requestedName: string,
): SubjectCreationGate {
  if (!runtime.identityReady || runtime.transitioning) {
    return { kind: "identityNotReady", reason: "Espera mientras confirmamos tu espacio académico." }
  }

  const normalizedName = normalizeSubjectName(requestedName)
  if (!data.profile.displayName.trim()) {
    return { kind: "requiresOnboarding", reason: "Primero necesito saber cómo quieres que te llame." }
  }

  const activeSemester = data.semesters.find(
    (semester) => semester.id === data.activeSemesterId && semester.status === "active",
  )
  if (!activeSemester) {
    return { kind: "missingActiveSemester", reason: "Primero configura un semestre activo." }
  }

  const duplicate = data.subjects.find(
    (subject) => subject.semesterId === activeSemester.id && comparableName(subject.name) === comparableName(normalizedName),
  )
  if (duplicate) {
    return { kind: "duplicateSubject", reason: `${duplicate.name} ya existe en este semestre.`, subjectId: duplicate.id }
  }

  return { kind: "allowed", semesterId: activeSemester.id, normalizedName }
}

