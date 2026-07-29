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
    "basic-tour", "schedule-tour", "grades-tour", "reminders-tour", "tools-tour", "preferences-tour", "assistant-tour", "analytics-tour",
  ])
  assert.equal(TUTORIAL_REGISTRY["basic-tour"].version, 2)
})

test("pasos distinguen información de acciones reales sin bloquear el escape", () => {
  const schedule = TUTORIAL_REGISTRY["schedule-tour"]
  assert.ok(schedule.steps.some((step) => step.type === "action"))
  assert.ok(schedule.steps.some((step) => step.requiredEvent === "schedule-cell-opened"))
  assert.ok(schedule.steps.some((step) => step.requiredEvent === "schedule-subject-selected"))
  for (const tutorial of Object.values(TUTORIAL_REGISTRY)) {
    for (const step of tutorial.steps) {
      assert.ok(step.type === "information" || step.type === "action")
    }
  }
})

test("progreso se normaliza sin repetir versiones ya terminadas", () => {
  const completed = normalizeTutorialProgress(TUTORIAL_REGISTRY["basic-tour"], {
    status: "completed", currentStep: 99, version: 2,
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

test("tour usa portal y spotlight pasivo sin elevar el target real", async () => {
  const guidedTour = await readFile("components/tutorials/guided-tour.tsx", "utf8")
  const styles = await readFile("app/globals.css", "utf8")
  assert.match(guidedTour, /createPortal/)
  assert.match(guidedTour, /TOUR_LAYERS/)
  assert.match(guidedTour, /ResizeObserver/)
  assert.match(guidedTour, /pointer-events-none/)
  assert.doesNotMatch(styles, /\[data-tour-active="true"\][\s\S]*?z-index:\s*51/)
})

test("targets interactivos y tutorial del asistente son estables", async () => {
  const schedule = await readFile("components/schedule-grid.tsx", "utf8")
  const assistant = await readFile("components/HorarilySpeakingCard.tsx", "utf8")
  assert.match(schedule, /data-tour="schedule-empty-cell"/)
  assert.match(schedule, /data-tour="schedule-subject-picker"/)
  assert.match(schedule, /data-tour="schedule-subject-option"/)
  assert.match(assistant, /data-tour="assistant-quick-actions"/)
  assert.match(assistant, /data-tour="assistant-input"/)
  assert.match(assistant, /data-tour="assistant-advanced-commands"/)
  assert.equal(TUTORIAL_REGISTRY["assistant-tour"].steps.length, 6)
})
