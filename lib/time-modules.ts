import type { TimeModule } from "./types"
import { parseTime } from "./time-format"

export type ModuleValidationError = "format" | "range" | "overlap" | "duplicate-id"

export function timeToMinutes(value: string): number | null {
  const parsed = parseTime(value)
  if (!parsed) return null
  return parsed.hour * 60 + parsed.minute
}

export function validateModules(modules: TimeModule[]): ModuleValidationError | null {
  const ids = new Set<string>()
  const normalized = modules.map((module) => {
    if (!module.id || ids.has(module.id)) return { module, start: null, end: null, duplicate: true }
    ids.add(module.id)
    return {
      module,
      start: timeToMinutes(module.start),
      end: timeToMinutes(module.end),
      duplicate: false,
    }
  })

  if (normalized.some((entry) => entry.duplicate)) return "duplicate-id"
  if (normalized.some((entry) => entry.start === null || entry.end === null)) return "format"
  if (normalized.some((entry) => entry.start !== null && entry.end !== null && entry.start >= entry.end)) {
    return "range"
  }

  const sorted = normalized
    .filter((entry): entry is typeof entry & { start: number; end: number } => entry.start !== null && entry.end !== null)
    .sort((a, b) => a.start - b.start)

  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].start < sorted[i - 1].end) return "overlap"
  }

  return null
}
