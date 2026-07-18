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
import { loadData, saveData } from "@/lib/storage"
import { computeTriggerTime, fireNotification } from "@/lib/notifications"
import { validateModules } from "@/lib/time-modules"
import { findScheduleBlockConflicts } from "@/lib/schedule-conflicts"

export { validateModules }

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function useScheduleStore() {
  const [data, setData] = useState<AppData>(EMPTY_APP_DATA)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setData(loadData())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) saveData(data)
  }, [data, hydrated])

  const replaceAll = useCallback((next: AppData) => setData(next), [])

  // --- Subjects ---
  const addSubject = useCallback((subject: Omit<Subject, "id" | "createdAt">) => {
    let createdSubject: Subject | null = null
    setData((d) => {
      const newSubject: Subject = { ...subject, id: uid(), createdAt: Date.now() }
      createdSubject = newSubject
      return { ...d, subjects: [...d.subjects, newSubject] }
    })
    return createdSubject as Subject
  }, [])

  const updateSubject = useCallback((id: string, patch: Partial<Subject>) => {
    setData((d) => ({
      ...d,
      subjects: d.subjects.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }))
  }, [])

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
  }, [])

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
    return conflictIds.length > 0 && !options.replaceConflicts
      ? { ok: false as const, conflictIds }
      : { ok: true as const, conflictIds }
  }, [])

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
  }, [])

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
  }, [])

  const addModule = useCallback((module: Omit<TimeModule, "id">) => {
    const next: TimeModule = { ...module, id: uid() }
    setData((d) => ({
      ...d,
      modules: [...d.modules, next].sort((a, b) => a.start.localeCompare(b.start)),
    }))
    return next
  }, [])

  const updateModule = useCallback((id: string, patch: Partial<TimeModule>) => {
    setData((d) => ({
      ...d,
      modules: d.modules
        .map((m) => (m.id === id ? { ...m, ...patch } : m))
        .sort((a, b) => a.start.localeCompare(b.start)),
    }))
  }, [])

  const deleteModule = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      modules: d.modules.filter((m) => m.id !== id),
      blocks: d.blocks
        .map((b) => ({ ...b, moduleIds: b.moduleIds.filter((mid) => mid !== id) }))
        .filter((b) => b.moduleIds.length > 0),
    }))
  }, [])

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
  }, [])

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
  }, [])

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
  }, [])

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
