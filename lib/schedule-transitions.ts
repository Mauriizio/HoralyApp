import type { AppData, DayKey, ScheduleBlock, Subject, TimeModule } from "@/lib/types"
import { normalizeSubjectForStorage } from "@/lib/storage"
import { findScheduleBlockConflicts } from "@/lib/schedule-conflicts"

export type TransitionResult<TChanged = undefined> = {
  nextData: AppData
  changedEntity?: TChanged
  deletedIds: string[]
  conflictIds: string[]
  ok: boolean
}

export function transitionUpdateSubject(data: AppData, id: string, patch: Partial<Subject>): TransitionResult<Subject> {
  const existing = data.subjects.find((subject) => subject.id === id)
  if (!existing) return { nextData: data, deletedIds: [], conflictIds: [], ok: false }
  const changedEntity = normalizeSubjectForStorage({ ...existing, ...patch }, data.subjects, {
    id: existing.id,
    createdAt: existing.createdAt,
    excludeSubjectId: existing.id,
  })
  return {
    nextData: { ...data, subjects: data.subjects.map((subject) => subject.id === id ? changedEntity : subject) },
    changedEntity,
    deletedIds: [],
    conflictIds: [],
    ok: true,
  }
}

export function transitionUpsertBlock(data: AppData, block: ScheduleBlock, options: { replaceConflicts?: boolean } = {}): TransitionResult<ScheduleBlock> {
  const conflictIds = findScheduleBlockConflicts(block, data.blocks).map((conflict) => conflict.id)
  if (conflictIds.length > 0 && !options.replaceConflicts) return { nextData: data, changedEntity: block, deletedIds: [], conflictIds, ok: false }
  const nextBlocks = data.blocks.filter((existing) => {
    if (existing.id === block.id) return false
    if (!options.replaceConflicts) return true
    return !conflictIds.includes(existing.id)
  })
  return {
    nextData: { ...data, blocks: [...nextBlocks, block] },
    changedEntity: block,
    deletedIds: conflictIds,
    conflictIds,
    ok: true,
  }
}

export function transitionMoveBlock(data: AppData, blockId: string, targetDay: DayKey, startModuleId: string, modules: TimeModule[]): TransitionResult<ScheduleBlock> {
  const existing = data.blocks.find((block) => block.id === blockId)
  if (!existing) return { nextData: data, deletedIds: [], conflictIds: [], ok: false }
  const span = existing.moduleIds.length
  const startIdx = modules.findIndex((module) => module.id === startModuleId)
  if (startIdx < 0) return { nextData: data, deletedIds: [], conflictIds: [], ok: false }
  const endIdx = Math.min(modules.length - 1, startIdx + span - 1)
  const changedEntity: ScheduleBlock = { ...existing, day: targetDay, moduleIds: modules.slice(startIdx, endIdx + 1).map((module) => module.id) }
  const conflictIds = findScheduleBlockConflicts(changedEntity, data.blocks).map((conflict) => conflict.id)
  if (conflictIds.length > 0) return { nextData: data, changedEntity, deletedIds: [], conflictIds, ok: false }
  return {
    nextData: { ...data, blocks: [...data.blocks.filter((block) => block.id !== blockId), changedEntity] },
    changedEntity,
    deletedIds: [],
    conflictIds: [],
    ok: true,
  }
}

export function transitionSetModules(data: AppData, modules: TimeModule[]): TransitionResult<TimeModule[]> {
  const validIds = new Set(modules.map((module) => module.id))
  const nextBlocks: ScheduleBlock[] = []
  const deletedIds: string[] = []
  for (const block of data.blocks) {
    const moduleIds = block.moduleIds.filter((id) => validIds.has(id))
    if (moduleIds.length === 0) deletedIds.push(block.id)
    else nextBlocks.push(moduleIds.length === block.moduleIds.length ? block : { ...block, moduleIds })
  }
  return {
    nextData: { ...data, modules, blocks: nextBlocks },
    changedEntity: modules,
    deletedIds,
    conflictIds: [],
    ok: true,
  }
}

export function transitionDeleteModule(data: AppData, id: string): TransitionResult<TimeModule[]> {
  return transitionSetModules(data, data.modules.filter((module) => module.id !== id))
}
