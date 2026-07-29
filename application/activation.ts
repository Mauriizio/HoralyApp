import type { AppData } from "../lib/types.ts"

export interface ActivationRuntime {
  hydrated: boolean
  identityReady: boolean
  transitioning: boolean
}

export type ActivationResult =
  | { kind: "loading" }
  | { kind: "requiresOnboarding"; resumeStep: number }
  | { kind: "requiresFirstSubject"; resumeStep: 3 }
  | { kind: "ready" }

export function backfillLegacyActivationMarker(data: AppData, completedAt: string): AppData {
  if (data.settings.onboarding.activationCompletedAt) return data
  const activeSemester = data.semesters.find(
    (semester) => semester.id === data.activeSemesterId && semester.status === "active",
  )
  const hasRequiredLegacyData = Boolean(
    data.profile.displayName.trim()
      && activeSemester
      && data.subjects.some((subject) => subject.semesterId === activeSemester.id)
      && (data.settings.onboarding.completed || data.profile.onboardingCompletedAt),
  )
  if (!hasRequiredLegacyData) return data

  return {
    ...data,
    settings: {
      ...data.settings,
      onboarding: {
        ...data.settings.onboarding,
        activationCompletedAt: data.profile.onboardingCompletedAt ?? completedAt,
      },
    },
  }
}

export function evaluateActivation(data: AppData, runtime: ActivationRuntime): ActivationResult {
  if (!runtime.hydrated || !runtime.identityReady || runtime.transitioning) return { kind: "loading" }

  const displayName = data.profile.displayName.trim()
  const activeSemester = data.semesters.find(
    (semester) => semester.id === data.activeSemesterId && semester.status === "active",
  )
  const activeSubjects = activeSemester
    ? data.subjects.filter((subject) => subject.semesterId === activeSemester.id)
    : []
  const activationCompleted = Boolean(data.settings.onboarding.activationCompletedAt)

  if (activationCompleted) return { kind: "ready" }
  if (!displayName) return { kind: "requiresOnboarding", resumeStep: Math.min(data.settings.onboarding.currentStep, 1) }
  if (!activeSemester) return { kind: "requiresOnboarding", resumeStep: 2 }
  if (activeSubjects.length === 0) return { kind: "requiresFirstSubject", resumeStep: 3 }

  if (data.settings.onboarding.completed || data.profile.onboardingCompletedAt) return { kind: "ready" }
  return { kind: "requiresOnboarding", resumeStep: Math.max(1, data.settings.onboarding.currentStep) }
}
