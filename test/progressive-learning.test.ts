import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { displayGivenName } from "../lib/onboarding-copy.ts"
import {
  TUTORIAL_REGISTRY,
  buildTutorialStorageKey,
  getFirstStepsCompletion,
  normalizeTutorialProgress,
} from "../lib/tutorials.ts"
import { EMPTY_APP_DATA } from "../lib/types.ts"

test("nombre visible conserva nombres compuestos y deja el escape a React", () => {
  assert.equal(displayGivenName("  Juan   Pablo  "), "Juan Pablo")
  assert.equal(displayGivenName("<script>alert(1)</script>"), "<script>alert(1)</script>")
  assert.equal(displayGivenName(""), "")
})

test("recorrido básico tiene seis pasos y tutoriales estables versionados", () => {
  assert.equal(TUTORIAL_REGISTRY["basic-tour"].steps.length, 6)
  assert.deepEqual(Object.keys(TUTORIAL_REGISTRY), [
    "basic-tour", "schedule-tour", "grades-tour", "reminders-tour", "tools-tour", "preferences-tour", "analytics-tour",
  ])
  assert.equal(TUTORIAL_REGISTRY["basic-tour"].version, 1)
})

test("progreso se normaliza sin repetir versiones ya terminadas", () => {
  const completed = normalizeTutorialProgress(TUTORIAL_REGISTRY["basic-tour"], {
    status: "completed", currentStep: 99, version: 1,
  })
  assert.equal(completed.status, "completed")
  assert.equal(completed.currentStep, 5)
})

test("persistencia tutorial queda aislada por identidad y generación", () => {
  assert.notEqual(buildTutorialStorageKey("guest", 1), buildTutorialStorageKey("user-a", 1))
  assert.notEqual(buildTutorialStorageKey("user-a", 1), buildTutorialStorageKey("user-a", 2))
})

test("checklist deriva progreso de datos reales", () => {
  const base = { ...EMPTY_APP_DATA, subjects: [{ id: "s", semesterId: "sem", name: "Matemáticas", color: "#fff", difficulty: 3 as const, createdAt: 1 }] }
  const progress = getFirstStepsCompletion(base)
  assert.equal(progress.subject, true)
  assert.equal(progress.schedule, false)
  assert.equal(progress.grades, false)
  assert.equal(progress.reminders, false)
  assert.equal(progress.personalization, false)
})

test("onboarding conserva borrador de semestre y usa ejemplos pedidos", async () => {
  const source = await readFile("components/onboarding/onboarding-flow.tsx", "utf8")
  assert.match(source, /Primer semestre/)
  assert.match(source, /placeholder="Matemáticas"/)
  assert.doesNotMatch(source, /placeholder="Ej: Electrotecnia/)
  assert.match(source, /draftSemesterName/)
})
