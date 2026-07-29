import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { EMPTY_APP_DATA, type AppData } from "../lib/types.ts"
import { backfillLegacyActivationMarker, evaluateActivation } from "../application/activation.ts"
import { evaluateSubjectCreation } from "../application/subject-creation.ts"
import { createConversationState, transitionConversation } from "../application/horarily-conversation.ts"
import { commandKeyForSubjectName } from "../lib/command-key.ts"

const semester = { id: "sem", name: "Semestre actual", status: "active" as const, createdAt: 1 }
const subject = { id: "subject", semesterId: "sem", name: "Matemática", commandKey: "MAT", color: "#2563EB", difficulty: 3 as const, createdAt: 1 }

function data(overrides: Partial<AppData> = {}): AppData {
  return {
    ...EMPTY_APP_DATA,
    ...overrides,
    settings: { ...EMPTY_APP_DATA.settings, ...overrides.settings },
    profile: { ...EMPTY_APP_DATA.profile, ...overrides.profile },
  }
}

test("gate inicial bloquea workspace nuevo y repara legacy sin materia", () => {
  assert.equal(evaluateActivation(data(), { hydrated: true, identityReady: true, transitioning: false }).kind, "requiresOnboarding")
  assert.equal(evaluateActivation(data({
    activeSemesterId: "sem",
    semesters: [semester],
    profile: { displayName: "Ana", onboardingCompletedAt: "2026-01-01" },
    settings: { ...EMPTY_APP_DATA.settings, onboarding: { currentStep: 4, completed: true } },
  }), { hydrated: true, identityReady: true, transitioning: false }).kind, "requiresFirstSubject")
})

test("usuario activado entra y borrar su última materia no reinicia onboarding", () => {
  const activated = data({
    activeSemesterId: "sem",
    semesters: [semester],
    subjects: [subject],
    profile: { displayName: "Ana", onboardingCompletedAt: "2026-01-01" },
    settings: { ...EMPTY_APP_DATA.settings, onboarding: { currentStep: 4, completed: true, activationCompletedAt: "2026-01-01" } },
  })
  assert.equal(evaluateActivation(activated, { hydrated: true, identityReady: true, transitioning: false }).kind, "ready")
  assert.equal(evaluateActivation({ ...activated, subjects: [] }, { hydrated: true, identityReady: true, transitioning: false }).kind, "ready")
})

test("creación de materia comparte precondiciones y detecta duplicados", () => {
  const base = data({ activeSemesterId: "sem", semesters: [semester], profile: { displayName: "Ana" } })
  assert.equal(evaluateSubjectCreation(base, { identityReady: false, transitioning: false }, "Física").kind, "identityNotReady")
  assert.equal(evaluateSubjectCreation(data({ profile: { displayName: "Ana" } }), { identityReady: true, transitioning: false }, "Física").kind, "missingActiveSemester")
  assert.equal(evaluateSubjectCreation({ ...base, subjects: [subject] }, { identityReady: true, transitioning: false }, " matemática ").kind, "duplicateSubject")
  assert.equal(evaluateSubjectCreation(base, { identityReady: true, transitioning: false }, "Física").kind, "allowed")
})

test("claves automáticas eliminan tildes, respetan longitud y evitan colisiones", () => {
  const first = commandKeyForSubjectName("Matemática", [])
  const second = commandKeyForSubjectName("Matemática II", [{ ...subject, commandKey: first }])
  const third = commandKeyForSubjectName("Máquinas Térmicas", [{ ...subject, commandKey: first }, { ...subject, id: "2", commandKey: second }])
  assert.match(first, /^[A-Z0-9]{1,8}$/)
  assert.match(second, /^[A-Z0-9]{1,8}$/)
  assert.match(third, /^[A-Z0-9]{1,8}$/)
  assert.equal(new Set([first, second, third]).size, 3)
})

test("conversación natural crea una materia mediante confirmación y conserva comandos slash", () => {
  const idle = createConversationState()
  const ask = transitionConversation(idle, "quiero agregar una materia")
  assert.equal(ask.state.kind, "awaitingSubjectName")
  const confirm = transitionConversation(ask.state, "Circuitos Eléctricos")
  assert.equal(confirm.state.kind, "confirmingSubject")
  assert.equal(confirm.state.subjectName, "Circuitos Eléctricos")
  assert.equal(transitionConversation(idle, "/MATERIAS").intent.kind, "legacyCommand")
  assert.match(transitionConversation(idle, "algo incomprensible").message, /No entendí del todo/)
})

test("boundary full-screen impide renderizar AppShell durante activación", async () => {
  const page = await readFile("app/page.tsx", "utf8")
  const onboarding = await readFile("components/onboarding/onboarding-flow.tsx", "utf8")
  assert.match(page, /evaluateActivation/)
  assert.match(page, /activation\.kind !== "ready"/)
  assert.match(page, /<OnboardingFlow/)
  assert.match(onboarding, /min-h-\[100dvh\]/)
  assert.doesNotMatch(onboarding, /Saltar materias/)
  assert.match(onboarding, /horarily-master\.svg/)
})

test("asistente normal no exige slash y mantiene comandos avanzados", async () => {
  const assistant = await readFile("components/HorarilySpeakingCard.tsx", "utf8")
  assert.match(assistant, /Escribe qué necesitas/)
  assert.match(assistant, /Comandos avanzados/)
  assert.doesNotMatch(assistant, /EL COMANDO DEBE INICIAR CON \//)
  assert.match(assistant, /transitionConversation/)
})

test("activación legacy válida recibe marcador sin completar estados realmente incompletos", () => {
  const legacy = data({
    activeSemesterId: "sem",
    semesters: [semester],
    subjects: [subject],
    profile: { displayName: "Ana", onboardingCompletedAt: "2026-01-01" },
    settings: { ...EMPTY_APP_DATA.settings, onboarding: { currentStep: 4, completed: true } },
  })
  const marked = backfillLegacyActivationMarker(legacy, "fallback")
  assert.equal(marked.settings.onboarding.activationCompletedAt, "2026-01-01")

  const incomplete = { ...legacy, subjects: [] }
  assert.equal(backfillLegacyActivationMarker(incomplete, "fallback"), incomplete)
})
