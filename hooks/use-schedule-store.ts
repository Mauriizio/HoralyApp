"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  type AppData,
  type AppSettings,
  type AssessmentGroup,
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
import { filterDataByActiveSemester } from "@/application/semesters"
import { addGradeTransition, applyGradingPresetTransition, deleteAssessmentGroupTransition, ensureDefaultAssessmentGroup, type GradingPresetId } from "@/lib/assessment-groups"
import { assertSameGeneration, assertSameIdentity, logIdentity, type OperationIdentityContext, SessionIdentityMismatchError } from "@/lib/session-identity"

export { validateModules }

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function requireActiveSemesterId(activeSemesterId: string | undefined, entity: string): string {
  if (!activeSemesterId) throw new Error(`Crea o selecciona un semestre activo antes de agregar ${entity}.`)
  return activeSemesterId
}

export function useScheduleStore() {
  const [data, setData] = useState<AppData>(EMPTY_APP_DATA)
  const dataRef = useRef<AppData>(data)
  dataRef.current = data
  const [hydrated, setHydrated] = useState(false)
  const [storageRecovery, setStorageRecovery] = useState<{ raw: string; errors: string[] } | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading")
  const [syncError, setSyncError] = useState<string | null>(null)
  const [migrationSnapshot, setMigrationSnapshot] = useState<AppData | null>(null)
  const { session, loading: authLoading, authenticated, user, userId, authGeneration, transitioning } = useAuth()
  const repositoryRef = useRef<AcademicRepository>(selectAcademicRepository(null))
  const loadedForRef = useRef<string>("initial")
  const [dataOwnerUserId, setDataOwnerUserId] = useState<string | null>(null)
  const [repositoryOwnerUserId, setRepositoryOwnerUserId] = useState<string | null>(null)
  const [identityReady, setIdentityReady] = useState(false)
  const identityReadyRef = useRef(false)
  const dataOwnerUserIdRef = useRef<string | null>(null)
  const authGenerationRef = useRef(authGeneration)

  useEffect(() => { identityReadyRef.current = identityReady }, [identityReady])
  useEffect(() => { dataOwnerUserIdRef.current = dataOwnerUserId }, [dataOwnerUserId])
  useEffect(() => { authGenerationRef.current = authGeneration }, [authGeneration])

  const setSyncFailure = useCallback((error: unknown) => {
    setSyncStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error")
    setSyncError(error instanceof Error ? error.message : "No se pudo sincronizar con Supabase.")
  }, [])

  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      if (authLoading || transitioning) {
        setIdentityReady(false)
        setHydrated(false)
        setData(EMPTY_APP_DATA)
        setDataOwnerUserId(null)
        setRepositoryOwnerUserId(null)
        setSyncStatus("loading")
        return
      }
      const expectedUserId = authenticated ? userId : null
      const expectedGeneration = authGeneration
      const supabase = createSupabaseBrowserClient()
      const repository = selectAcademicRepository(session, supabase)
      repositoryRef.current = repository
      const key = repository.kind === "supabase" ? `cloud:${expectedUserId}` : "guest"
      if (loadedForRef.current === key && hydrated && identityReady) return
      setIdentityReady(false)
      setHydrated(false)
      setData(EMPTY_APP_DATA)
      setDataOwnerUserId(null)
      setRepositoryOwnerUserId(repository.kind === "supabase" ? expectedUserId : null)
      setSyncStatus(repository.kind === "supabase" ? "loading" : "local")
      try {
        if (repository instanceof SupabaseAcademicRepository) {
          if (!expectedUserId) throw new SessionIdentityMismatchError()
          repository.assertRepositoryOwner(expectedUserId)
          const localBeforeCloud = loadDataResult()
          const backup = loadMigrationBackup(repository.userIdForCache) ?? (localBeforeCloud.ok ? saveMigrationBackup(repository.userIdForCache, localBeforeCloud.data) : null)
          setMigrationSnapshot(backup?.data ?? null)
          await repository.ensureProfile(user?.email)
          if (cancelled || authGenerationRef.current !== expectedGeneration || userId !== expectedUserId) return
        }
        const result = repository.kind === "local"
          ? loadDataResult()
          : { ok: true as const, data: await repository.loadData().catch(() => loadCloudCache(expectedUserId!) ?? Promise.reject(new Error("No se pudieron cargar tus datos sincronizados."))), raw: null }
        if (cancelled || authGenerationRef.current !== expectedGeneration || (authenticated && userId !== expectedUserId)) {
          logIdentity({ authUserId: userId, repositoryOwnerUserId: repository.kind === "supabase" ? repository.userIdForCache : null, authGeneration: expectedGeneration, operation: "store.hydrate", mismatch: "stale_load_discarded" })
          return
        }
        setData(result.data)
        if (!result.ok) setStorageRecovery({ raw: result.raw, errors: result.errors })
        else setStorageRecovery(null)
        if (repository.kind === "supabase" && expectedUserId) saveCloudCache(expectedUserId, result.data)
        loadedForRef.current = key
        setDataOwnerUserId(repository.kind === "supabase" ? expectedUserId : null)
        setRepositoryOwnerUserId(repository.kind === "supabase" ? expectedUserId : null)
        setIdentityReady(true)
        setHydrated(true)
        setSyncStatus(repository.kind === "supabase" ? "synced" : "local")
        setSyncError(null)
      } catch (error) {
        if (cancelled || authGenerationRef.current !== expectedGeneration) return
        if (!authenticated) {
          const local = loadDataResult()
          if (local.ok) setData(local.data)
          setDataOwnerUserId(null)
          setRepositoryOwnerUserId(null)
          setIdentityReady(true)
          setHydrated(true)
        } else {
          setData(EMPTY_APP_DATA)
          setDataOwnerUserId(null)
          setRepositoryOwnerUserId(null)
          setIdentityReady(false)
          setHydrated(false)
        }
        setSyncFailure(error)
      }
    }
    void hydrate()
    return () => { cancelled = true }
  }, [authGeneration, authLoading, authenticated, hydrated, identityReady, session, setSyncFailure, transitioning, user?.email, userId])

  useEffect(() => {
    if (!hydrated || storageRecovery || !identityReady) return
    if (authenticated && dataOwnerUserId) saveCloudCache(dataOwnerUserId, data)
    else saveData(data)
  }, [authenticated, data, dataOwnerUserId, hydrated, identityReady, storageRecovery])

  const assertCloudIdentity = useCallback((expectedUserId: string, expectedAuthGeneration = authGeneration, operation = "persistCloud") => {
    const repository = repositoryRef.current
    if (!authenticated || transitioning || !identityReadyRef.current || repository.kind !== "supabase") throw new SessionIdentityMismatchError()
    assertSameIdentity(userId, expectedUserId, "La sesión cambió durante la operación. Vuelve a intentarlo.")
    assertSameIdentity(dataOwnerUserIdRef.current, expectedUserId, "La sesión cambió durante la operación. Vuelve a intentarlo.")
    repository.assertRepositoryOwner(expectedUserId)
    assertSameGeneration(authGenerationRef.current, expectedAuthGeneration)
    logIdentity({ authUserId: userId, repositoryOwnerUserId: repository.userIdForCache, dataOwnerUserId: dataOwnerUserIdRef.current, authGeneration: expectedAuthGeneration, operation })
    return repository
  }, [authGeneration, authenticated, transitioning, userId])

  const persistCloud = useCallback(async (expectedUserId: string | null, operation: (repository: AcademicRepository) => Promise<void>, options: { throwOnError?: boolean; expectedAuthGeneration?: number; operationName?: string } = {}) => {
    if (!authenticated) return
    if (!expectedUserId) throw new SessionIdentityMismatchError()
    const expectedGeneration = options.expectedAuthGeneration ?? authGenerationRef.current
    setSyncStatus("syncing")
    setSyncError(null)
    try {
      const repository = assertCloudIdentity(expectedUserId, expectedGeneration, options.operationName)
      await operation(repository)
      assertCloudIdentity(expectedUserId, expectedGeneration, options.operationName)
      setSyncStatus("synced")
    } catch (error) {
      if (!(error instanceof SessionIdentityMismatchError)) setSyncFailure(error)
      if (options.throwOnError || error instanceof SessionIdentityMismatchError) throw error
    }
  }, [assertCloudIdentity, authenticated, setSyncFailure])

  const retrySync = useCallback(() => {
    void persistCloud(dataOwnerUserId, (repository) => repository.replaceAll(data))
  }, [data, dataOwnerUserId, persistCloud])

  const replaceAll = useCallback((next: AppData) => {
    setStorageRecovery(null)
    setData(next)
    void persistCloud(dataOwnerUserId, (repository) => repository.replaceAll(next))
  }, [dataOwnerUserId, persistCloud])

  const clearStorageRecovery = useCallback(() => setStorageRecovery(null), [])

  // --- Subjects ---
  const addSubject = useCallback((subject: Omit<Subject, "id" | "createdAt">) => {
    const id = uid()
    const createdAt = Date.now()
    const semesterId = subject.semesterId ?? requireActiveSemesterId(data.activeSemesterId, "materias")
    let createdSubject = normalizeSubjectForStorage({ ...subject, semesterId }, data.subjects, { id, createdAt })

    const withSubject = { ...data, subjects: [...data.subjects, createdSubject] }
    const ensured = ensureDefaultAssessmentGroup(withSubject, createdSubject.semesterId!, createdSubject.id, createdAt)
    const createdGroup = ensured.created ? ensured.group : null
    setData(ensured.nextData)

    void persistCloud(dataOwnerUserId, async (repository) => {
      await repository.saveSubject(createdSubject)
      if (createdGroup) await repository.saveAssessmentGroup(createdGroup)
    })
    return createdSubject
  }, [data.activeSemesterId, data.subjects, dataOwnerUserId, persistCloud])

  const updateSubject = useCallback((id: string, patch: Partial<Subject>) => {
    const transition = transitionUpdateSubject(data, id, patch)
    if (!transition.ok || !transition.changedEntity) return
    setData(transition.nextData)
    void persistCloud(dataOwnerUserId, (repository) => repository.updateSubject(transition.changedEntity!))
  }, [data, dataOwnerUserId, persistCloud])

  const deleteSubject = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      subjects: d.subjects.filter((s) => s.id !== id),
      blocks: d.blocks.filter((b) => b.subjectId !== id),
      reminders: d.reminders.filter((r) => r.subjectId !== id),
      grades: d.grades.filter((g) => g.subjectId !== id),
      assessmentGroups: d.assessmentGroups.filter((g) => g.subjectId !== id),
      studyBlocks: d.studyBlocks.map((sb) =>
        sb.subjectId === id ? { ...sb, subjectId: undefined } : sb,
      ),
    }))
    void persistCloud(dataOwnerUserId, (repository) => repository.deleteSubject(id))
  }, [dataOwnerUserId, persistCloud])

  // --- Schedule blocks ---
  const upsertBlock = useCallback((block: ScheduleBlock, options: { replaceConflicts?: boolean } = {}) => {
    const semesterId = block.semesterId ?? requireActiveSemesterId(data.activeSemesterId, "bloques horarios")
    const blockWithSemester = { ...block, semesterId }
    const transition = transitionUpsertBlock(data, blockWithSemester, options)
    if (!transition.ok) return { ok: false as const, conflictIds: transition.conflictIds }
    setData(transition.nextData)
    void persistCloud(dataOwnerUserId, async (repository) => {
      await Promise.all(transition.deletedIds.map((id) => repository.deleteScheduleBlock(id)))
      await repository.saveScheduleBlock(blockWithSemester)
    })
    return { ok: true as const, conflictIds: transition.conflictIds }
  }, [data, dataOwnerUserId, persistCloud])

  const moveBlock = useCallback(
    (blockId: string, targetDay: DayKey, startModuleId: string, modules: TimeModule[]) => {
      const transition = transitionMoveBlock(data, blockId, targetDay, startModuleId, modules)
      if (!transition.ok || !transition.changedEntity) return
      setData(transition.nextData)
      void persistCloud(dataOwnerUserId, (repository) => repository.saveScheduleBlock(transition.changedEntity!))
    },
    [data, persistCloud],
  )

  const deleteBlock = useCallback((id: string) => {
    setData((d) => ({ ...d, blocks: d.blocks.filter((b) => b.id !== id) }))
    void persistCloud(dataOwnerUserId, (repository) => repository.deleteScheduleBlock(id))
  }, [dataOwnerUserId, persistCloud])

  // --- Modules ---
  const setModules = useCallback((modules: TimeModule[]) => {
    const transition = transitionSetModules(data, modules)
    setData(transition.nextData)
    void persistCloud(dataOwnerUserId, (repository) => repository.replaceAll(transition.nextData))
  }, [data, dataOwnerUserId, persistCloud])

  const addModule = useCallback((module: Omit<TimeModule, "id">) => {
    const next: TimeModule = { ...module, id: uid() }
    setData((d) => ({
      ...d,
      modules: [...d.modules, next].sort((a, b) => a.start.localeCompare(b.start)),
    }))
    void persistCloud(dataOwnerUserId, (repository) => repository.updateSettings(data.settings, [...data.modules, next].sort((a, b) => a.start.localeCompare(b.start))))
    return next
  }, [data.modules, data.settings, dataOwnerUserId, persistCloud])

  const updateModule = useCallback((id: string, patch: Partial<TimeModule>) => {
    const modules = data.modules.map((m) => (m.id === id ? { ...m, ...patch } : m)).sort((a, b) => a.start.localeCompare(b.start))
    setData((d) => ({ ...d, modules }))
    void persistCloud(dataOwnerUserId, (repository) => repository.updateSettings(data.settings, modules))
  }, [data.modules, data.settings, dataOwnerUserId, persistCloud])

  const deleteModule = useCallback((id: string) => {
    const transition = transitionDeleteModule(data, id)
    setData(transition.nextData)
    void persistCloud(dataOwnerUserId, (repository) => repository.replaceAll(transition.nextData))
  }, [data, dataOwnerUserId, persistCloud])

  // --- Study blocks ---
  const addStudyBlock = useCallback((sb: Omit<StudyBlock, "id">) => {
    const next: StudyBlock = { ...sb, semesterId: sb.semesterId ?? requireActiveSemesterId(data.activeSemesterId, "bloques de estudio"), id: uid() }
    setData((d) => ({ ...d, studyBlocks: [...d.studyBlocks, next] }))
    void persistCloud(dataOwnerUserId, (repository) => repository.saveStudyBlock(next))
    return next
  }, [data.activeSemesterId, dataOwnerUserId, persistCloud])

  const updateStudyBlock = useCallback((id: string, patch: Partial<StudyBlock>) => {
    const current = data.studyBlocks.find((sb) => sb.id === id)
    const next = current ? { ...current, ...patch } : undefined
    setData((d) => ({ ...d, studyBlocks: d.studyBlocks.map((sb) => (sb.id === id ? { ...sb, ...patch } : sb)) }))
    if (next) void persistCloud(dataOwnerUserId, (repository) => repository.saveStudyBlock(next))
  }, [data.studyBlocks, dataOwnerUserId, persistCloud])

  const deleteStudyBlock = useCallback((id: string) => {
    setData((d) => ({ ...d, studyBlocks: d.studyBlocks.filter((sb) => sb.id !== id) }))
    void persistCloud(dataOwnerUserId, (repository) => repository.deleteStudyBlock(id))
  }, [dataOwnerUserId, persistCloud])

  // --- Reminders ---
  const addReminder = useCallback(
    (reminder: Omit<Reminder, "id" | "createdAt" | "notifiedTriggerIndexes">) => {
      const next: Reminder = {
        ...reminder,
        id: uid(),
        semesterId: reminder.semesterId ?? requireActiveSemesterId(data.activeSemesterId, "recordatorios"),
        createdAt: Date.now(),
        notifiedTriggerIndexes: [],
      }
      setData((d) => ({ ...d, reminders: [...d.reminders, next] }))
      void persistCloud(dataOwnerUserId, (repository) => repository.saveReminder(next))
      return next
    },
    [data.activeSemesterId, dataOwnerUserId, persistCloud],
  )

  const updateReminder = useCallback((id: string, patch: Partial<Reminder>) => {
    const current = data.reminders.find((r) => r.id === id)
    const next = current ? { ...current, ...patch } : undefined
    setData((d) => ({ ...d, reminders: d.reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)) }))
    if (next) void persistCloud(dataOwnerUserId, (repository) => repository.saveReminder(next))
  }, [data.reminders, dataOwnerUserId, persistCloud])

  const deleteReminder = useCallback((id: string) => {
    setData((d) => ({ ...d, reminders: d.reminders.filter((r) => r.id !== id) }))
    void persistCloud(dataOwnerUserId, (repository) => repository.deleteReminder(id))
  }, [dataOwnerUserId, persistCloud])


  // --- Assessment groups / grading plans ---
  const createAssessmentGroup = useCallback((group: Omit<AssessmentGroup, "id" | "createdAt">) => {
    const next: AssessmentGroup = { ...group, id: uid(), createdAt: Date.now() }
    setData((d) => ({ ...d, assessmentGroups: [...d.assessmentGroups, next].sort((a, b) => a.position - b.position) }))
    void persistCloud(dataOwnerUserId, (repository) => repository.saveAssessmentGroup(next))
    return next
  }, [dataOwnerUserId, persistCloud])

  const updateAssessmentGroup = useCallback((id: string, patch: Partial<AssessmentGroup>) => {
    const current = data.assessmentGroups.find((group) => group.id === id)
    const next = current ? { ...current, ...patch } : undefined
    setData((d) => ({ ...d, assessmentGroups: d.assessmentGroups.map((group) => group.id === id ? { ...group, ...patch } : group) }))
    if (next) void persistCloud(dataOwnerUserId, (repository) => repository.saveAssessmentGroup(next))
  }, [data.assessmentGroups, dataOwnerUserId, persistCloud])

  const deleteAssessmentGroup = useCallback((id: string, options: { reassignToGroupId?: string } = {}) => {
    const transition = deleteAssessmentGroupTransition(data, id, options)
    if (!transition.ok) return { ok: false as const, preview: transition.preview, error: transition.reason }
    setData(transition.nextData)
    void persistCloud(dataOwnerUserId, (repository) => repository.replaceAll(transition.nextData))
    return { ok: true as const, preview: transition.reassignedGrades }
  }, [data, dataOwnerUserId, persistCloud])

  const reorderAssessmentGroups = useCallback((subjectId: string, orderedIds: string[]) => {
    const order = new Map(orderedIds.map((id, index) => [id, index + 1]))
    const nextData = { ...data, assessmentGroups: data.assessmentGroups.map((group) => group.subjectId === subjectId && order.has(group.id) ? { ...group, position: order.get(group.id)! } : group) }
    setData(nextData)
    void persistCloud(dataOwnerUserId, (repository) => repository.replaceAll(nextData))
  }, [data, dataOwnerUserId, persistCloud])

  const applyGradingPreset = useCallback((subjectId: string, preset: GradingPresetId, options?: { preservePopulatedObsoleteGroups?: boolean }) => {
    const transition = applyGradingPresetTransition(dataRef.current, subjectId, preset, Date.now(), options)
    if (transition.requiresResolution) return transition
    dataRef.current = transition.nextData
    setData(transition.nextData)
    void persistCloud(dataOwnerUserId, (repository) => repository.replaceAll(transition.nextData))
    return transition
  }, [dataOwnerUserId, persistCloud])

  const duplicateGradingPlan = useCallback((fromSubjectId: string, toSubjectId: string) => {
    const toSubject = data.subjects.find((subject) => subject.id === toSubjectId)
    const targetSemesterId = toSubject?.semesterId
    if (!targetSemesterId) throw new Error("La materia destino no tiene semestre.")
    const sourceGroups = data.assessmentGroups.filter((group) => group.subjectId === fromSubjectId).sort((a, b) => a.position - b.position)
    const copied = sourceGroups.map((group): AssessmentGroup => ({ ...group, id: `${toSubjectId}-${group.kind}-${uid()}`, subjectId: toSubjectId, semesterId: targetSemesterId, createdAt: Date.now() }))
    const nextData = { ...data, assessmentGroups: [...data.assessmentGroups.filter((group) => group.subjectId !== toSubjectId), ...copied] }
    setData(nextData)
    void persistCloud(dataOwnerUserId, (repository) => repository.replaceAll(nextData))
    return copied
  }, [data, dataOwnerUserId, persistCloud])

  const simulateAssessmentScore = useCallback((gradeId: string, score: number) => data.grades.map((grade) => grade.id === gradeId ? { ...grade, score, status: "graded" as const } : grade), [data.grades])

  // --- Grades ---
  const addGrade = useCallback((grade: Omit<Grade, "id" | "createdAt">) => {
    const createdAt = Date.now()
    requireActiveSemesterId(dataRef.current.activeSemesterId, "notas")
    const transition = addGradeTransition(dataRef.current, grade, uid(), createdAt)
    dataRef.current = transition.nextData
    setData(transition.nextData)
    void persistCloud(dataOwnerUserId, async (repository) => {
      if (transition.createdGroup) await repository.saveAssessmentGroup(transition.createdGroup)
      await repository.saveGrade(transition.grade)
    }, { throwOnError: true, operationName: "grade.create" }).catch(() => {
      setData((current) => ({
        ...current,
        grades: current.grades.filter((item) => item.id !== transition.grade.id),
        assessmentGroups: transition.createdGroup
          ? current.assessmentGroups.filter((group) => group.id !== transition.createdGroup?.id)
          : current.assessmentGroups,
      }))
    })
    return transition.grade
  }, [data, dataOwnerUserId, persistCloud])

  const createAssessment = addGrade

  const updateGrade = useCallback((id: string, patch: Partial<Grade>) => {
    const current = data.grades.find((g) => g.id === id)
    const next = current ? { ...current, ...patch } : undefined
    setData((d) => ({ ...d, grades: d.grades.map((g) => (g.id === id ? { ...g, ...patch } : g)) }))
    if (next) void persistCloud(dataOwnerUserId, (repository) => repository.saveGrade(next))
  }, [data.grades, dataOwnerUserId, persistCloud])

  const updateAssessment = updateGrade

  const deleteGrade = useCallback((id: string) => {
    setData((d) => ({ ...d, grades: d.grades.filter((g) => g.id !== id) }))
    void persistCloud(dataOwnerUserId, (repository) => repository.deleteGrade(id))
  }, [dataOwnerUserId, persistCloud])

  const deleteAssessment = deleteGrade

  // --- Profile ---
  const updateProfileConfirmed = useCallback(async (patch: Partial<UserProfile>, context?: OperationIdentityContext) => {
    const expectedUserId = context?.expectedUserId ?? dataOwnerUserId
    if (authenticated && !expectedUserId) throw new SessionIdentityMismatchError()
    const nextProfile = { ...data.profile, ...patch }
    const nextData = { ...data, profile: nextProfile }
    if (authenticated) await persistCloud(expectedUserId, (repository) => repository.updateProfile(nextProfile, user?.email), { throwOnError: true, expectedAuthGeneration: context?.expectedAuthGeneration, operationName: "profile.updateConfirmed" })
    setData(nextData)
    if (authenticated && expectedUserId) saveCloudCache(expectedUserId, nextData)
    else saveData(nextData)
  }, [authenticated, data, dataOwnerUserId, persistCloud, user?.email])

  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    void updateProfileConfirmed(patch)
  }, [updateProfileConfirmed])

  const resetProfile = useCallback(() => {
    setData((d) => ({ ...d, profile: DEFAULT_PROFILE }))
    void persistCloud(dataOwnerUserId, (repository) => repository.updateProfile(DEFAULT_PROFILE, user?.email))
  }, [dataOwnerUserId, persistCloud, user?.email])

  // --- Settings ---
  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    const nextSettings = { ...data.settings, ...patch }
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
    void persistCloud(dataOwnerUserId, (repository) => repository.updateSettings(nextSettings, data.modules))
  }, [data.modules, data.settings, dataOwnerUserId, persistCloud])

  const resetSettings = useCallback(() => {
    setData((d) => ({ ...d, settings: DEFAULT_SETTINGS }))
    void persistCloud(dataOwnerUserId, (repository) => repository.updateSettings(DEFAULT_SETTINGS, data.modules))
  }, [data.modules, dataOwnerUserId, persistCloud])


  // --- Semesters ---
  const createSemester = useCallback((semester: Omit<Semester, "id" | "createdAt">) => {
    const next: Semester = { ...semester, id: uid(), createdAt: Date.now() }
    const semesters = next.status === "active" ? data.semesters.map((item) => item.status === "active" ? { ...item, status: "planned" as const } : item) : data.semesters
    const nextData = { ...data, semesters: [...semesters, next], activeSemesterId: next.status === "active" ? next.id : data.activeSemesterId }
    setData(nextData)
    void persistCloud(dataOwnerUserId, (repository) => repository.replaceAll(nextData))
    return next
  }, [data, dataOwnerUserId, persistCloud])

  const updateSemester = useCallback((id: string, patch: Partial<Semester>) => {
    const nextSemesters = data.semesters.map((semester) => semester.id === id ? { ...semester, ...patch } : semester)
    const normalized = patch.status === "active" ? nextSemesters.map((semester) => semester.id === id ? { ...semester, status: "active" as const } : semester.status === "active" ? { ...semester, status: "planned" as const } : semester) : nextSemesters
    const nextData = { ...data, semesters: normalized, activeSemesterId: patch.status === "active" ? id : data.activeSemesterId }
    setData(nextData)
    void persistCloud(dataOwnerUserId, (repository) => repository.replaceAll(nextData))
  }, [data, dataOwnerUserId, persistCloud])

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

  const visibleData = useMemo(() => filterDataByActiveSemester(data), [data])

  // Memoized lookups
  const subjectsById = useMemo(() => {
    const map = new Map<string, Subject>()
    for (const s of visibleData.subjects) map.set(s.id, s)
    return map
  }, [visibleData.subjects])

  return {
    data: visibleData,
    allData: data,
    hydrated,
    syncStatus,
    syncMessage: syncStatus === "local" ? "Guardado local" : syncStatus === "loading" ? "Cargando" : syncStatus === "syncing" ? "Sincronizando" : syncStatus === "synced" ? "Sincronizado" : syncStatus === "offline" ? "Sin conexión" : "Error de sincronización",
    syncError,
    identityReady,
    dataOwnerUserId,
    repositoryOwnerUserId,
    authGeneration,
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
    createAssessmentGroup,
    updateAssessmentGroup,
    deleteAssessmentGroup,
    reorderAssessmentGroups,
    applyGradingPreset,
    duplicateGradingPlan,
    simulateAssessmentScore,
    createAssessment,
    updateAssessment,
    deleteAssessment,
    addGrade,
    updateGrade,
    deleteGrade,
    createSemester,
    updateSemester,
    archiveSemester,
    selectActiveSemester,
    updateProfile,
    updateProfileConfirmed,
    resetProfile,
    updateSettings,
    resetSettings,
  }
}

export type ScheduleStore = ReturnType<typeof useScheduleStore>
