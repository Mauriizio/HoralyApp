"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  type AppData,
  type AppSettings,
  type DayKey,
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  EMPTY_APP_DATA,
  type Grade,
  type Reminder,
  type ScheduleBlock,
  type StudyBlock,
  type Subject,
  type TimeModule,
  type UserProfile,
} from "@/lib/types"
import { loadDataResult, normalizeSubjectForStorage, saveData } from "@/lib/storage"
import { computeTriggerTime, fireNotification } from "@/lib/notifications"
import { validateModules } from "@/lib/time-modules"
import { findScheduleBlockConflicts } from "@/lib/schedule-conflicts"
import { useAuth } from "@/lib/auth-context"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { SupabaseAcademicRepository, selectAcademicRepository, type AcademicRepository, type SyncStatus } from "@/lib/repositories/academic-repository"

export { validateModules }

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function useScheduleStore() {
  const [data, setData] = useState<AppData>(EMPTY_APP_DATA)
  const [hydrated, setHydrated] = useState(false)
  const [storageRecovery, setStorageRecovery] = useState<{ raw: string; errors: string[] } | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading")
  const [syncError, setSyncError] = useState<string | null>(null)
  const { session, loading: authLoading, authenticated, user } = useAuth()
  const repositoryRef = useRef<AcademicRepository>(selectAcademicRepository(null))
  const loadedForRef = useRef<string>("initial")

  const setSyncFailure = useCallback((error: unknown) => {
    setSyncStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error")
    setSyncError(error instanceof Error ? error.message : "No se pudo sincronizar con Supabase.")
  }, [])

  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      if (authLoading) {
        setSyncStatus("loading")
        return
      }
      const supabase = createSupabaseBrowserClient()
      const repository = selectAcademicRepository(session, supabase)
      repositoryRef.current = repository
      const key = repository.kind === "supabase" ? `cloud:${session?.user.id}` : "local"
      if (loadedForRef.current === key && hydrated) return
      setSyncStatus(repository.kind === "supabase" ? "loading" : "local")
      try {
        if (repository instanceof SupabaseAcademicRepository) await repository.ensureProfile(user?.email)
        const result = repository.kind === "local" ? loadDataResult() : { ok: true as const, data: await repository.loadData(), raw: null }
        if (cancelled) return
        setData(result.data)
        if (!result.ok) setStorageRecovery({ raw: result.raw, errors: result.errors })
        else setStorageRecovery(null)
        saveData(result.data)
        loadedForRef.current = key
        setHydrated(true)
        setSyncStatus(repository.kind === "supabase" ? "synced" : "local")
        setSyncError(null)
      } catch (error) {
        if (cancelled) return
        const local = loadDataResult()
        if (local.ok) setData(local.data)
        setHydrated(true)
        setSyncFailure(error)
      }
    }
    void hydrate()
    return () => { cancelled = true }
  }, [authLoading, hydrated, session, setSyncFailure, user?.email])

  useEffect(() => {
    if (hydrated && !storageRecovery) saveData(data)
  }, [data, hydrated, storageRecovery])

  const persistCloud = useCallback(async (operation: (repository: AcademicRepository) => Promise<void>) => {
    const repository = repositoryRef.current
    if (repository.kind !== "supabase" || !authenticated) return
    setSyncStatus("syncing")
    setSyncError(null)
    try {
      await operation(repository)
      setSyncStatus("synced")
    } catch (error) {
      setSyncFailure(error)
    }
  }, [authenticated, setSyncFailure])

  const retrySync = useCallback(() => {
    void persistCloud((repository) => repository.replaceAll(data))
  }, [data, persistCloud])

  useEffect(() => {
    if (!hydrated || storageRecovery || !authenticated) return
    const handle = window.setTimeout(() => void persistCloud((repository) => repository.replaceAll(data)), 400)
    return () => window.clearTimeout(handle)
  }, [authenticated, data, hydrated, persistCloud, storageRecovery])

  const replaceAll = useCallback((next: AppData) => {
    setStorageRecovery(null)
    setData(next)
  }, [])

  const clearStorageRecovery = useCallback(() => setStorageRecovery(null), [])

  // --- Subjects ---
  const addSubject = useCallback((subject: Omit<Subject, "id" | "createdAt">) => {
    const id = uid()
    const createdAt = Date.now()
    let createdSubject = normalizeSubjectForStorage(subject, data.subjects, { id, createdAt })

    setData((d) => {
      const newSubject = normalizeSubjectForStorage(subject, d.subjects, { id, createdAt })
      createdSubject = newSubject
      return { ...d, subjects: [...d.subjects, newSubject] }
    })

    void persistCloud((repository) => repository.saveSubject(createdSubject))
    return createdSubject
  }, [data.subjects, persistCloud])

  const updateSubject = useCallback((id: string, patch: Partial<Subject>) => {
    let nextSubject: Subject | undefined
    setData((d) => ({
      ...d,
      subjects: d.subjects.map((subject) => {
        if (subject.id !== id) return subject
        const next = { ...subject, ...patch }
        const normalized = normalizeSubjectForStorage(next, d.subjects, {
          id: subject.id,
          createdAt: subject.createdAt,
          excludeSubjectId: subject.id,
        })
        nextSubject = normalized
        return normalized
      }),
    }))
    const savedSubject = nextSubject
    if (savedSubject) void persistCloud((repository) => repository.updateSubject(savedSubject))
  }, [persistCloud])

  const deleteSubject = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      subjects: d.subjects.filter((s) => s.id !== id),
      blocks: d.blocks.filter((b) => b.subjectId !== id),
      reminders: d.reminders.filter((r) => r.subjectId !== id),
      grades: d.grades.filter((g) => g.subjectId !== id),
      studyBlocks: d.studyBlocks.map((sb) =>
        sb.subjectId === id ? { ...sb, subjectId: undefined } : sb,
      ),
    }))
    void persistCloud((repository) => repository.deleteSubject(id))
  }, [persistCloud])

  // --- Schedule blocks ---
  const upsertBlock = useCallback((block: ScheduleBlock, options: { replaceConflicts?: boolean } = {}) => {
    let conflictIds: string[] = []
    setData((d) => {
      const conflicts = findScheduleBlockConflicts(block, d.blocks)
      conflictIds = conflicts.map((conflict) => conflict.id)
      if (conflicts.length > 0 && !options.replaceConflicts) return d
      const nextBlocks = d.blocks.filter((b) => {
        if (b.id === block.id) return false
        if (!options.replaceConflicts) return true
        return !conflictIds.includes(b.id)
      })
      return { ...d, blocks: [...nextBlocks, block] }
    })
    const result = conflictIds.length > 0 && !options.replaceConflicts
      ? { ok: false as const, conflictIds }
      : { ok: true as const, conflictIds }
    if (result.ok) void persistCloud((repository) => repository.saveScheduleBlock(block))
    return result
  }, [persistCloud])

  const moveBlock = useCallback(
    (blockId: string, targetDay: DayKey, startModuleId: string, modules: TimeModule[]) => {
      setData((d) => {
        const existing = d.blocks.find((b) => b.id === blockId)
        if (!existing) return d
        const span = existing.moduleIds.length
        const startIdx = modules.findIndex((m) => m.id === startModuleId)
        if (startIdx < 0) return d
        const endIdx = Math.min(modules.length - 1, startIdx + span - 1)
        const newModuleIds = modules.slice(startIdx, endIdx + 1).map((m) => m.id)
        const moved: ScheduleBlock = { ...existing, day: targetDay, moduleIds: newModuleIds }
        const conflicts = findScheduleBlockConflicts(moved, d.blocks)
        if (conflicts.length > 0) return d
        const others = d.blocks.filter((b) => b.id !== blockId)
        return { ...d, blocks: [...others, moved] }
      })
    },
    [],
  )

  const deleteBlock = useCallback((id: string) => {
    setData((d) => ({ ...d, blocks: d.blocks.filter((b) => b.id !== id) }))
    void persistCloud((repository) => repository.deleteScheduleBlock(id))
  }, [persistCloud])

  // --- Modules ---
  const setModules = useCallback((modules: TimeModule[]) => {
    setData((d) => {
      // Remove blocks that reference removed modules.
      const validIds = new Set(modules.map((m) => m.id))
      return {
        ...d,
        modules,
        blocks: d.blocks
          .map((b) => ({ ...b, moduleIds: b.moduleIds.filter((id) => validIds.has(id)) }))
          .filter((b) => b.moduleIds.length > 0),
      }
    })
    void persistCloud((repository) => repository.updateSettings(data.settings, modules))
  }, [data.settings, persistCloud])

  const addModule = useCallback((module: Omit<TimeModule, "id">) => {
    const next: TimeModule = { ...module, id: uid() }
    setData((d) => ({
      ...d,
      modules: [...d.modules, next].sort((a, b) => a.start.localeCompare(b.start)),
    }))
    void persistCloud((repository) => repository.updateSettings(data.settings, [...data.modules, next].sort((a, b) => a.start.localeCompare(b.start))))
    return next
  }, [data.modules, data.settings, persistCloud])

  const updateModule = useCallback((id: string, patch: Partial<TimeModule>) => {
    setData((d) => ({
      ...d,
      modules: d.modules
        .map((m) => (m.id === id ? { ...m, ...patch } : m))
        .sort((a, b) => a.start.localeCompare(b.start)),
    }))
  }, [persistCloud])

  const deleteModule = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      modules: d.modules.filter((m) => m.id !== id),
      blocks: d.blocks
        .map((b) => ({ ...b, moduleIds: b.moduleIds.filter((mid) => mid !== id) }))
        .filter((b) => b.moduleIds.length > 0),
    }))
  }, [persistCloud])

  // --- Study blocks ---
  const addStudyBlock = useCallback((sb: Omit<StudyBlock, "id">) => {
    const next: StudyBlock = { ...sb, id: uid() }
    setData((d) => ({ ...d, studyBlocks: [...d.studyBlocks, next] }))
    return next
  }, [])

  const updateStudyBlock = useCallback((id: string, patch: Partial<StudyBlock>) => {
    setData((d) => ({
      ...d,
      studyBlocks: d.studyBlocks.map((sb) => (sb.id === id ? { ...sb, ...patch } : sb)),
    }))
  }, [persistCloud])

  const deleteStudyBlock = useCallback((id: string) => {
    setData((d) => ({ ...d, studyBlocks: d.studyBlocks.filter((sb) => sb.id !== id) }))
  }, [])

  // --- Reminders ---
  const addReminder = useCallback(
    (reminder: Omit<Reminder, "id" | "createdAt" | "notifiedTriggerIndexes">) => {
      const next: Reminder = {
        ...reminder,
        id: uid(),
        createdAt: Date.now(),
        notifiedTriggerIndexes: [],
      }
      setData((d) => ({ ...d, reminders: [...d.reminders, next] }))
      return next
    },
    [],
  )

  const updateReminder = useCallback((id: string, patch: Partial<Reminder>) => {
    setData((d) => ({
      ...d,
      reminders: d.reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }))
  }, [persistCloud])

  const deleteReminder = useCallback((id: string) => {
    setData((d) => ({ ...d, reminders: d.reminders.filter((r) => r.id !== id) }))
  }, [])

  // --- Grades ---
  const addGrade = useCallback((grade: Omit<Grade, "id" | "createdAt">) => {
    const next: Grade = { ...grade, id: uid(), createdAt: Date.now() }
    setData((d) => ({ ...d, grades: [...d.grades, next] }))
    return next
  }, [])

  const updateGrade = useCallback((id: string, patch: Partial<Grade>) => {
    setData((d) => ({
      ...d,
      grades: d.grades.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    }))
  }, [persistCloud])

  const deleteGrade = useCallback((id: string) => {
    setData((d) => ({ ...d, grades: d.grades.filter((g) => g.id !== id) }))
  }, [])

  // --- Profile ---
  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    setData((d) => ({ ...d, profile: { ...d.profile, ...patch } }))
  }, [])

  const resetProfile = useCallback(() => {
    setData((d) => ({ ...d, profile: DEFAULT_PROFILE }))
  }, [])

  // --- Settings ---
  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
  }, [])

  const resetSettings = useCallback(() => {
    setData((d) => ({ ...d, settings: DEFAULT_SETTINGS }))
  }, [])

  // --- Notification loop ---
  const lastCheckRef = useRef<number>(0)
  useEffect(() => {
    if (!hydrated) return
    const check = () => {
      const now = Date.now()
      if (now - lastCheckRef.current < 20_000) return
      lastCheckRef.current = now
      for (const r of data.reminders) {
        r.triggers.forEach((trigger, idx) => {
          if (r.notifiedTriggerIndexes.includes(idx)) return
          const t = computeTriggerTime(r, trigger)
          if (!t) return
          if (t.getTime() <= now && now - t.getTime() < 24 * 60 * 60 * 1000) {
            fireNotification(
              r.priority === "alta" ? `¡Importante! ${r.title}` : r.title,
              r.description ?? "Tienes un recordatorio pendiente.",
              r.id,
            )
            updateReminder(r.id, { notifiedTriggerIndexes: [...r.notifiedTriggerIndexes, idx] })
          }
        })
      }
    }
    check()
    const interval = window.setInterval(check, 30_000)
    return () => window.clearInterval(interval)
  }, [data.reminders, hydrated, updateReminder])

  // Memoized lookups
  const subjectsById = useMemo(() => {
    const map = new Map<string, Subject>()
    for (const s of data.subjects) map.set(s.id, s)
    return map
  }, [data.subjects])

  return {
    data,
    hydrated,
    syncStatus,
    syncMessage: syncStatus === "local" ? "Guardado local" : syncStatus === "loading" ? "Cargando" : syncStatus === "syncing" ? "Sincronizando" : syncStatus === "synced" ? "Sincronizado" : syncStatus === "offline" ? "Sin conexión" : "Error de sincronización",
    syncError,
    retrySync,
    storageRecovery,
    clearStorageRecovery,
    subjectsById,
    replaceAll,
    addSubject,
    updateSubject,
    deleteSubject,
    upsertBlock,
    moveBlock,
    deleteBlock,
    setModules,
    addModule,
    updateModule,
    deleteModule,
    addStudyBlock,
    updateStudyBlock,
    deleteStudyBlock,
    addReminder,
    updateReminder,
    deleteReminder,
    addGrade,
    updateGrade,
    deleteGrade,
    updateProfile,
    resetProfile,
    updateSettings,
    resetSettings,
  }
}

export type ScheduleStore = ReturnType<typeof useScheduleStore>
