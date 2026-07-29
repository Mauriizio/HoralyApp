"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { getPersistentTutorialIdentity } from "@/lib/tutorial-identity"
import {
  TUTORIAL_REGISTRY,
  buildTutorialStorageKey,
  normalizeTutorialProgress,
  type TutorialId,
  type TutorialProgress,
} from "@/lib/tutorials"

type ProgressMap = Partial<Record<TutorialId, TutorialProgress>>

function migrateAuthenticatedProgress(userId: string, storage: Storage): ProgressMap {
  const merged: ProgressMap = {}
  const prefix = `horarily:tutorials:v1:${encodeURIComponent(userId)}:`
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (!key?.startsWith(prefix)) continue
    try {
      const candidate = JSON.parse(storage.getItem(key) ?? "{}") as ProgressMap
      for (const id of Object.keys(TUTORIAL_REGISTRY) as TutorialId[]) {
        const current = merged[id]
        const incoming = candidate[id]
        if (!incoming) continue
        const rank = { "not-started": 0, "in-progress": 1, skipped: 2, completed: 3 }
        if (!current || rank[incoming.status] > rank[current.status]) merged[id] = incoming
      }
    } catch {
      // Una clave legacy dañada no debe impedir cargar el resto.
    }
  }
  return merged
}

export function useTutorialProgress() {
  const { userId, authGeneration, transitioning } = useAuth()
  const [identity, setIdentity] = useState("")
  const storageKey = useMemo(() => identity ? buildTutorialStorageKey(identity) : "", [identity])
  const [progress, setProgress] = useState<ProgressMap>({})
  const [hydratedKey, setHydratedKey] = useState("")
  const generationRef = useRef(authGeneration)

  useEffect(() => {
    if (transitioning) return
    setIdentity(getPersistentTutorialIdentity(userId, window.localStorage))
  }, [transitioning, userId])

  useEffect(() => {
    generationRef.current = authGeneration
  }, [authGeneration])

  useEffect(() => {
    if (!storageKey || transitioning) return
    let parsed: ProgressMap = {}
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) parsed = JSON.parse(raw) as ProgressMap
      else if (userId) {
        parsed = migrateAuthenticatedProgress(userId, window.localStorage)
        if (Object.keys(parsed).length > 0) window.localStorage.setItem(storageKey, JSON.stringify(parsed))
      }
    } catch {
      parsed = {}
    }
    setProgress(parsed)
    setHydratedKey(storageKey)
  }, [storageKey, transitioning, userId])

  const write = useCallback((next: ProgressMap, expectedGeneration = generationRef.current) => {
    if (!storageKey || hydratedKey !== storageKey || transitioning || expectedGeneration !== generationRef.current) return
    setProgress(next)
    window.localStorage.setItem(storageKey, JSON.stringify(next))
  }, [hydratedKey, storageKey, transitioning])

  const get = useCallback((id: TutorialId) => normalizeTutorialProgress(TUTORIAL_REGISTRY[id], progress[id]), [progress])
  const update = useCallback((id: TutorialId, patch: Partial<TutorialProgress>) => {
    const expectedGeneration = generationRef.current
    const current = normalizeTutorialProgress(TUTORIAL_REGISTRY[id], progress[id])
    write({ ...progress, [id]: { ...current, ...patch, version: TUTORIAL_REGISTRY[id].version, updatedAt: new Date().toISOString() } }, expectedGeneration)
  }, [progress, write])
  const reset = useCallback((id: TutorialId) => update(id, { status: "not-started", currentStep: 0 }), [update])
  const pending = useMemo(
    () => (Object.keys(TUTORIAL_REGISTRY) as TutorialId[]).filter((id) => get(id).status === "in-progress"),
    [get],
  )

  return {
    ready: Boolean(storageKey) && hydratedKey === storageKey && !transitioning,
    identity,
    authGeneration,
    pending,
    get,
    update,
    reset,
  }
}
