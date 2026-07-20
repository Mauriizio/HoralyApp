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
  type Semester,
  type TimeModule,
  type UserProfile,
} from "@/lib/types"
import { loadDataResult, normalizeSubjectForStorage, saveData } from "@/lib/storage"
import { computeTriggerTime, fireNotification } from "@/lib/notifications"
import { validateModules } from "@/lib/time-modules"
import { useAuth } from "@/lib/auth-context"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { SupabaseAcademicRepository, selectAcademicRepository, type AcademicRepository, type SyncStatus } from "@/lib/repositories/academic-repository"
import { loadCloudCache, saveCloudCache, saveMigrationBackup, loadMigrationBackup } from "@/lib/local-cloud-storage"
import { transitionDeleteModule, transitionMoveBlock, transitionSetModules, transitionUpdateSubject, transitionUpsertBlock } from "@/lib/schedule-transitions"

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
  const [migrationSnapshot, setMigrationSnapshot] = useState<AppData | null>(null)
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
        if (repository instanceof SupabaseAcademicRepository) {
          const localBeforeCloud = loadDataResult()
          const backup = loadMigrationBackup(repository.userIdForCache) ?? (localBeforeCloud.ok ? saveMigrationBackup(repository.userIdForCache, localBeforeCloud.data) : null)
          setMigrationSnapshot(backup?.data ?? null)
          await repository.ensureProfile(user?.email)
        }
        const result = repository.kind === "local"
          ? loadDataResult()
          : { ok: true as const, data: await repository.loadData().catch(() => loadCloudCache(session!.user.id) ?? Promise.reject(new Error("No se pudieron cargar tus datos sincronizados."))), raw: null }
        if (cancelled) return
        setData(result.data)
        if (!result.ok) setStorageRecovery({ raw: result.raw, errors: result.errors })
        else setStorageRecovery(null)
        if (repository.kind === "supabase" && session?.user.id) saveCloudCache(session.user.id, result.data)
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
    if (!hydrated || storageRecovery) return
    if (authenticated && user?.id) saveCloudCache(user.id, data)
    else saveData(data)
  }, [authenticated, data, hydrated, storageRecovery, user?.id])

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

  const replaceAll = useCallback((next: AppData) => {
    setStorageRecovery(null)
    setData(next)
    void persistCloud((repository) => repository.replaceAll(next))
  }, [persistCloud])

  const clearStorageRecovery = useCallback(() => setStorageRecovery(null), [])

  // --- Subjects ---
  const addSubject = useCallback((subject: Omit<Subject, "id" | "createdAt">) => {
    const id = uid()
    const createdAt = Date.now()
    let createdSubject = normalizeSubjectForStorage({ ...subject, semesterId: subject.semesterId ?? data.activeSemesterId }, data.subjects, { id, createdAt })

    setData((d) => {
      const newSubject = normalizeSubjectForStorage({ ...subject, semesterId: subject.semesterId ?? d.activeSemesterId }, d.subjects, { id, createdAt })
      createdSubject = newSubject
      return { ...d, subjects: [...d.subjects, newSubject] }
    })

    void persistCloud((repository) => repository.saveSubject(createdSubject))
    return createdSubject
  }, [data.subjects, persistCloud])

  const updateSubject = useCallback((id: string, patch: Partial<Subject>) => {
    const transition = transitionUpdateSubject(data, id, patch)
    if (!transition.ok || !transition.changedEntity) return
    setData(transition.nextData)
    void persistCloud((repository) => repository.updateSubject(transition.changedEntity!))
  }, [data, persistCloud])

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
    const transition = transitionUpsertBlock(data, block, options)
    if (!transition.ok) return { ok: false as const, conflictIds: transition.conflictIds }
    setData(transition.nextData)
    void persistCloud(async (repository) => {
      await Promise.all(transition.deletedIds.map((id) => repository.deleteScheduleBlock(id)))
      await repository.saveScheduleBlock(block)
    })
    return { ok: true as const, conflictIds: transition.conflictIds }
  }, [data, persistCloud])

  const moveBlock = useCallback(
    (blockId: string, targetDay: DayKey, startModuleId: string, modules: TimeModule[]) => {
      const transition = transitionMoveBlock(data, blockId, targetDay, startModuleId, modules)
      if (!transition.ok || !transition.changedEntity) return
      setData(transition.nextData)
      void persistCloud((repository) => repository.saveScheduleBlock(transition.changedEntity!))
    },
    [data, persistCloud],
  )

  const deleteBlock = useCallback((id: string) => {
    setData((d) => ({ ...d, blocks: d.blocks.filter((b) => b.id !== id) }))
    void persistCloud((repository) => repository.deleteScheduleBlock(id))
  }, [persistCloud])

  // --- Modules ---
  const setModules = useCallback((modules: TimeModule[]) => {
    const transition = transitionSetModules(data, modules)
    setData(transition.nextData)
    void persistCloud((repository) => repository.replaceAll(transition.nextData))
  }, [data, persistCloud])

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
    const modules = data.modules.map((m) => (m.id === id ? { ...m, ...patch } : m)).sort((a, b) => a.start.localeCompare(b.start))
    setData((d) => ({ ...d, modules }))
    void persistCloud((repository) => repository.updateSettings(data.settings, modules))
  }, [data.modules, data.settings, persistCloud])

  const deleteModule = useCallback((id: string) => {
    const transition = transitionDeleteModule(data, id)
    setData(transition.nextData)
    void persistCloud((repository) => repository.replaceAll(transition.nextData))
  }, [data, persistCloud])

  // --- Study blocks ---
  const addStudyBlock = useCallback((sb: Omit<StudyBlock, "id">) => {
    const next: StudyBlock = { ...sb, semesterId: sb.semesterId ?? data.activeSemesterId, id: uid() }
    setData((d) => ({ ...d, studyBlocks: [...d.studyBlocks, next] }))
    void persistCloud((repository) => repository.saveStudyBlock(next))
    return next
  }, [data.activeSemesterId, persistCloud])

  const updateStudyBlock = useCallback((id: string, patch: Partial<StudyBlock>) => {
    const current = data.studyBlocks.find((sb) => sb.id === id)
    const next = current ? { ...current, ...patch } : undefined
    setData((d) => ({ ...d, studyBlocks: d.studyBlocks.map((sb) => (sb.id === id ? { ...sb, ...patch } : sb)) }))
    if (next) void persistCloud((repository) => repository.saveStudyBlock(next))
  }, [data.studyBlocks, persistCloud])

  const deleteStudyBlock = useCallback((id: string) => {
    setData((d) => ({ ...d, studyBlocks: d.studyBlocks.filter((sb) => sb.id !== id) }))
    void persistCloud((repository) => repository.deleteStudyBlock(id))
  }, [persistCloud])

  // --- Reminders ---
  const addReminder = useCallback(
    (reminder: Omit<Reminder, "id" | "createdAt" | "notifiedTriggerIndexes">) => {
      const next: Reminder = {
        ...reminder,
        id: uid(),
        semesterId: reminder.semesterId ?? data.activeSemesterId,
        createdAt: Date.now(),
        notifiedTriggerIndexes: [],
      }
      setData((d) => ({ ...d, reminders: [...d.reminders, next] }))
      void persistCloud((repository) => repository.saveReminder(next))
      return next
    },
    [data.activeSemesterId, persistCloud],
  )

  const updateReminder = useCallback((id: string, patch: Partial<Reminder>) => {
    const current = data.reminders.find((r) => r.id === id)
    const next = current ? { ...current, ...patch } : undefined
    setData((d) => ({ ...d, reminders: d.reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)) }))
    if (next) void persistCloud((repository) => repository.saveReminder(next))
  }, [data.reminders, persistCloud])

  const deleteReminder = useCallback((id: string) => {
    setData((d) => ({ ...d, reminders: d.reminders.filter((r) => r.id !== id) }))
    void persistCloud((repository) => repository.deleteReminder(id))
  }, [persistCloud])

  // --- Grades ---
  const addGrade = useCallback((grade: Omit<Grade, "id" | "createdAt">) => {
    const next: Grade = { ...grade, semesterId: grade.semesterId ?? data.activeSemesterId, id: uid(), createdAt: Date.now() }
    setData((d) => ({ ...d, grades: [...d.grades, next] }))
    void persistCloud((repository) => repository.saveGrade(next))
    return next
  }, [data.activeSemesterId, persistCloud])

  const updateGrade = useCallback((id: string, patch: Partial<Grade>) => {
    const current = data.grades.find((g) => g.id === id)
    const next = current ? { ...current, ...patch } : undefined
    setData((d) => ({ ...d, grades: d.grades.map((g) => (g.id === id ? { ...g, ...patch } : g)) }))
    if (next) void persistCloud((repository) => repository.saveGrade(next))
  }, [data.grades, persistCloud])

  const deleteGrade = useCallback((id: string) => {
    setData((d) => ({ ...d, grades: d.grades.filter((g) => g.id !== id) }))
    void persistCloud((repository) => repository.deleteGrade(id))
  }, [persistCloud])

  // --- Profile ---
  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    const nextProfile = { ...data.profile, ...patch }
    setData((d) => ({ ...d, profile: { ...d.profile, ...patch } }))
    void persistCloud((repository) => repository.updateProfile(nextProfile, user?.email))
  }, [data.profile, persistCloud, user?.email])

  const resetProfile = useCallback(() => {
    setData((d) => ({ ...d, profile: DEFAULT_PROFILE }))
    void persistCloud((repository) => repository.updateProfile(DEFAULT_PROFILE, user?.email))
  }, [persistCloud, user?.email])

  // --- Settings ---
  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    const nextSettings = { ...data.settings, ...patch }
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
    void persistCloud((repository) => repository.updateSettings(nextSettings, data.modules))
  }, [data.modules, data.settings, persistCloud])

  const resetSettings = useCallback(() => {
    setData((d) => ({ ...d, settings: DEFAULT_SETTINGS }))
    void persistCloud((repository) => repository.updateSettings(DEFAULT_SETTINGS, data.modules))
  }, [data.modules, persistCloud])


  // --- Semesters ---
  const createSemester = useCallback((semester: Omit<Semester, "id" | "createdAt">) => {
    const next: Semester = { ...semester, id: uid(), createdAt: Date.now() }
    const semesters = next.status === "active" ? data.semesters.map((item) => item.status === "active" ? { ...item, status: "planned" as const } : item) : data.semesters
    const nextData = { ...data, semesters: [...semesters, next], activeSemesterId: next.status === "active" ? next.id : data.activeSemesterId }
    setData(nextData)
    void persistCloud((repository) => repository.replaceAll(nextData))
    return next
  }, [data, persistCloud])

  const updateSemester = useCallback((id: string, patch: Partial<Semester>) => {
    const nextSemesters = data.semesters.map((semester) => semester.id === id ? { ...semester, ...patch } : semester)
    const normalized = patch.status === "active" ? nextSemesters.map((semester) => semester.id === id ? { ...semester, status: "active" as const } : semester.status === "active" ? { ...semester, status: "planned" as const } : semester) : nextSemesters
    const nextData = { ...data, semesters: normalized, activeSemesterId: patch.status === "active" ? id : data.activeSemesterId }
    setData(nextData)
    void persistCloud((repository) => repository.replaceAll(nextData))
  }, [data, persistCloud])

  const archiveSemester = useCallback((id: string) => updateSemester(id, { status: "archived" }), [updateSemester])
  const selectActiveSemester = useCallback((id: string) => updateSemester(id, { status: "active" }), [updateSemester])

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
    migrationSnapshot,
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
    createSemester,
    updateSemester,
    archiveSemester,
    selectActiveSemester,
    updateProfile,
    resetProfile,
    updateSettings,
    resetSettings,
  }
}

export type ScheduleStore = ReturnType<typeof useScheduleStore>
