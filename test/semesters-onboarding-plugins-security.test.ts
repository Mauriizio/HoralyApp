import test from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import nextConfig from "../next.config.mjs"
import { calculateWeightedAverage, detectSubjectsAtRisk, detectSubjectsRequiringAttention, getTodayClasses } from "../domain/academic-engine/index.ts"
import { canArchiveSemester, ensureSingleActiveSemester, filterDataByActiveSemester, getAvailableSemesters, migrateLegacyDataToInitialSemester, validateSemesterDates } from "../application/semesters.ts"
import { EMPTY_APP_DATA } from "../lib/types.ts"
import { createPluginRegistry, resistorCalculatorPlugin } from "../lib/plugins/plugin-registry.ts"
import { permissionsAllowedByCapabilities } from "../lib/plugins/plugin-capabilities.ts"

test("semestre activo único y migración legacy", () => {
  const normalized = ensureSingleActiveSemester([{ id: "a", name: "A", status: "active", createdAt: 1 }, { id: "b", name: "B", status: "active", createdAt: 2 }])
  assert.equal(normalized.filter((s) => s.status === "active").length, 1)
  const migrated = migrateLegacyDataToInitialSemester({ ...EMPTY_APP_DATA, subjects: [{ id: "s1", name: "Mate", color: "#000", difficulty: 3, createdAt: 1 }] })
  assert.equal(migrated.activeSemesterId, "initial-semester")
  assert.equal(migrated.subjects[0]?.semesterId, "initial-semester")
})

test("filtros por semestre preservan historial", () => {
  const data = { ...EMPTY_APP_DATA, activeSemesterId: "a", semesters: [{ id: "a", name: "A", status: "active" as const, createdAt: 1 }, { id: "b", name: "B", status: "archived" as const, createdAt: 2 }], subjects: [{ id: "s1", semesterId: "a", name: "A", color: "#000", difficulty: 3 as const, createdAt: 1 }, { id: "s2", semesterId: "b", name: "B", color: "#000", difficulty: 3 as const, createdAt: 2 }] }
  assert.deepEqual(filterDataByActiveSemester(data).subjects.map((s) => s.id), ["s1"])
})

test("plugins quedan aislados por permisos", () => {
  assert.equal(createPluginRegistry([resistorCalculatorPlugin]).list().length, 1)
  assert.equal(permissionsAllowedByCapabilities(["navigation:route"], ["read:subjects"]), false)
})

test("headers CSP incluyen controles obligatorios", async () => {
  const headersFn = nextConfig.headers
  if (typeof headersFn !== "function") throw new Error("next.config.mjs debe definir headers")
  const headers = await headersFn()
  const csp = headers[0].headers.find((h: { key: string; value: string }) => h.key === "Content-Security-Policy")?.value ?? ""
  assert.match(csp, /frame-ancestors 'none'/)
  assert.match(csp, /object-src 'none'/)
  assert.match(csp, /base-uri 'self'/)
  assert.match(csp, /form-action 'self'/)
})


test("dashboard separa riesgo real de atención y filtra clases de hoy", () => {
  const data = { ...EMPTY_APP_DATA, subjects: [{ id: "s1", semesterId: "a", name: "Física", color: "#000", difficulty: 5 as const, createdAt: 1 }], reminders: [{ id: "r1", semesterId: "a", subjectId: "s1", title: "Informe", priority: "alta" as const, triggers: [], targetDateTime: "2026-07-19T10:00:00.000Z", createdAt: 1, notifiedTriggerIndexes: [] }], blocks: [{ id: "b1", semesterId: "a", subjectId: "s1", day: "lunes" as const, moduleIds: ["m1"] }] }
  assert.equal(detectSubjectsAtRisk(data).length, 0)
  assert.equal(detectSubjectsRequiringAttention(data, new Date("2026-07-20T10:00:00.000Z")).length, 1)
  assert.equal(getTodayClasses(data, new Date("2026-07-20T10:00:00.000Z")).length, 1)
})

test("CSP de producción no incluye unsafe-eval", async () => {
  const output = execFileSync(process.execPath, ["--input-type=module", "-e", "import config from './next.config.mjs'; const headers = await config.headers(); console.log(headers[0].headers.find((h) => h.key === 'Content-Security-Policy').value)"], { encoding: "utf8", env: { ...process.env, NODE_ENV: "production" } })
  assert.equal(output.includes("'unsafe-eval'"), false)
})

test("confianza del promedio usa valores internos estables", () => {
  assert.equal(calculateWeightedAverage([], EMPTY_APP_DATA.settings.gradeScale).confidence, "none")
})


test("dashboard filtrado excluye semestres archivados y planificados", () => {
  const data = {
    ...EMPTY_APP_DATA,
    activeSemesterId: "active",
    semesters: [
      { id: "active", name: "Activo", status: "active" as const, createdAt: 1 },
      { id: "archived", name: "Archivado", status: "archived" as const, createdAt: 2 },
      { id: "planned", name: "Planificado", status: "planned" as const, createdAt: 3 },
    ],
    subjects: [
      { id: "s-active", semesterId: "active", name: "Activo", color: "#000", difficulty: 3 as const, createdAt: 1 },
      { id: "s-archived", semesterId: "archived", name: "Archivado", color: "#000", difficulty: 3 as const, createdAt: 2 },
      { id: "s-planned", semesterId: "planned", name: "Planificado", color: "#000", difficulty: 3 as const, createdAt: 3 },
    ],
    grades: [
      { id: "g-active", semesterId: "active", subjectId: "s-active", title: "A", score: 6, weight: 100, date: "2026-07-20", createdAt: 1 },
      { id: "g-archived", semesterId: "archived", subjectId: "s-archived", title: "B", score: 1, weight: 100, date: "2026-07-20", createdAt: 2 },
    ],
  }
  const filtered = filterDataByActiveSemester(data)
  assert.deepEqual(filtered.subjects.map((subject) => subject.id), ["s-active"])
  assert.equal(calculateWeightedAverage(filtered.grades, filtered.settings.gradeScale).value, 6)
})


test("migración preserva user_id al desvincular study_blocks", () => {
  const migration = readFileSync("supabase/migrations/202607200001_foundation_security_semesters.sql", "utf8")
  assert.match(migration, /on delete set null \(subject_id\)/i)
})

test("selector de semestre muestra activo y excluye archivados", () => {
  const source = readFileSync("components/semesters/semester-switcher.tsx", "utf8")
  assert.match(source, /Semestre activo/)
  assert.match(source, /getAvailableSemesters/)
  const available = getAvailableSemesters([
    { id: "a", name: "Activo", status: "active", createdAt: 1 },
    { id: "x", name: "Archivado", status: "archived", createdAt: 2 },
  ])
  assert.deepEqual(available.map((semester) => semester.id), ["a"])
})

test("cambiar semestre actualiza datos visibles sin mezclar materias", () => {
  const data = {
    ...EMPTY_APP_DATA,
    activeSemesterId: "b",
    semesters: [{ id: "a", name: "A", status: "planned" as const, createdAt: 1 }, { id: "b", name: "B", status: "active" as const, createdAt: 2 }],
    subjects: [{ id: "s-a", semesterId: "a", name: "A", color: "#000", difficulty: 3 as const, createdAt: 1 }, { id: "s-b", semesterId: "b", name: "B", color: "#000", difficulty: 3 as const, createdAt: 2 }],
  }
  assert.deepEqual(filterDataByActiveSemester(data).subjects.map((subject) => subject.id), ["s-b"])
})

test("crear y editar semestre preserva datos por reemplazo completo", () => {
  const storeSource = readFileSync("hooks/use-schedule-store.ts", "utf8")
  assert.match(storeSource, /const createSemester = useCallback/)
  assert.match(storeSource, /const updateSemester = useCallback/)
  assert.match(storeSource, /repository\.replaceAll\(nextData\)/)
})

test("solo existe un semestre activo al normalizar", () => {
  const semesters = ensureSingleActiveSemester([{ id: "a", name: "A", status: "active", createdAt: 1 }, { id: "b", name: "B", status: "active", createdAt: 2 }])
  assert.equal(semesters.filter((semester) => semester.status === "active").length, 1)
})

test("no se puede archivar el único semestre", () => {
  const data = { ...EMPTY_APP_DATA, activeSemesterId: "a", semesters: [{ id: "a", name: "A", status: "active" as const, createdAt: 1 }] }
  assert.equal(canArchiveSemester(data, "a").ok, false)
})

test("archivar el activo requiere reemplazo", () => {
  const data = { ...EMPTY_APP_DATA, activeSemesterId: "a", semesters: [{ id: "a", name: "A", status: "active" as const, createdAt: 1 }, { id: "b", name: "B", status: "planned" as const, createdAt: 2 }] }
  const result = canArchiveSemester(data, "a")
  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.reason, /Activa otro semestre/)
})

test("restaurar semestre vuelve a planificado", () => {
  const manager = readFileSync("components/semesters/semester-manager.tsx", "utf8")
  assert.match(manager, /status: "planned"/)
  assert.match(manager, /Restaurar/)
})

test("fechas inválidas se rechazan", () => {
  assert.equal(validateSemesterDates("2026-08-01", "2026-07-01"), "La fecha de término no puede ser anterior al inicio.")
  assert.equal(validateSemesterDates("2026-07-01", "2026-08-01"), null)
})

test("contadores cambian con semestre activo", () => {
  const a = filterDataByActiveSemester({ ...EMPTY_APP_DATA, activeSemesterId: "a", semesters: [{ id: "a", name: "A", status: "active" as const, createdAt: 1 }], subjects: [{ id: "s-a", semesterId: "a", name: "A", color: "#000", difficulty: 3 as const, createdAt: 1 }] })
  const b = filterDataByActiveSemester({ ...EMPTY_APP_DATA, activeSemesterId: "b", semesters: [{ id: "b", name: "B", status: "active" as const, createdAt: 2 }], subjects: [{ id: "s-b1", semesterId: "b", name: "B1", color: "#000", difficulty: 3 as const, createdAt: 2 }, { id: "s-b2", semesterId: "b", name: "B2", color: "#000", difficulty: 3 as const, createdAt: 3 }] })
  assert.equal(a.subjects.length, 1)
  assert.equal(b.subjects.length, 2)
})

test("invitado persiste localmente y autenticado persiste en Supabase", () => {
  const storeSource = readFileSync("hooks/use-schedule-store.ts", "utf8")
  assert.match(storeSource, /else saveData\(data\)/)
  assert.match(storeSource, /repository\.kind !== "supabase"/)
  assert.match(storeSource, /repository\.replaceAll/)
})

test("onboarding completado puede abrirse nuevamente sin duplicar semestres", () => {
  const settings = readFileSync("components/settings-view.tsx", "utf8")
  const onboarding = readFileSync("components/onboarding/onboarding-flow.tsx", "utf8")
  assert.match(settings, /Revisar configuración inicial/)
  assert.match(settings, /Continuar onboarding/)
  assert.match(onboarding, /if \(current\) \{/)
  assert.match(onboarding, /store\.updateSemester\(current\.id/)
})

test("dashboard contiene un solo indicador de sincronización global", () => {
  const dashboard = readFileSync("components/dashboard/academic-dashboard.tsx", "utf8")
  const app = readFileSync("app/page.tsx", "utf8")
  assert.equal((dashboard.match(/syncMessage/g) ?? []).length, 0)
  assert.ok((app.match(/syncMessage/g) ?? []).length >= 1)
})

test("no existen accesos directos nuevos de UI a Supabase en semestres", () => {
  const switcher = readFileSync("components/semesters/semester-switcher.tsx", "utf8")
  const manager = readFileSync("components/semesters/semester-manager.tsx", "utf8")
  assert.equal(/supabase/i.test(switcher + manager), false)
})
