import type { Subject } from "./types.ts"

const MAX_COMMAND_KEY_LENGTH = 8

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

export function normalizeCommandKey(value: string): string {
  return stripDiacritics(value)
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, MAX_COMMAND_KEY_LENGTH)
}

export function buildBaseCommandKey(name: string): string {
  const normalizedWords = stripDiacritics(name)
    .toUpperCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Z0-9]/g, ""))
    .filter(Boolean)

  if (normalizedWords.length === 0) return "MAT"
  if (normalizedWords.length === 1) return normalizeCommandKey(normalizedWords[0].slice(0, 3)) || "MAT"

  const acronym = normalizedWords.map((word) => word[0]).join("")
  return normalizeCommandKey(acronym) || "MAT"
}

export function ensureUniqueCommandKey(
  preferredValue: string,
  subjects: Pick<Subject, "id" | "commandKey" | "name">[],
  options: { excludeSubjectId?: string; fallbackName?: string } = {},
): string {
  const fallback = options.fallbackName ? buildBaseCommandKey(options.fallbackName) : "MAT"
  const base = normalizeCommandKey(preferredValue) || fallback
  const used = new Set(
    subjects
      .filter((subject) => subject.id !== options.excludeSubjectId)
      .map((subject) => normalizeCommandKey(subject.commandKey ?? ""))
      .filter(Boolean),
  )

  if (!used.has(base)) return base

  for (let i = 2; i < 1000; i += 1) {
    const suffix = String(i)
    const candidate = `${base.slice(0, MAX_COMMAND_KEY_LENGTH - suffix.length)}${suffix}`
    if (!used.has(candidate)) return candidate
  }

  throw new Error("No se pudo generar una clave de comando única.")
}

export function commandKeyForSubjectName(
  name: string,
  subjects: Pick<Subject, "id" | "commandKey" | "name">[],
  excludeSubjectId?: string,
): string {
  return ensureUniqueCommandKey(buildBaseCommandKey(name), subjects, {
    excludeSubjectId,
    fallbackName: name,
  })
}
