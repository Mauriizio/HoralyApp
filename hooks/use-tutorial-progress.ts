"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { getPersistentTutorialIdentity } from "@/lib/tutorial-identity"
import { mergeTutorialProgress, resetTutorialProgress, type TutorialProgressMap } from "@/lib/tutorial-progress"
import {
  TUTORIAL_REGISTRY,
  buildTutorialStorageKey,
  normalizeTutorialProgress,
  type TutorialId,
  type TutorialProgress,
} from "@/lib/tutorials"

function readProgress(storage: Storage, key: string): TutorialProgressMap {
  try { return JSON.parse(storage.getItem(key) ?? "{}") as TutorialProgressMap } catch { return {} }
}

function migrateAuthenticatedProgress(userId: string, storage: Storage): TutorialProgressMap {
  let merged: TutorialProgressMap = readProgress(storage, buildTutorialStorageKey(`user:${userId}`))
  const prefix = `horarily:tutorials:v1:${encodeURIComponent(userId)}:`
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key?.startsWith(prefix)) merged = mergeTutorialProgress(merged, readProgress(storage, key))
  }
  return merged
}

export function useTutorialProgress({
  cloudProgress,
  persistCloudProgress,
}: {
  cloudProgress?: TutorialProgressMap
  persistCloudProgress: (progress: TutorialProgressMap, context: { expectedUserId: string; expectedAuthGeneration: number }) => void | Promise<void>
}) {
  const { userId, authenticated, authGeneration, transitioning } = useAuth()
  const [identity, setIdentity] = useState("")
  const storageKey = useMemo(() => identity ? buildTutorialStorageKey(identity) : "", [identity])
  const [progress, setProgress] = useState<TutorialProgressMap>({})
  const progressRef = useRef<TutorialProgressMap>({})
  const [hydratedKey, setHydratedKey] = useState("")
  const generationRef = useRef(authGeneration)
  const persistQueueRef = useRef(Promise.resolve())
  const persistCloudProgressRef = useRef(persistCloudProgress)

  useEffect(() => { if (!transitioning) setIdentity(getPersistentTutorialIdentity(userId, window.localStorage)) }, [transitioning, userId])
  useEffect(() => { generationRef.current = authGeneration }, [authGeneration])
  useEffect(() => { persistCloudProgressRef.current = persistCloudProgress }, [persistCloudProgress])

  const enqueueCloudWrite = useCallback((next: TutorialProgressMap, expectedUserId: string, expectedAuthGeneration: number) => {
    persistQueueRef.current = persistQueueRef.current.catch(() => undefined).then(async () => {
      await persistCloudProgressRef.current(next, { expectedUserId, expectedAuthGeneration })
    })
  }, [])

  useEffect(() => {
    if (!storageKey || transitioning) return
    const local = userId ? migrateAuthenticatedProgress(userId, window.localStorage) : readProgress(window.localStorage, storageKey)
    const merged = authenticated ? mergeTutorialProgress(cloudProgress ?? {}, local) : local
    progressRef.current = merged
    setProgress(merged)
    setHydratedKey(storageKey)
    if (authenticated && userId && JSON.stringify(merged) !== JSON.stringify(cloudProgress ?? {})) enqueueCloudWrite(merged, userId, authGeneration)
  }, [authenticated, authGeneration, cloudProgress, enqueueCloudWrite, storageKey, transitioning, userId])

  const commit = useCallback((next: TutorialProgressMap, expectedGeneration: number) => {
    if (!storageKey || hydratedKey !== storageKey || transitioning || expectedGeneration !== generationRef.current) return
    progressRef.current = next
    setProgress(next)
    if (authenticated && userId) enqueueCloudWrite(next, userId, expectedGeneration)
    else window.localStorage.setItem(storageKey, JSON.stringify(next))
  }, [authenticated, enqueueCloudWrite, hydratedKey, storageKey, transitioning, userId])

  const get = useCallback((id: TutorialId) => normalizeTutorialProgress(TUTORIAL_REGISTRY[id], progress[id]), [progress])
  const update = useCallback((id: TutorialId, patch: Partial<TutorialProgress>) => {
    const current = normalizeTutorialProgress(TUTORIAL_REGISTRY[id], progressRef.current[id])
    const incoming = { ...current, ...patch, version: TUTORIAL_REGISTRY[id].version, updatedAt: new Date().toISOString() }
    commit(mergeTutorialProgress(progressRef.current, { [id]: incoming }), generationRef.current)
  }, [commit])
  const reset = useCallback((id: TutorialId) => {
    commit(resetTutorialProgress(progressRef.current, id, TUTORIAL_REGISTRY[id].version), generationRef.current)
  }, [commit])
  const pending = useMemo(() => (Object.keys(TUTORIAL_REGISTRY) as TutorialId[]).filter((id) => get(id).status === "in-progress"), [get])

  return { ready: Boolean(storageKey) && hydratedKey === storageKey && !transitioning, identity, authGeneration, pending, get, update, reset }
}
