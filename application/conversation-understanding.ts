import type { ConversationState } from "@/application/horarily-conversation"

export type AssistantIntent =
  | "createSubject" | "listSubjects" | "editSubject"
  | "nextClass" | "todaySchedule" | "openSchedule"
  | "showGrades" | "showAverage" | "showSubjectAverage"
  | "createReminder" | "listReminders"
  | "openTools" | "openPreferences" | "help"
  | "confirm" | "reject" | "correct" | "cancel" | "unknown"

export interface UnderstandingRequest {
  message: string
  state: ConversationState
  availableCapabilities: readonly AssistantIntent[]
  visibleSubjects: readonly { id: string; name: string }[]
}

export interface UnderstandingResult {
  intent: AssistantIntent
  entities: { subjectName?: string; originalText?: string }
  confidence: number
  needsClarification: boolean
}

export interface ConversationUnderstandingAdapter {
  understand(request: UnderstandingRequest): UnderstandingResult
}

export const EXPERIMENTAL_AI_CONVERSATION_ENABLED = false

export class ExperimentalAiConversationAdapter implements ConversationUnderstandingAdapter {
  understand(): UnderstandingResult {
    return { intent: "unknown", entities: {}, confidence: 0, needsClarification: true }
  }
}

export function normalizeForUnderstanding(message: string): string {
  return message
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0]
    previous[0] = leftIndex
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const old = previous[rightIndex]
      previous[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      )
      diagonal = old
    }
  }
  return previous[right.length]
}

const INTENT_REGISTRY: ReadonlyArray<{ intent: AssistantIntent; phrases: readonly string[]; tokens?: readonly string[] }> = [
  { intent: "createSubject", phrases: ["agregar materia", "crear materia", "nueva materia"], tokens: ["materia"] },
  { intent: "listSubjects", phrases: ["ver materias", "mis materias", "listar materias"], tokens: ["materias"] },
  { intent: "editSubject", phrases: ["editar materia", "cambiar materia"] },
  { intent: "nextClass", phrases: ["proxima clase", "que clase sigue", "clase tengo ahora"] },
  { intent: "todaySchedule", phrases: ["horario de hoy", "clases de hoy", "que tengo hoy"] },
  { intent: "openSchedule", phrases: ["abrir horario", "ver horario", "configurar horario"], tokens: ["horario"] },
  { intent: "showGrades", phrases: ["ver mis notas", "mis notas", "que nota llevo"], tokens: ["notas"] },
  { intent: "showAverage", phrases: ["ver mi promedio", "cual es mi promedio", "promedio general"], tokens: ["promedio"] },
  { intent: "createReminder", phrases: ["crear recordatorio", "nuevo recordatorio", "agregar recordatorio"] },
  { intent: "listReminders", phrases: ["ver recordatorios", "mis recordatorios", "listar recordatorios"] },
  { intent: "openTools", phrases: ["abrir herramientas", "ver herramientas"] },
  { intent: "openPreferences", phrases: ["abrir preferencias", "ver preferencias", "configuracion"] },
  { intent: "help", phrases: ["ayuda", "que puedes hacer", "abrir ayuda"] },
]

function phraseScore(message: string, phrase: string): number {
  if (message === phrase) return 1
  if (message.includes(phrase)) return 0.94
  const words = message.split(" ")
  const phraseWords = phrase.split(" ")
  const matched = phraseWords.filter((phraseWord) => words.some((word) => {
    if (word === phraseWord) return true
    const distance = phraseWord.length >= 7 ? 2 : 1
    return phraseWord.length >= 5 && editDistance(word, phraseWord) <= distance
  })).length
  return matched / phraseWords.length * 0.82
}

function subjectFrom(message: string, subjects: UnderstandingRequest["visibleSubjects"]) {
  const normalized = normalizeForUnderstanding(message)
  return subjects.find((subject) => {
    const name = normalizeForUnderstanding(subject.name)
    return normalized.includes(name) || normalized.split(" ").some((word) => name.length >= 5 && editDistance(word, name) === 1)
  })
}

export class DeterministicConversationAdapter implements ConversationUnderstandingAdapter {
  understand(request: UnderstandingRequest): UnderstandingResult {
    const message = normalizeForUnderstanding(request.message)
    const originalText = request.message.trim()
    if (!message) return { intent: "unknown", entities: {}, confidence: 0, needsClarification: true }

    if (request.state.kind === "confirmingSubject") {
      if (["si", "claro", "dale", "ok", "okay", "correcto", "esta bien", "confirmar", "creala", "crear", "hazlo", "de acuerdo"].includes(message)) {
        return { intent: "confirm", entities: { subjectName: request.state.subjectName }, confidence: 1, needsClarification: false }
      }
      if (["no", "mejor no", "dejalo"].includes(message)) return { intent: "reject", entities: {}, confidence: 1, needsClarification: false }
      if (["cancelar", "cancela", "salir"].includes(message)) return { intent: "cancel", entities: {}, confidence: 1, needsClarification: false }
      if (["corregir", "cambiar nombre", "otro nombre", "me equivoque", "editar"].includes(message)) return { intent: "correct", entities: {}, confidence: 1, needsClarification: false }
    }

    const subject = subjectFrom(message, request.visibleSubjects)
    if (subject && (message.includes("promedio") || message.includes("como voy") || message.includes("que nota llevo") || message.startsWith("notas de"))) {
      return { intent: "showSubjectAverage", entities: { subjectName: subject.name, originalText }, confidence: 0.98, needsClarification: false }
    }

    let best: { intent: AssistantIntent; confidence: number } = { intent: "unknown", confidence: 0 }
    for (const definition of INTENT_REGISTRY) {
      const confidence = Math.max(...definition.phrases.map((phrase) => phraseScore(message, phrase)))
      if (confidence > best.confidence) best = { intent: definition.intent, confidence }
    }
    if (best.confidence < 0.58 || !request.availableCapabilities.includes(best.intent)) {
      return { intent: "unknown", entities: { originalText }, confidence: best.confidence, needsClarification: true }
    }
    return { intent: best.intent, entities: { originalText }, confidence: best.confidence, needsClarification: false }
  }
}

export const deterministicConversationAdapter = new DeterministicConversationAdapter()
