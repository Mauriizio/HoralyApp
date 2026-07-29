export type ConversationState =
  | { kind: "idle" }
  | { kind: "choosingIntent" }
  | { kind: "awaitingSubjectName" }
  | { kind: "confirmingSubject"; subjectName: string }
  | { kind: "awaitingSubjectSelection" }
  | { kind: "awaitingGradeData" }
  | { kind: "awaitingConfirmation" }
  | { kind: "completed" }
  | { kind: "error"; message: string }

export type ConversationIntent =
  | { kind: "legacyCommand"; command: string }
  | { kind: "createSubject"; subjectName?: string }
  | { kind: "listSubjects" }
  | { kind: "nextClass" }
  | { kind: "showGrades"; subjectName?: string }
  | { kind: "showAverage"; subjectName?: string }
  | { kind: "openSchedule" }
  | { kind: "createReminder" }
  | { kind: "openTools" }
  | { kind: "openPreferences" }
  | { kind: "help" }
  | { kind: "confirmSubject"; subjectName: string }
  | { kind: "cancel" }
  | { kind: "correct" }
  | { kind: "unknown" }

export interface ConversationTransition {
  state: ConversationState
  intent: ConversationIntent
  message: string
}

export function createConversationState(): ConversationState {
  return { kind: "idle" }
}

function normalized(value: string): string {
  return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es")
}

function detectIntent(value: string): ConversationIntent {
  const clean = normalized(value)
  if (value.trim().startsWith("/")) return { kind: "legacyCommand", command: value.trim() }
  if (/^(ayuda|que puedes hacer)$/.test(clean)) return { kind: "help" }
  if (/^(mis materias|ver materias|muestrame mis materias)$/.test(clean)) return { kind: "listSubjects" }
  if (/(proxima clase|clase tengo ahora)/.test(clean)) return { kind: "nextClass" }
  if (/(mis notas|muestrame mis notas)/.test(clean)) return { kind: "showGrades" }
  const directSubject = clean.match(/^(?:crear|agregar)\s+(.+)$/)
  if (directSubject && !/^(una|una materia|materia)$/.test(directSubject[1])) {
    return { kind: "createSubject", subjectName: value.trim().replace(/^(crear|agregar)\s+/i, "") }
  }
  if (/(agregar|crear).*(materia)/.test(clean)) return { kind: "createSubject" }
  const capabilities: AssistantIntent[] = [
    "createSubject", "listSubjects", "nextClass", "todaySchedule", "openSchedule", "showGrades",
    "showAverage", "createReminder", "openTools", "openPreferences", "help", "unknown",
  ]
  const result = deterministicConversationAdapter.understand({
    message: value,
    state: { kind: "idle" },
    availableCapabilities: capabilities,
    visibleSubjects: [],
  })
  if (result.intent === "openSchedule" || result.intent === "todaySchedule") return { kind: "openSchedule" }
  if (result.intent === "showAverage") return { kind: "showAverage" }
  if (result.intent === "createReminder") return { kind: "createReminder" }
  if (result.intent === "openTools") return { kind: "openTools" }
  if (result.intent === "openPreferences") return { kind: "openPreferences" }
  return { kind: "unknown" }
}

export function transitionConversation(state: ConversationState, input: string): ConversationTransition {
  const value = input.trim()
  if (!value) return { state, intent: { kind: "unknown" }, message: "Escribe qué necesitas para continuar." }

  if (state.kind === "confirmingSubject") {
    const clean = normalized(value).replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ")
    const affirmative = new Set(["si", "claro", "dale", "ok", "okay", "correcto", "esta bien", "confirmar", "creala", "crear", "hazlo", "de acuerdo"])
    const negative = new Set(["no", "cancelar", "cancela", "mejor no", "dejalo", "salir"])
    const correction = new Set(["corregir", "cambiar nombre", "otro nombre", "me equivoque", "editar"])
    if (affirmative.has(clean)) {
      return { state: { kind: "completed" }, intent: { kind: "confirmSubject", subjectName: state.subjectName }, message: `Crearé ${state.subjectName}.` }
    }
    if (negative.has(clean)) {
      return { state: { kind: "idle" }, intent: { kind: "cancel" }, message: "Cancelado. ¿En qué más puedo ayudarte?" }
    }
    if (correction.has(clean)) {
      return { state: { kind: "awaitingSubjectName" }, intent: { kind: "correct" }, message: "Claro. Escribe el nombre correcto." }
    }
    return { state, intent: { kind: "unknown" }, message: "Responde sí para crearla, no para cancelar o corregir para cambiar el nombre." }
  }

  if (state.kind === "awaitingSubjectName") {
    return {
      state: { kind: "confirmingSubject", subjectName: value },
      intent: { kind: "confirmSubject", subjectName: value },
      message: `Voy a crear ${value}. ¿Está bien?`,
    }
  }

  const intent = detectIntent(value)
  if (intent.kind === "createSubject") {
    if (intent.subjectName) {
      return {
        state: { kind: "confirmingSubject", subjectName: intent.subjectName },
        intent: { kind: "confirmSubject", subjectName: intent.subjectName },
        message: `Voy a crear ${intent.subjectName}. ¿Está bien?`,
      }
    }
    return { state: { kind: "awaitingSubjectName" }, intent, message: "Claro. ¿Cómo se llama?" }
  }
  if (intent.kind === "unknown") {
    return {
      state: { kind: "choosingIntent" },
      intent,
      message: "No entendí del todo. Puedo ayudarte a agregar una materia, revisar tu horario o ver tus notas.",
    }
  }
  return { state, intent, message: "" }
}
import { deterministicConversationAdapter, type AssistantIntent } from "@/application/conversation-understanding"
