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
    "basic-tour", "schedule-tour", "grades-tour", "reminders-tour", "tools-tour", "notebook-tour", "preferences-tour", "assistant-tour", "analytics-tour",
  ])
  assert.equal(TUTORIAL_REGISTRY["basic-tour"].version, 2)
  assert.deepEqual(
    Object.fromEntries(Object.entries(TUTORIAL_REGISTRY).map(([id, definition]) => [id, definition.entryTab])),
    {
      "basic-tour": "dashboard",
      "schedule-tour": "horario",
      "grades-tour": "notas",
      "reminders-tour": "recordatorios",
      "tools-tour": "herramientas",
      "preferences-tour": "preferencias",
      "assistant-tour": "dashboard",
      "analytics-tour": "analitica",
      "notebook-tour": "cuaderno",
    },
  )
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

test("persistencia tutorial queda aislada por identidad estable y no por generación", () => {
  assert.notEqual(buildTutorialStorageKey("installation:a"), buildTutorialStorageKey("user:a"))
  assert.equal(buildTutorialStorageKey("user:a"), buildTutorialStorageKey("user:a"))
  assert.doesNotMatch(buildTutorialStorageKey("user:a"), /generation|:1$/)
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
  assert.match(guidedTour, /step\.type === "information"[\s\S]*?panelRef\.current\?\.focus/)
  assert.doesNotMatch(styles, /\[data-tour-active="true"\][\s\S]*?z-index:\s*51/)
})

test("targets interactivos y tutorial del asistente son estables", async () => {
  const schedule = await readFile("components/schedule-grid.tsx", "utf8")
  const assistant = await readFile("components/HorarilySpeakingCard.tsx", "utf8")
  assert.match(schedule, /data-tour="schedule-empty-cell"/)
  assert.match(schedule, /data-tour="schedule-subject-picker"/)
  assert.match(schedule, /data-tour="schedule-subject-option"/)
  assert.match(assistant, /data-tour="assistant-actions"/)
  assert.match(assistant, /data-tour="assistant-input-active"/)
  assert.match(assistant, /data-tour="assistant-advanced-commands"/)
  assert.equal(TUTORIAL_REGISTRY["assistant-tour"].steps.length, 5)
})

test("inicio manual navega antes de activar y recarga no autolanza progreso pendiente", async () => {
  const page = await readFile("app/page.tsx", "utf8")
  assert.match(page, /startTutorial\(\{\s*id,\s*mode/)
  assert.match(page, /navigateTo\(definition\.entryTab\)[\s\S]*?requestAnimationFrame[\s\S]*?setActiveTutorial/)
  assert.match(page, /Tienes un tutorial pendiente/)
  assert.doesNotMatch(page, /current\.status === "in-progress" \? current\.currentStep : 0/)
})

test("asistente guiado no muestra caja libre en idle", async () => {
  const assistant = await readFile("components/HorarilySpeakingCard.tsx", "utf8")
  assert.match(assistant, /¿Qué quieres hacer\?/)
  assert.match(assistant, /conversationState\.kind === "awaitingSubjectName"/)
  assert.match(assistant, /advancedMode/)
  assert.doesNotMatch(assistant, /placeholder="Escribe qué necesitas…"/)
  assert.match(assistant, /Volver al modo guiado/)
})
