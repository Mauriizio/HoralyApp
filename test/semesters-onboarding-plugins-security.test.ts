import test from "node:test"
import assert from "node:assert/strict"
import nextConfig from "../next.config.mjs"
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
