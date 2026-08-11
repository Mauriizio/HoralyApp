import type { TutorialId, TutorialProgress, TutorialStatus } from "@/lib/tutorials"

export type TutorialProgressMap = Partial<Record<TutorialId, TutorialProgress>>

const STATUS_RANK: Record<TutorialStatus, number> = {
  "not-started": 0,
  "in-progress": 1,
  skipped: 2,
  completed: 3,
}

function preferredProgress(current?: TutorialProgress, incoming?: TutorialProgress) {
  if (!current) return incoming
  if (!incoming) return current
  const currentRank = STATUS_RANK[current.status]
  const incomingRank = STATUS_RANK[incoming.status]
  if (incomingRank !== currentRank) return incomingRank > currentRank ? incoming : current
  if (current.status === "in-progress" && incoming.currentStep !== current.currentStep) {
    return incoming.currentStep > current.currentStep ? incoming : current
  }
  return (incoming.updatedAt ?? "") > (current.updatedAt ?? "") ? incoming : current
}

export function mergeTutorialProgress(current: TutorialProgressMap, incoming: TutorialProgressMap): TutorialProgressMap {
  const result = { ...current }
  for (const id of Object.keys(incoming) as TutorialId[]) result[id] = preferredProgress(result[id], incoming[id])
  return result
}

export function resetTutorialProgress(current: TutorialProgressMap, id: TutorialId, version: number): TutorialProgressMap {
  return { ...current, [id]: { version, status: "not-started", currentStep: 0, updatedAt: new Date().toISOString() } }
}

export function shouldAutoStartTutorial(progress: TutorialProgressMap, id: TutorialId) {
  return !progress[id] || progress[id]?.status === "not-started"
}
