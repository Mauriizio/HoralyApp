import { type AppData, DEFAULT_PROFILE, EMPTY_APP_DATA } from "./types"

const STORAGE_KEY = "horario-escolar:v1"

// Defensive migration: tolerate older saves missing newer fields (grades, profile,
// gradeScale, language, etc.) so existing users don't lose data on upgrade.
function migrate(parsed: Partial<AppData> & Record<string, unknown>): AppData {
  return {
    ...EMPTY_APP_DATA,
    ...parsed,
    settings: { ...EMPTY_APP_DATA.settings, ...(parsed.settings ?? {}) },
    modules: parsed.modules?.length ? parsed.modules : EMPTY_APP_DATA.modules,
    grades: Array.isArray(parsed.grades) ? parsed.grades : [],
    profile: { ...DEFAULT_PROFILE, ...(parsed.profile ?? {}) },
    version: 2,
  } as AppData
}

export function loadData(): AppData {
  if (typeof window === "undefined") return EMPTY_APP_DATA
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_APP_DATA
    const parsed = JSON.parse(raw) as Partial<AppData>
    return migrate(parsed)
  } catch (err) {
    console.log("[v0] Error cargando datos:", err)
    return EMPTY_APP_DATA
  }
}

export function saveData(data: AppData) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (err) {
    console.log("[v0] Error guardando datos:", err)
  }
}

export function exportAsJson(data: AppData): string {
  return JSON.stringify(data, null, 2)
}

export function importFromJson(json: string): AppData {
  const parsed = JSON.parse(json) as Partial<AppData>
  return migrate(parsed)
}

export function downloadJson(filename: string, json: string) {
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
