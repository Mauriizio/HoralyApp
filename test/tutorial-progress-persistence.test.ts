import test from "node:test"
import assert from "node:assert/strict"
import {
  mergeTutorialProgress,
  resetTutorialProgress,
  shouldAutoStartTutorial,
  type TutorialProgressMap,
} from "../lib/tutorial-progress.ts"

const completed = { version: 1, status: "completed" as const, currentStep: 3 }
const skipped = { version: 1, status: "skipped" as const, currentStep: 1 }

test("completed no vuelve a iniciar tras navegación, reload o logout/login", () => {
  const account = mergeTutorialProgress({}, { "schedule-tour": completed })
  assert.equal(shouldAutoStartTutorial(account, "schedule-tour"), false)
  const reload = mergeTutorialProgress({}, JSON.parse(JSON.stringify(account)) as TutorialProgressMap)
  assert.equal(shouldAutoStartTutorial(reload, "schedule-tour"), false)
  const loginAgain = mergeTutorialProgress({}, account)
  assert.equal(shouldAutoStartTutorial(loginAgain, "schedule-tour"), false)
})

test("skipped no vuelve a iniciar tras logout/login", () => {
  const account = mergeTutorialProgress({}, { "tools-tour": skipped })
  assert.equal(shouldAutoStartTutorial(account, "tools-tour"), false)
})

test("cuentas A y B permanecen independientes y A sobrevive A-B-A", () => {
  const accountA = mergeTutorialProgress({}, { "notebook-tour": completed })
  const accountB: TutorialProgressMap = {}
  assert.equal(shouldAutoStartTutorial(accountB, "notebook-tour"), true)
  assert.equal(shouldAutoStartTutorial(accountA, "notebook-tour"), false)
})

test("guest permanece separado del progreso authenticated", () => {
  const guest = mergeTutorialProgress({}, { "grades-tour": skipped })
  const account: TutorialProgressMap = {}
  assert.equal(shouldAutoStartTutorial(guest, "grades-tour"), false)
  assert.equal(shouldAutoStartTutorial(account, "grades-tour"), true)
})

test("cambio de versión no revive terminales y escrituras stale no degradan", () => {
  const newerCompleted = { ...completed, version: 2 }
  const merged = mergeTutorialProgress(
    { "schedule-tour": newerCompleted, "tools-tour": skipped },
    {
      "schedule-tour": { version: 1, status: "in-progress", currentStep: 1 },
      "tools-tour": { version: 1, status: "not-started", currentStep: 0 },
    },
  )
  assert.equal(merged["schedule-tour"]?.status, "completed")
  assert.equal(merged["tools-tour"]?.status, "skipped")
})

test("completed prevalece sobre skipped y progreso conserva el paso más avanzado", () => {
  const terminal = mergeTutorialProgress(
    { "basic-tour": skipped },
    { "basic-tour": completed },
  )
  assert.equal(terminal["basic-tour"]?.status, "completed")
  const active = mergeTutorialProgress(
    { "assistant-tour": { version: 1, status: "in-progress", currentStep: 1 } },
    { "assistant-tour": { version: 1, status: "in-progress", currentStep: 4 } },
  )
  assert.equal(active["assistant-tour"]?.currentStep, 4)
})

test("reinicio manual es la única operación que degrada a not-started", () => {
  const reset = resetTutorialProgress({ "schedule-tour": completed }, "schedule-tour", 2)
  assert.equal(reset["schedule-tour"]?.status, "not-started")
  assert.equal(shouldAutoStartTutorial(reset, "schedule-tour"), true)
})
