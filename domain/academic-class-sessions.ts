import type { DayKey } from "../lib/types.ts"

export type AcademicClassSession = {
  id: string
  stableKey: string
  subjectId: string
  subjectName: string
  day: DayKey
  start: string
  end: string
  firstModuleIndex: number
  lastModuleIndex: number
}

type SessionInput = {
  blocks: Array<{ id: string; subjectId: string; day: DayKey; moduleIds: string[] }>
  modules: Array<{ id: string; start: string; end: string }>
  subjects: Array<{ id: string; name: string }>
}

const DAY_ORDER: DayKey[] = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]

export function buildAcademicClassSessions({ blocks, modules, subjects }: SessionInput): AcademicClassSession[] {
  const moduleIndex = new Map(modules.map((module, index) => [module.id, index]))
  const subjectName = new Map(subjects.map((subject) => [subject.id, subject.name]))
  const segments = blocks.flatMap((block) => {
    const name = subjectName.get(block.subjectId)
    const indices = block.moduleIds.flatMap((id) => {
      const index = moduleIndex.get(id)
      return index === undefined ? [] : [index]
    }).sort((a, b) => a - b)
    if (!name || indices.length === 0) return []
    const firstModuleIndex = indices[0]
    const lastModuleIndex = indices.at(-1)!
    return [{
      id: block.id,
      stableKey: `${block.day}:${block.subjectId}:${firstModuleIndex}`,
      subjectId: block.subjectId,
      subjectName: name,
      day: block.day,
      start: modules[firstModuleIndex].start,
      end: modules[lastModuleIndex].end,
      firstModuleIndex,
      lastModuleIndex,
    } satisfies AcademicClassSession]
  }).sort((left, right) => DAY_ORDER.indexOf(left.day) - DAY_ORDER.indexOf(right.day) || left.firstModuleIndex - right.firstModuleIndex || left.subjectId.localeCompare(right.subjectId))

  const sessions: AcademicClassSession[] = []
  const latestBySubjectAndDay = new Map<string, AcademicClassSession>()
  for (const segment of segments) {
    const groupingKey = `${segment.day}:${segment.subjectId}`
    const current = latestBySubjectAndDay.get(groupingKey)
    if (current && segment.firstModuleIndex <= current.lastModuleIndex + 1) {
      if (segment.lastModuleIndex > current.lastModuleIndex) {
        current.lastModuleIndex = segment.lastModuleIndex
        current.end = modules[segment.lastModuleIndex].end
      }
      continue
    }
    const session = { ...segment }
    sessions.push(session)
    latestBySubjectAndDay.set(groupingKey, session)
  }
  return sessions.sort((left, right) => DAY_ORDER.indexOf(left.day) - DAY_ORDER.indexOf(right.day) || left.firstModuleIndex - right.firstModuleIndex || left.subjectId.localeCompare(right.subjectId))
}
