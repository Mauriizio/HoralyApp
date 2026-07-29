"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  TUTORIAL_REGISTRY,
  buildTutorialStorageKey,
  normalizeTutorialProgress,
  type TutorialId,
  type TutorialProgress,
} from "@/lib/tutorials"

type ProgressMap = Partial<Record<TutorialId, TutorialProgress>>

export function useTutorialProgress() {
  const { userId, authGeneration, transitioning } = useAuth()
  const storageKey = useMemo(() => buildTutorialStorageKey(userId ?? "guest", authGeneration), [authGeneration, userId])
  const [progress, setProgress] = useState<ProgressMap>({})
  const [hydratedKey, setHydratedKey] = useState("")

  useEffect(() => {
    if (transitioning) return
    let parsed: ProgressMap = {}
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) parsed = JSON.parse(raw) as ProgressMap
    } catch {
      parsed = {}
    }
    setProgress(parsed)
    setHydratedKey(storageKey)
  }, [storageKey, transitioning])

  const write = useCallback((next: ProgressMap) => {
    if (hydratedKey !== storageKey || transitioning) return
    setProgress(next)
    window.localStorage.setItem(storageKey, JSON.stringify(next))
  }, [hydratedKey, storageKey, transitioning])

  const get = useCallback((id: TutorialId) => normalizeTutorialProgress(TUTORIAL_REGISTRY[id], progress[id]), [progress])
  const update = useCallback((id: TutorialId, patch: Partial<TutorialProgress>) => {
    const current = normalizeTutorialProgress(TUTORIAL_REGISTRY[id], progress[id])
    write({ ...progress, [id]: { ...current, ...patch, version: TUTORIAL_REGISTRY[id].version, updatedAt: new Date().toISOString() } })
  }, [progress, write])
  const reset = useCallback((id: TutorialId) => update(id, { status: "not-started", currentStep: 0 }), [update])

  return { ready: hydratedKey === storageKey && !transitioning, get, update, reset }
}
