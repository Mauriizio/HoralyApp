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
  | { kind: "help" }
  | { kind: "confirmSubject"; subjectName: string }
  | { kind: "cancel" }
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
  if (directSubject && !/^(una|materia)$/.test(directSubject[1])) {
    return { kind: "createSubject", subjectName: value.trim().replace(/^(crear|agregar)\s+/i, "") }
  }
  if (/(agregar|crear).*(materia)/.test(clean)) return { kind: "createSubject" }
  return { kind: "unknown" }
}

export function transitionConversation(state: ConversationState, input: string): ConversationTransition {
  const value = input.trim()
  if (!value) return { state, intent: { kind: "unknown" }, message: "Escribe qué necesitas para continuar." }

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

