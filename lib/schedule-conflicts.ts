import type { ScheduleBlock } from "./types"

export function findScheduleBlockConflicts(
  candidate: ScheduleBlock,
  blocks: ScheduleBlock[],
): ScheduleBlock[] {
  return blocks.filter((block) => {
    if (block.id === candidate.id) return false
    if (block.day !== candidate.day) return false
    return block.moduleIds.some((moduleId) => candidate.moduleIds.includes(moduleId))
  })
}
