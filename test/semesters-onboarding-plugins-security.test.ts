import test from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import nextConfig from "../next.config.mjs"
import { calculateWeightedAverage, detectSubjectsAtRisk, detectSubjectsRequiringAttention, getTodayClasses } from "../domain/academic-engine/index.ts"
import { ensureSingleActiveSemester, filterDataByActiveSemester, migrateLegacyDataToInitialSemester } from "../application/semesters.ts"
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
